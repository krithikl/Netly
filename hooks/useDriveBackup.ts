"use client";

import { useCallback, useMemo, useState } from "react";
import {
  deleteGoogleDriveBackup,
  listGoogleDriveBackups,
  restoreArchiveFromGoogleDrive,
  uploadArchiveToGoogleDrive,
  type DriveBackupEntry
} from "@/lib/app/drive-backup";
import { readArchiveMetadata } from "@/lib/app/transaction-archive";

export type DriveBackupStatus = "disconnected" | "ready" | "syncing" | "synced" | "failed";

export type DriveBackupState = {
  backups: DriveBackupEntry[];
  clientConfigured: boolean;
  isLoadingBackups: boolean;
  lastSyncedAt: string;
  message: string;
  status: DriveBackupStatus;
};

// Owns the opt-in Google Drive backup controls and status messages.
export function useDriveBackup(onArchiveRestored: () => Promise<void>) {
  const [status, setStatus] = useState<DriveBackupStatus>("disconnected");
  const [message, setMessage] = useState("Google Drive backup is not connected.");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [backups, setBackups] = useState<DriveBackupEntry[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientConfigured = clientId.trim().length > 0;
  const state = useMemo<DriveBackupState>(() => ({
    backups,
    clientConfigured,
    isLoadingBackups,
    lastSyncedAt,
    message,
    status
  }), [backups, clientConfigured, isLoadingBackups, lastSyncedAt, message, status]);

  const restoreMetadata = useCallback(async () => {
    const metadata = await readArchiveMetadata();
    setLastSyncedAt(metadata.lastDriveSyncAt);
  }, []);

  const refreshBackupList = useCallback(async () => {
    setStatus("syncing");
    setIsLoadingBackups(true);
    setMessage("Connecting to Google Drive and checking backups...");

    try {
      const nextBackups = await listGoogleDriveBackups(clientId);
      setBackups(nextBackups);
      setStatus("ready");
      setMessage(nextBackups.length > 0 ? "Google Drive backups are available." : "No Google Drive backups were found for this Google account.");
      return nextBackups;
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Could not load Google Drive backups.");
      return [];
    } finally {
      setIsLoadingBackups(false);
    }
  }, [clientId]);

  const connectAndBackUp = useCallback(async () => {
    setStatus("syncing");
    setMessage("Connecting to Google Drive and creating a backup...");

    try {
      const nextBackups = await uploadArchiveToGoogleDrive(clientId);
      setBackups(nextBackups);
      await restoreMetadata();
      setStatus("synced");
      setMessage("");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive backup failed.");
      throw error;
    }
  }, [clientId, restoreMetadata]);

  const restoreFromDrive = useCallback(async (fileId: string) => {
    setStatus("syncing");
    setMessage("Restoring the selected Google Drive backup...");

    try {
      await restoreArchiveFromGoogleDrive(clientId, fileId);
      await onArchiveRestored();
      await restoreMetadata();
      setStatus("synced");
      setMessage("Google Drive backup restored. Transactions were merged and settings were updated.");
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive restore failed.");
      throw error;
    }
  }, [clientId, onArchiveRestored, restoreMetadata]);

  const deleteBackup = useCallback(async (fileId: string) => {
    setStatus("syncing");
    setMessage("Deleting the selected Google Drive backup...");

    try {
      const nextBackups = await deleteGoogleDriveBackup(clientId, fileId);
      setBackups(nextBackups);
      setStatus("ready");
      setMessage(nextBackups.length > 0 ? "Google Drive backup deleted." : "Google Drive backup deleted. No backups remain.");
      return nextBackups;
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive backup delete failed.");
      throw error;
    }
  }, [clientId]);

  const disconnectDriveBackup = useCallback(() => {
    setStatus("disconnected");
    setMessage("Google Drive backup is disconnected. Local encrypted archive remains on this device.");
    setLastSyncedAt("");
    setBackups([]);
  }, []);

  const syncAfterArchiveChange = useCallback(() => Promise.resolve(), []);

  return {
    connectAndBackUp,
    deleteBackup,
    disconnectDriveBackup,
    driveBackup: state,
    refreshBackupList,
    restoreFromDrive,
    syncAfterArchiveChange
  };
}
