"use client";

import {
  exportTransactionArchiveSnapshot,
  importTransactionArchiveSnapshot,
  markArchiveDriveSynced,
  type TransactionArchiveSnapshot
} from "@/lib/app/transaction-archive";

export type DriveBackupEntry = {
  createdTime: string;
  id: string;
  metadataAvailable: boolean;
  modifiedTime: string;
  name: string;
  timestamp: string;
};

type DriveBackupListPayload = {
  backups?: DriveBackupEntry[];
  error?: string;
};

type DriveBackupRestorePayload = {
  error?: string;
  snapshot?: TransactionArchiveSnapshot;
};

type DriveConnectionStatusPayload = {
  connected?: boolean;
  error?: string;
};

// Redirects the user to the server-side Google OAuth flow.
export function beginGoogleDriveAuthorization() {
  window.location.assign("/api/google-drive/start");
}

// Checks the local server cookie state without contacting Google Drive.
export async function getGoogleDriveConnectionStatus() {
  const response = await fetch("/api/google-drive/status");
  const payload = await readJsonResponse<DriveConnectionStatusPayload>(response, "Google Drive status");

  return Boolean(payload.connected);
}

// Exports the local archive and asks the server to upload it using the refresh token.
export async function uploadArchiveToGoogleDrive() {
  const snapshot = await exportTransactionArchiveSnapshot();
  const response = await fetch("/api/google-drive/upload", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(snapshot)
  });
  const payload = await readJsonResponse<DriveBackupListPayload>(response, "Google Drive backup upload");

  await markArchiveDriveSynced();
  return payload.backups || [];
}

// Lists timestamped Netly backups stored in Google Drive app data.
export async function listGoogleDriveBackups() {
  const response = await fetch("/api/google-drive/backups");
  const payload = await readJsonResponse<DriveBackupListPayload>(response, "Google Drive backups");

  return payload.backups || [];
}

// Downloads one Drive backup from the server and merges it into the local encrypted archive.
export async function restoreArchiveFromGoogleDrive(_clientId: string, fileId: string) {
  if (!fileId.trim()) {
    throw new Error("Choose a Google Drive backup before restoring.");
  }

  const response = await fetch("/api/google-drive/restore", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ fileId })
  });
  const payload = await readJsonResponse<DriveBackupRestorePayload>(response, "Google Drive backup restore");

  if (!payload.snapshot) {
    throw new Error("Google Drive restore did not return an archive snapshot.");
  }

  await importTransactionArchiveSnapshot(payload.snapshot);
}

// Deletes one timestamped Netly backup from Google Drive app data.
export async function deleteGoogleDriveBackup(_clientId: string, fileId: string) {
  if (!fileId.trim()) {
    throw new Error("Choose a Google Drive backup before deleting.");
  }

  const response = await fetch("/api/google-drive/delete", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ fileId })
  });
  const payload = await readJsonResponse<DriveBackupListPayload>(response, "Google Drive backup delete");

  return payload.backups || [];
}

// Reads a JSON API response and preserves server-side Drive errors.
async function readJsonResponse<T extends { error?: string }>(response: Response, label: string) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as T : {} as T;

  if (!response.ok) {
    throw new Error(payload.error || `Could not load ${label}.`);
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}
