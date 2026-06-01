import { NextRequest, NextResponse } from "next/server";
import { getGoogleDrivePostAuthRedirect, googleDriveStateCookieName, saveGoogleDriveRefreshToken } from "@/lib/google-drive/server";

// Handles Google OAuth callback, validates state, and stores the refresh token cookie.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get(googleDriveStateCookieName)?.value;

  if (error) {
    return NextResponse.redirect(getGoogleDrivePostAuthRedirect(request, `drive_error=${encodeURIComponent(error)}`));
  }

  if (!code) {
    return NextResponse.redirect(getGoogleDrivePostAuthRedirect(request, "drive_error=missing_code"));
  }

  if (!expectedState || state !== expectedState) {
    return NextResponse.redirect(getGoogleDrivePostAuthRedirect(request, "drive_error=state_mismatch"));
  }

  try {
    const response = NextResponse.redirect(getGoogleDrivePostAuthRedirect(request, "drive_connected=1"));
    await saveGoogleDriveRefreshToken(response, code);

    return response;
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "Google Drive token exchange failed.";
    return NextResponse.redirect(getGoogleDrivePostAuthRedirect(request, `drive_error=${encodeURIComponent(message)}`));
  }
}
