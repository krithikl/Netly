"use client";

import { useCallback, useMemo, useState } from "react";
import { restoreArchiveFromGoogleDrive, uploadArchiveToGoogleDrive } from "@/lib/app/drive-backup";
import { readArchiveMetadata } from "@/lib/app/transaction-archive";

export type DriveBackupStatus = "disconnected" | "ready" | "syncing" | "synced" | "failed";

export type DriveBackupState = {
  clientConfigured: boolean;
  lastSyncedAt: string;
  message: string;
  status: DriveBackupStatus;
};

// Owns the opt-in Google Drive backup controls and status messages.
export function useDriveBackup(onArchiveRestored: () => Promise<void>) {
  const [status, setStatus] = useState<DriveBackupStatus>("disconnected");
  const [message, setMessage] = useState("Google Drive backup is not connected.");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientConfigured = clientId.trim().length > 0;
  const state = useMemo<DriveBackupState>(() => ({
    clientConfigured,
    lastSyncedAt,
    message,
    status
  }), [clientConfigured, lastSyncedAt, message, status]);

  const restoreMetadata = useCallback(async () => {
    const metadata = await readArchiveMetadata();
    setLastSyncedAt(metadata.lastDriveSyncAt);
  }, []);

  const connectAndBackUp = useCallback(async () => {
    setStatus("syncing");
    setMessage("Connecting to Google Drive and backing up the transaction archive...");

    try {
      await uploadArchiveToGoogleDrive(clientId);
      await restoreMetadata();
      setStatus("synced");
      setMessage("Google Drive backup is connected. Your transaction archive is up to date.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive backup failed.");
    }
  }, [clientId, restoreMetadata]);

  const restoreFromDrive = useCallback(async () => {
    setStatus("syncing");
    setMessage("Restoring the transaction archive from Google Drive...");

    try {
      await restoreArchiveFromGoogleDrive(clientId);
      await onArchiveRestored();
      await restoreMetadata();
      setStatus("synced");
      setMessage("Google Drive archive restored and merged into local transactions.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive restore failed.");
    }
  }, [clientId, onArchiveRestored, restoreMetadata]);

  const disconnectDriveBackup = useCallback(() => {
    setStatus("disconnected");
    setMessage("Google Drive backup is disconnected. Local encrypted archive remains on this device.");
    setLastSyncedAt("");
  }, []);

  const syncAfterArchiveChange = useCallback(async () => {
    if (status !== "synced") {
      return;
    }

    setStatus("syncing");

    try {
      await uploadArchiveToGoogleDrive(clientId);
      await restoreMetadata();
      setStatus("synced");
      setMessage("Google Drive backup updated.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive backup failed.");
    }
  }, [clientId, restoreMetadata, status]);

  return {
    connectAndBackUp,
    disconnectDriveBackup,
    driveBackup: state,
    restoreFromDrive,
    syncAfterArchiveChange
  };
}
