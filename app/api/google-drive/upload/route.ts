import { NextRequest, NextResponse } from "next/server";
import { uploadGoogleDriveBackupForRequest } from "@/lib/google-drive/server";

// Uploads a client-exported encrypted archive snapshot to Google Drive appDataFolder.
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      backups: await uploadGoogleDriveBackupForRequest(request, await request.json())
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Could not upload Google Drive backup."
    }, { status: 401 });
  }
}
