#!/usr/bin/env python3
"""
Condex upload processor — run this on your own computer.

What it does:
  1. Lists every blob in your Vercel Blob store (via BLOB_READ_WRITE_TOKEN).
  2. Downloads any uploads/*.zip it hasn't processed before (tracked in
     processed_state.json so re-running the script skips old work).
  3. Unzips each one and extracts text from every PDF inside using PyMuPDF.
  4. Writes one markdown file per PDF into processed/<zip name>/.

Usage:
    pip install -r requirements.txt
    set BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx   (Windows PowerShell: $env:BLOB_READ_WRITE_TOKEN="...")
    python process_uploads.py

Get the token from the Vercel dashboard: Project -> Storage -> your Blob
store -> .env.local tab (copy the BLOB_READ_WRITE_TOKEN value).
"""

import json
import os
import sys
import zipfile
from pathlib import Path

import requests

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Missing dependency: pymupdf. Install with: pip install -r requirements.txt")
    sys.exit(1)

BLOB_API_BASE = "https://blob.vercel-storage.com"
API_VERSION = "7"

SCRIPT_DIR = Path(__file__).resolve().parent
STATE_FILE = SCRIPT_DIR / "processed_state.json"
DOWNLOAD_DIR = SCRIPT_DIR / "downloads"
PROCESSED_DIR = SCRIPT_DIR / "processed"
UPLOAD_PREFIX = "uploads/"


def get_token() -> str:
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        print(
            "Set the BLOB_READ_WRITE_TOKEN environment variable "
            "(Vercel dashboard -> Project -> Storage -> your Blob store -> .env.local tab)."
        )
        sys.exit(1)
    return token


def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"processed_pathnames": []}


def save_state(state: dict) -> None:
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def list_blobs(token: str) -> list:
    headers = {
        "authorization": f"Bearer {token}",
        "x-api-version": API_VERSION,
    }
    blobs = []
    cursor = None
    while True:
        params = {"prefix": UPLOAD_PREFIX, "limit": "1000"}
        if cursor:
            params["cursor"] = cursor
        resp = requests.get(BLOB_API_BASE, headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        blobs.extend(data.get("blobs", []))
        if data.get("hasMore") and data.get("cursor"):
            cursor = data["cursor"]
        else:
            break
    return blobs


def sanitize_stem(name: str) -> str:
    stem = Path(name).stem
    safe = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in stem)
    return safe or "untitled"


def extract_pdf_to_markdown(pdf_path: Path, out_path: Path) -> None:
    doc = fitz.open(pdf_path)
    try:
        parts = [f"# {pdf_path.stem}", ""]
        for page_num, page in enumerate(doc, start=1):
            text = page.get_text().strip()
            parts.append(f"## Page {page_num}")
            parts.append("")
            parts.append(text if text else "*(no extractable text)*")
            parts.append("")
        out_path.write_text("\n".join(parts), encoding="utf-8")
    finally:
        doc.close()


def process_zip(zip_path: Path, source_pathname: str) -> None:
    zip_stem = sanitize_stem(zip_path.name)
    extract_dir = DOWNLOAD_DIR / f"_extracted_{zip_stem}"
    extract_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(extract_dir)

    pdf_paths = sorted(
        p for p in extract_dir.rglob("*") if p.suffix.lower() == ".pdf"
    )
    if not pdf_paths:
        print(f"  No PDFs found in {source_pathname}")
        return

    out_dir = PROCESSED_DIR / zip_stem
    out_dir.mkdir(parents=True, exist_ok=True)

    for pdf_path in pdf_paths:
        md_name = sanitize_stem(pdf_path.name) + ".md"
        out_path = out_dir / md_name
        try:
            extract_pdf_to_markdown(pdf_path, out_path)
            print(f"  Wrote {out_path.relative_to(SCRIPT_DIR)}")
        except Exception as exc:
            print(f"  Failed to process {pdf_path.name}: {exc}")


def download_blob(url: str, dest: Path) -> None:
    with requests.get(url, stream=True, timeout=120) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)


def main() -> None:
    token = get_token()
    DOWNLOAD_DIR.mkdir(exist_ok=True)
    PROCESSED_DIR.mkdir(exist_ok=True)

    state = load_state()
    processed = set(state.get("processed_pathnames", []))

    print("Listing blobs…")
    blobs = list_blobs(token)
    zip_blobs = [b for b in blobs if b.get("pathname", "").lower().endswith(".zip")]
    new_blobs = [b for b in zip_blobs if b["pathname"] not in processed]

    print(f"Found {len(zip_blobs)} zip upload(s), {len(new_blobs)} new.")

    for blob in new_blobs:
        pathname = blob["pathname"]
        url = blob["url"]
        local_name = Path(pathname).name
        local_path = DOWNLOAD_DIR / local_name

        print(f"Downloading {pathname}…")
        try:
            download_blob(url, local_path)
        except Exception as exc:
            print(f"  Failed to download {pathname}: {exc}")
            continue

        print(f"Processing {pathname}…")
        try:
            process_zip(local_path, pathname)
        except Exception as exc:
            print(f"  Failed to process {pathname}: {exc}")
            continue

        processed.add(pathname)
        state["processed_pathnames"] = sorted(processed)
        save_state(state)

    print("Done.")


if __name__ == "__main__":
    main()
