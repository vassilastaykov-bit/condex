"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_SIZE_BYTES, UPLOAD_PATH_PREFIX } from "@/lib/constants";

type Status = "idle" | "uploading" | "success" | "error";
type SubscribeStatus = "idle" | "submitting" | "success" | "error";

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="32"
      height="32"
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brandGradient" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0" stopColor="#7c8aff" />
          <stop offset="1" stopColor="#5a67e8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#brandGradient)" />
      <rect x="16" y="20" width="32" height="6" rx="3" fill="#0a0b10" opacity="0.92" />
      <rect x="16" y="30" width="24" height="6" rx="3" fill="#0a0b10" opacity="0.92" />
      <rect x="16" y="40" width="14" height="6" rx="3" fill="#ff8a5c" />
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

  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<SubscribeStatus>("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  async function handleSubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubscribeStatus("submitting");
    setSubscribeMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
      }

      setSubscribeStatus("success");
      setSubscribeMessage("You're on the list. We'll be in touch.");
      setEmail("");
    } catch (error) {
      setSubscribeStatus("error");
      setSubscribeMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    }
  }

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

      <section className="hero">
        <p className="eyebrow">For realtors</p>
        <h1 className="hero-title">De-risk every condo deal.</h1>
        <p className="hero-subtitle">
          Upload a status certificate and get back an instant, peer-ranked
          condo risk report — built from the same underwriting data insurers
          and lenders rely on. Walk in looking like the expert who did the
          homework.
        </p>
      </section>

      <form className="subscribe" onSubmit={handleSubscribe}>
        <label className="field-label" htmlFor="subscribe-email">
          Get launch updates
        </label>
        <div className="subscribe-row">
          <input
            id="subscribe-email"
            type="email"
            placeholder="you@brokerage.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <button type="submit" disabled={subscribeStatus === "submitting"}>
            {subscribeStatus === "submitting" ? "Sending…" : "Notify me"}
          </button>
        </div>
        {subscribeMessage && (
          <p
            className={`message ${
              subscribeStatus === "error"
                ? "error"
                : subscribeStatus === "success"
                ? "success"
                : ""
            }`}
          >
            {subscribeMessage}
          </p>
        )}
      </form>

      <div className="card">
        <h2>Upload your documents</h2>
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
