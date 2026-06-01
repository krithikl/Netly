import { NextRequest, NextResponse } from "next/server";
import { googleRefreshTokenCookieName, isGoogleDriveReauthRequiredError, listGoogleDriveBackupsForRequest } from "@/lib/google-drive/server";

// Lists Google Drive appDataFolder backups through the stored refresh token.
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      backups: await listGoogleDriveBackupsForRequest(request)
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
      error: error instanceof Error ? error.message : "Could not list Google Drive backups."
    }, { status: 401 });
  }
}
