import { NextRequest, NextResponse } from "next/server";
import { downloadGoogleDriveBackupForRequest, googleRefreshTokenCookieName, isGoogleDriveReauthRequiredError } from "@/lib/google-drive/server";

// Downloads a Google Drive backup snapshot so the client can import it locally.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!isRecord(body) || typeof body.fileId !== "string" || !body.fileId.trim()) {
      return NextResponse.json({ error: "Choose a Google Drive backup before restoring." }, { status: 400 });
    }

    return NextResponse.json({
      snapshot: await downloadGoogleDriveBackupForRequest(request, body.fileId)
    });
  } catch (error) {
    if (isGoogleDriveReauthRequiredError(error)) {
      const response = NextResponse.json({
        error: error.message,
        requiresReauth: true
      }, { status: 401 });

      response.cookies.delete(googleRefreshTokenCookieName);
      return response;
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not restore Google Drive backup."
    }, { status: 401 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
