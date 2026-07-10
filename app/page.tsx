"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_SIZE_BYTES, UPLOAD_PATH_PREFIX } from "@/lib/constants";

type Status = "idle" | "uploading" | "success" | "error";

export default function Page() {
  const passcodeRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passcode = passcodeRef.current?.value ?? "";
    const file = fileRef.current?.files?.[0];

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
    setMessage("Uploading…");
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
      setMessage("Upload complete. Thank you!");
      if (fileRef.current) fileRef.current.value = "";
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
      <div className="card">
        <h1>Condex Upload</h1>
        <p className="subtitle">
          Upload a zipped folder of PDFs. You&apos;ll need the passcode.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="passcode">Passcode</label>
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
            <label htmlFor="file">Zip file</label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".zip"
              ref={fileRef}
              required
            />
            <p className="hint">.zip only, up to 500MB.</p>
          </div>

          <button type="submit" disabled={status === "uploading"}>
            {status === "uploading"
              ? `Uploading… ${Math.round(progress)}%`
              : "Upload"}
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
