import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { SUBSCRIBERS_PATH_PREFIX } from "@/lib/constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const normalized = email.toLowerCase();
  const safeName = normalized.replace(/[^a-z0-9@._-]/g, "_");

  await put(
    `${SUBSCRIBERS_PATH_PREFIX}${safeName}.json`,
    JSON.stringify({ email: normalized, subscribedAt: new Date().toISOString() }),
    {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    }
  );

  return NextResponse.json({ ok: true });
}
