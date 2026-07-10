"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_SIZE_BYTES, UPLOAD_PATH_PREFIX } from "@/lib/constants";

type Status = "idle" | "uploading" | "success" | "error";

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="28"
      height="28"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect
        x="16"
        y="14"
        width="26"
        height="26"
        rx="6"
        transform="rotate(-8 16 14)"
        fill="none"
        stroke="#3d4354"
        strokeWidth="2.5"
      />
      <rect
        x="22"
        y="24"
        width="26"
        height="26"
        rx="6"
        transform="rotate(6 22 24)"
        fill="#7c8aff"
      />
    </svg>
  );
}

export default function Page() {
  const passcodeRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  function pickFile(candidate: File | undefined | null) {
    if (!candidate) return;
    setStatus("idle");
    setMessage("");
    setFile(candidate);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    pickFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passcode = passcodeRef.current?.value ?? "";

    if (!passcode) {
      setStatus("error");
      setMessage("Please enter the passcode.");
      return;
    }

    if (!file) {
      setStatus("error");
      setMessage("Please choose a .zip file to upload.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".zip")) {
      setStatus("error");
      setMessage("Only .zip files are accepted.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setStatus("error");
      setMessage("File is too large. Maximum size is 500MB.");
      return;
    }

    setStatus("uploading");
    setMessage("");
    setProgress(0);

    try {
      await upload(`${UPLOAD_PATH_PREFIX}${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: JSON.stringify({ passcode }),
        onUploadProgress: ({ percentage }) => {
          setProgress(percentage);
        },
      });

      setStatus("success");
      setMessage("Upload complete. Thank you.");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong during upload."
      );
    }
  }

  return (
    <main>
      <div className="brand">
        <BrandMark />
        <span className="brand-name">condex</span>
      </div>

      <div className="card">
        <h1>Upload your documents</h1>
        <p className="subtitle">
          Zip a folder of PDFs and drop it below. You&apos;ll need the
          passcode to upload.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field-label" htmlFor="passcode">
              Passcode
            </label>
            <input
              id="passcode"
              name="passcode"
              type="password"
              ref={passcodeRef}
              autoComplete="off"
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="file">
              Zip file
            </label>
            <label
              htmlFor="file"
              className={`dropzone${dragging ? " dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <input
                id="file"
                name="file"
                type="file"
                accept=".zip"
                ref={fileInputRef}
                onChange={(event) => pickFile(event.target.files?.[0])}
              />
              <svg
                className="dropzone-icon"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                aria-hidden="true"
              >
                <path
                  d="M12 16V4M12 4L7.5 8.5M12 4l4.5 4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {file ? (
                <p className="dropzone-filename">{file.name}</p>
              ) : (
                <p className="dropzone-text">
                  <strong>Choose a file</strong> or drag it here
                </p>
              )}
            </label>
            <p className="hint">.zip only, up to 500MB.</p>
          </div>

          <button type="submit" disabled={status === "uploading"}>
            {status === "uploading" && (
              <span
                className="progress-track"
                style={{ transform: `scaleX(${progress / 100})` }}
              />
            )}
            <span style={{ position: "relative" }}>
              {status === "uploading"
                ? `Uploading… ${Math.round(progress)}%`
                : "Upload"}
            </span>
          </button>
        </form>

        {message && (
          <p
            className={`message ${
              status === "error"
                ? "error"
                : status === "success"
                ? "success"
                : ""
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
