import { NextResponse } from "next/server";
import { createGoogleDriveState, getGoogleDriveAuthorizationUrl, getGoogleDriveStateCookieOptions, googleDriveStateCookieName } from "@/lib/google-drive/server";

// Starts Google Drive OAuth with offline access so Netly can store a refresh token.
export async function GET() {
  try {
    const state = createGoogleDriveState();
    const response = NextResponse.redirect(getGoogleDriveAuthorizationUrl(state));

    response.cookies.set(googleDriveStateCookieName, state, getGoogleDriveStateCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not start Google Drive authorization."
    }, { status: 500 });
  }
}
