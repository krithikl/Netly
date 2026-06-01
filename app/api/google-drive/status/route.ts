import { NextRequest, NextResponse } from "next/server";
import { hasGoogleDriveRefreshToken } from "@/lib/google-drive/server";

// Reports whether this browser has a usable server-side Google Drive token.
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      connected: await hasGoogleDriveRefreshToken(request)
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : "Could not read Google Drive connection state."
    }, { status: 401 });
  }
}
