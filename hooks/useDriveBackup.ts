"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  beginGoogleDriveAuthorization,
  deleteGoogleDriveBackup,
  getGoogleDriveConnectionStatus,
  isDriveReauthRequiredError,
  listGoogleDriveBackups,
  restoreArchiveFromGoogleDrive,
  uploadArchiveToGoogleDrive,
  writePendingDriveIntent,
  type DriveBackupPendingIntent,
  type DriveBackupEntry
} from "@/lib/app/drive-backup";
import { driveBackupConnectionStorageKey } from "@/lib/app/constants";
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

type StoredDriveConnection = {
  connected: boolean;
  lastSyncedAt: string;
};

type RefreshBackupListOptions = {
  intent?: Extract<DriveBackupPendingIntent, "backups" | "restore">;
  silent?: boolean;
};

// Owns the opt-in Google Drive backup controls and status messages.
export function useDriveBackup(onArchiveRestored: () => Promise<void>) {
  const [status, setStatus] = useState<DriveBackupStatus>("disconnected");
  const [message, setMessage] = useState("Google Drive backup is not connected.");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [backups, setBackups] = useState<DriveBackupEntry[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const clientConfigured = true;
  const state = useMemo<DriveBackupState>(() => ({
    backups,
    clientConfigured,
    isLoadingBackups,
    lastSyncedAt,
    message,
    status
  }), [backups, clientConfigured, isLoadingBackups, lastSyncedAt, message, status]);

  useEffect(() => {
    let isMounted = true;
    const storedConnection = readStoredDriveConnection();

    getGoogleDriveConnectionStatus()
      .then((connected) => {
        if (!isMounted) {
          return;
        }

        if (connected) {
          setStatus("ready");
          setLastSyncedAt(storedConnection?.lastSyncedAt || "");
          setMessage("Google Drive backup is connected.");
          return;
        }

        if (storedConnection?.connected) {
          setStatus("disconnected");
          setLastSyncedAt(storedConnection.lastSyncedAt);
          setMessage("Google Drive backup was used before. Sign in to back up, restore, or list backups.");
        }
      })
      .catch((error: unknown) => {
        if (isMounted && storedConnection?.connected) {
          setStatus("disconnected");
          setLastSyncedAt(storedConnection.lastSyncedAt);
          setMessage(error instanceof Error ? error.message : "Google Drive backup was used before. Sign in to reconnect.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const restoreMetadata = useCallback(async () => {
    const metadata = await readArchiveMetadata();
    setLastSyncedAt(metadata.lastDriveSyncAt);
  }, []);
  const beginDriveAuthorization = useCallback((intent: DriveBackupPendingIntent, actionLabel: string, expiredConnection = false) => {
    clearStoredDriveConnection();
    writePendingDriveIntent(intent);
    setStatus("disconnected");
    setLastSyncedAt("");
    setBackups([]);
    setMessage(expiredConnection
      ? `Google Drive connection expired. Opening Google Drive authorization to ${actionLabel}...`
      : `Opening Google Drive authorization to ${actionLabel}...`);
    beginGoogleDriveAuthorization();
  }, []);
  const ensureDriveAuthorized = useCallback(async (actionLabel: string, intent: DriveBackupPendingIntent) => {
    if (await getGoogleDriveConnectionStatus()) {
      return true;
    }

    beginDriveAuthorization(intent, actionLabel);
    return false;
  }, [beginDriveAuthorization]);

  const refreshBackupList = useCallback(async (options: RefreshBackupListOptions = {}) => {
    setStatus("syncing");
    setIsLoadingBackups(true);
    setMessage(options.silent ? "Checking Google Drive backup..." : "Connecting to Google Drive and checking backups...");

    try {
      if (!await ensureDriveAuthorized("view backups", options.intent || "backups")) {
        return await new Promise<never>(() => undefined);
      }

      const nextBackups = await listGoogleDriveBackups();
      setBackups(nextBackups);
      setStatus("ready");
      writeStoredDriveConnection(lastSyncedAt);
      setMessage(nextBackups.length > 0 ? "Google Drive backups are available." : "No Google Drive backups were found for this Google account.");
      return nextBackups;
    } catch (error) {
      if (isDriveReauthRequiredError(error)) {
        beginDriveAuthorization(options.intent || "backups", "view backups", true);
        return await new Promise<never>(() => undefined);
      }

      setStatus("failed");
      setMessage(options.silent ? "Reconnect Google Drive backup." : getErrorMessage(error, "Could not load Google Drive backups."));
      return [];
    } finally {
      setIsLoadingBackups(false);
    }
  }, [beginDriveAuthorization, ensureDriveAuthorized, lastSyncedAt]);

  const connectAndBackUp = useCallback(async () => {
    setStatus("syncing");
    setMessage("Connecting to Google Drive and creating a backup...");

    try {
      if (!await ensureDriveAuthorized("create a backup", "backup")) {
        return await new Promise<never>(() => undefined);
      }

      const nextBackups = await uploadArchiveToGoogleDrive();
      setBackups(nextBackups);
      await restoreMetadata();
      writeStoredDriveConnection(new Date().toISOString());
      setStatus("synced");
      setMessage("");
    } catch (error) {
      if (isDriveReauthRequiredError(error)) {
        beginDriveAuthorization("backup", "create a backup", true);
        return await new Promise<never>(() => undefined);
      }

      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive backup failed.");
      throw error;
    }
  }, [beginDriveAuthorization, ensureDriveAuthorized, restoreMetadata]);

  const restoreFromDrive = useCallback(async (fileId: string) => {
    setStatus("syncing");
    setMessage("Restoring the selected Google Drive backup...");

    try {
      if (!await ensureDriveAuthorized("restore backups", "restore")) {
        return await new Promise<never>(() => undefined);
      }

      await restoreArchiveFromGoogleDrive("", fileId);
      await onArchiveRestored();
      await restoreMetadata();
      writeStoredDriveConnection(new Date().toISOString());
      setStatus("synced");
      setMessage("Google Drive backup restored. Transactions were merged and settings were updated.");
    } catch (error) {
      if (isDriveReauthRequiredError(error)) {
        beginDriveAuthorization("restore", "restore backups", true);
        return await new Promise<never>(() => undefined);
      }

      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive restore failed.");
      throw error;
    }
  }, [beginDriveAuthorization, ensureDriveAuthorized, onArchiveRestored, restoreMetadata]);

  const deleteBackup = useCallback(async (fileId: string) => {
    setStatus("syncing");
    setMessage("Deleting the selected Google Drive backup...");

    try {
      if (!await ensureDriveAuthorized("manage backups", "backups")) {
        return await new Promise<never>(() => undefined);
      }

      const nextBackups = await deleteGoogleDriveBackup("", fileId);
      setBackups(nextBackups);
      setStatus("ready");
      setMessage(nextBackups.length > 0 ? "Google Drive backup deleted." : "Google Drive backup deleted. No backups remain.");
      return nextBackups;
    } catch (error) {
      if (isDriveReauthRequiredError(error)) {
        beginDriveAuthorization("backups", "manage backups", true);
        return await new Promise<never>(() => undefined);
      }

      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Google Drive backup delete failed.");
      throw error;
    }
  }, [beginDriveAuthorization, ensureDriveAuthorized]);

  const disconnectDriveBackup = useCallback(() => {
    setStatus("disconnected");
    setMessage("Google Drive backup is disconnected. Local encrypted archive remains on this device.");
    setLastSyncedAt("");
    setBackups([]);
    window.localStorage.removeItem(driveBackupConnectionStorageKey);
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

function readStoredDriveConnection() {
  const storedValue = window.localStorage.getItem(driveBackupConnectionStorageKey);

  if (!storedValue) {
    return null;
  }

  const parsedValue = JSON.parse(storedValue) as unknown;

  if (!parsedValue || typeof parsedValue !== "object") {
    throw new Error(`Invalid localStorage key "${driveBackupConnectionStorageKey}": expected an object.`);
  }

  const connection = parsedValue as Partial<StoredDriveConnection>;

  if (typeof connection.connected !== "boolean" || typeof connection.lastSyncedAt !== "string") {
    throw new Error(`Invalid localStorage key "${driveBackupConnectionStorageKey}": expected connected and lastSyncedAt.`);
  }

  return {
    connected: connection.connected,
    lastSyncedAt: connection.lastSyncedAt
  };
}

function writeStoredDriveConnection(lastSyncedAt: string) {
  window.localStorage.setItem(driveBackupConnectionStorageKey, JSON.stringify({
    connected: true,
    lastSyncedAt
  }));
}

function clearStoredDriveConnection() {
  window.localStorage.removeItem(driveBackupConnectionStorageKey);
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}
