import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/constants";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const expectedPasscode = process.env.UPLOAD_PASSCODE;
        if (!expectedPasscode) {
          throw new Error("Server is not configured with an upload passcode.");
        }

        let submittedPasscode = "";
        try {
          const parsed = clientPayload ? JSON.parse(clientPayload) : {};
          submittedPasscode = parsed.passcode ?? "";
        } catch {
          throw new Error("Invalid request.");
        }

        if (submittedPasscode !== expectedPasscode) {
          throw new Error("Incorrect passcode.");
        }

        if (!pathname.toLowerCase().endsWith(".zip")) {
          throw new Error("Only .zip files are accepted.");
        }

        return {
          allowedContentTypes: [
            "application/zip",
            "application/x-zip-compressed",
            "application/octet-stream",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_UPLOAD_SIZE_BYTES,
          tokenPayload: JSON.stringify({ pathname }),
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("Upload completed:", blob.pathname, blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 }
    );
  }
}
