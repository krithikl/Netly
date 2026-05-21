"use client";

import {
  exportTransactionArchiveSnapshot,
  importTransactionArchiveSnapshot,
  markArchiveDriveSynced,
  type TransactionArchiveSnapshot
} from "@/lib/app/transaction-archive";

const googleIdentityScriptUrl = "https://accounts.google.com/gsi/client";
const googleDriveScope = "https://www.googleapis.com/auth/drive.appdata";
const driveBackupFilePrefix = "netly-backup-v2-";
const driveBackupFileExtension = ".json";
const driveArchiveMimeType = "application/json";
const maxDriveBackups = 20;
const accessTokenExpirySkewMs = 60 * 1000;

let cachedDriveAccessToken = "";
let cachedDriveAccessTokenExpiresAt = 0;

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: "" | "consent" | "none" | "select_account" }) => void;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
};

type GoogleTokenError = {
  message?: string;
  type?: "popup_closed" | "popup_failed_to_open" | "unknown";
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      callback: (response: GoogleTokenResponse) => void;
      client_id: string;
      error_callback?: (error: GoogleTokenError) => void;
      scope: string;
    }) => GoogleTokenClient;
  };
};

type DriveFile = {
  createdTime?: string;
  id: string;
  modifiedTime?: string;
  name: string;
};

type DriveListResponse = {
  files?: DriveFile[];
};

type DriveAuthOptions = {
  silent?: boolean;
};

export type DriveBackupEntry = {
  createdTime: string;
  id: string;
  metadataAvailable: boolean;
  modifiedTime: string;
  name: string;
  timestamp: string;
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

// Connects to Google Drive and uploads a timestamped backup to hidden app data.
export async function uploadArchiveToGoogleDrive(clientId: string) {
  const accessToken = await requestDriveAccessToken(clientId);
  const snapshot = await exportTransactionArchiveSnapshot();
  const backupCreatedAt = new Date().toISOString();
  const backupSnapshot: TransactionArchiveSnapshot = {
    ...snapshot,
    metadata: {
      ...snapshot.metadata,
      backupCreatedAt,
      backupTransactionCount: snapshot.transactions.length
    }
  };

  await createDriveArchiveFile(accessToken, backupSnapshot, getDriveBackupFileName(backupCreatedAt));
  await pruneOldDriveBackups(accessToken);
  await markArchiveDriveSynced();
  return listDriveBackupsWithAccessToken(accessToken);
}

// Lists timestamped Netly backups stored in Google Drive app data.
export async function listGoogleDriveBackups(clientId: string, options: DriveAuthOptions = {}) {
  const accessToken = await requestDriveAccessToken(clientId, options);
  return listDriveBackupsWithAccessToken(accessToken);
}

// Downloads one Drive backup and merges it into the local encrypted archive.
export async function restoreArchiveFromGoogleDrive(clientId: string, fileId: string) {
  if (!fileId.trim()) {
    throw new Error("Choose a Google Drive backup before restoring.");
  }

  const accessToken = await requestDriveAccessToken(clientId);
  const snapshot = await downloadDriveArchiveFile(accessToken, fileId);
  await importTransactionArchiveSnapshot(snapshot);
}

// Deletes one timestamped Netly backup from Google Drive app data.
export async function deleteGoogleDriveBackup(clientId: string, fileId: string) {
  if (!fileId.trim()) {
    throw new Error("Choose a Google Drive backup before deleting.");
  }

  const accessToken = await requestDriveAccessToken(clientId);
  await deleteDriveBackupFile(accessToken, fileId);
  return listDriveBackupsWithAccessToken(accessToken);
}

// Requests the narrow Drive appDataFolder scope through Google Identity Services.
async function requestDriveAccessToken(clientId: string, options: DriveAuthOptions = {}) {
  if (!clientId.trim()) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add it before connecting Google Drive backup.");
  }

  if (cachedDriveAccessToken && Date.now() < cachedDriveAccessTokenExpiresAt - accessTokenExpirySkewMs) {
    return cachedDriveAccessToken;
  }

  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    let isSettled = false;
    const accounts = window.google?.accounts;

    if (!accounts) {
      reject(new Error("Google Identity Services did not load. Check network access and Google client configuration."));
      return;
    }

    const tokenClient = accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: googleDriveScope,
      callback: (response) => {
        if (isSettled) {
          return;
        }

        if (response.error) {
          isSettled = true;
          reject(new Error(response.error_description || response.error));
          return;
        }

        if (!response.access_token) {
          isSettled = true;
          reject(new Error("Google Drive did not return an access token."));
          return;
        }

        cachedDriveAccessToken = response.access_token;
        cachedDriveAccessTokenExpiresAt = Date.now() + getAccessTokenLifetimeMs(response.expires_in);
        isSettled = true;
        resolve(response.access_token);
      },
      error_callback: (error) => {
        if (isSettled) {
          return;
        }

        isSettled = true;
        reject(new Error(getDriveTokenPopupErrorMessage(error)));
      }
    });

    tokenClient.requestAccessToken({ prompt: options.silent ? "none" : "" });
  });
}

// Converts Google's token lifetime into a conservative cache expiry duration.
function getAccessTokenLifetimeMs(expiresInSeconds: number | undefined) {
  return Math.max(1, expiresInSeconds || 3600) * 1000;
}

// Converts GIS popup failures into user-facing backup errors.
function getDriveTokenPopupErrorMessage(error: GoogleTokenError) {
  if (error.type === "popup_failed_to_open") {
    return "Google Drive authorization could not open. Allow popups for Netly and try again.";
  }

  if (error.type === "popup_closed") {
    return "Google Drive authorization closed before Netly received access. Try again from the backup button.";
  }

  return error.message || "Google Drive authorization failed.";
}

// Loads the Google Identity client only when the user opts into Drive backup.
function loadGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${googleIdentityScriptUrl}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Could not load Google Identity Services.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = googleIdentityScriptUrl;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Identity Services."));
    document.head.append(script);
  });
}

// Lists Netly's hidden appDataFolder backups, newest first.
async function listDriveBackupsWithAccessToken(accessToken: string) {
  const params = new URLSearchParams({
    fields: "files(id,name,createdTime,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "100",
    q: `name contains '${driveBackupFilePrefix}' and trashed = false`,
    spaces: "appDataFolder"
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: getDriveHeaders(accessToken)
  });
  const payload = await readDriveJson<DriveListResponse>(response);

  return (payload.files || [])
    .filter((file) => file.name.startsWith(driveBackupFilePrefix) && file.name.endsWith(driveBackupFileExtension))
    .map(toDriveBackupEntry)
    .sort((first, second) => second.timestamp.localeCompare(first.timestamp));
}

// Creates the appDataFolder archive file with metadata and archive content.
async function createDriveArchiveFile(accessToken: string, archive: TransactionArchiveSnapshot, fileName: string) {
  const boundary = `netly-${crypto.randomUUID()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({
      name: fileName,
      parents: ["appDataFolder"],
      mimeType: driveArchiveMimeType
    }),
    `--${boundary}`,
    `Content-Type: ${driveArchiveMimeType}`,
    "",
    JSON.stringify(archive),
    `--${boundary}--`
  ].join("\r\n");
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      ...getDriveHeaders(accessToken),
      "content-type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  await readDriveJson(response);
}

// Downloads the archive snapshot from Drive.
async function downloadDriveArchiveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: getDriveHeaders(accessToken)
  });

  return readDriveJson<TransactionArchiveSnapshot>(response);
}

// Deletes backups beyond the configured retention count.
async function pruneOldDriveBackups(accessToken: string) {
  const backups = await listDriveBackupsWithAccessToken(accessToken);
  const staleBackups = backups.slice(maxDriveBackups);

  await Promise.all(staleBackups.map((backup) => deleteDriveBackupFile(accessToken, backup.id)));
}

// Removes one appDataFolder backup file by Google Drive file id.
async function deleteDriveBackupFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: getDriveHeaders(accessToken)
  });

  await readDriveJson(response);
}

// Converts Drive file metadata into the backup row model shown in Settings.
function toDriveBackupEntry(file: DriveFile): DriveBackupEntry {
  const timestamp = parseBackupTimestamp(file.name) || file.modifiedTime || file.createdTime || "";

  return {
    createdTime: file.createdTime || "",
    id: file.id,
    metadataAvailable: Boolean(timestamp && (file.modifiedTime || file.createdTime)),
    modifiedTime: file.modifiedTime || "",
    name: file.name,
    timestamp
  };
}

// Builds the backup file name with a stable UTC timestamp sortable by name.
function getDriveBackupFileName(createdAt: string) {
  const createdDate = new Date(createdAt);

  if (!Number.isFinite(createdDate.getTime())) {
    throw new Error(`Invalid backup timestamp "${createdAt}".`);
  }

  return `${driveBackupFilePrefix}${formatBackupDate(createdDate)}${driveBackupFileExtension}`;
}

// Parses Netly backup names in the fixed YYYYMMDDTHHMMSSZ format.
function parseBackupTimestamp(fileName: string) {
  if (!fileName.startsWith(driveBackupFilePrefix) || !fileName.endsWith(driveBackupFileExtension)) {
    return "";
  }

  const rawTimestamp = fileName.slice(driveBackupFilePrefix.length, fileName.length - driveBackupFileExtension.length);
  const expectedLength = "YYYYMMDDTHHMMSSZ".length;

  if (rawTimestamp.length !== expectedLength || rawTimestamp[8] !== "T" || rawTimestamp[15] !== "Z") {
    return "";
  }

  const year = rawTimestamp.slice(0, 4);
  const month = rawTimestamp.slice(4, 6);
  const day = rawTimestamp.slice(6, 8);
  const hour = rawTimestamp.slice(9, 11);
  const minute = rawTimestamp.slice(11, 13);
  const second = rawTimestamp.slice(13, 15);

  if (![year, month, day, hour, minute, second].every(isDigits)) {
    return "";
  }

  if (!isBackupTimestampPartsValid({ day, hour, minute, month, second })) {
    return "";
  }

  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

// Formats a UTC date as YYYYMMDDTHHMMSSZ for Drive backup filenames.
function formatBackupDate(date: Date) {
  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    getPaddedDatePart(date.getUTCMonth() + 1),
    getPaddedDatePart(date.getUTCDate()),
    "T",
    getPaddedDatePart(date.getUTCHours()),
    getPaddedDatePart(date.getUTCMinutes()),
    getPaddedDatePart(date.getUTCSeconds()),
    "Z"
  ].join("");
}

function getPaddedDatePart(value: number) {
  return value.toString().padStart(2, "0");
}

function isDigits(value: string) {
  return [...value].every((character) => character >= "0" && character <= "9");
}

// Checks component ranges without hiding malformed backup names behind Date coercion.
function isBackupTimestampPartsValid(parts: { day: string; hour: string; minute: string; month: string; second: string }) {
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);

  return month >= 1
    && month <= 12
    && day >= 1
    && day <= 31
    && hour <= 23
    && minute <= 59
    && second <= 59;
}

// Creates the authorization header required by Google Drive REST calls.
function getDriveHeaders(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`
  };
}

// Parses Drive JSON responses and preserves Google error payloads in thrown errors.
async function readDriveJson<T = unknown>(response: Response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as unknown : {};

  if (!response.ok) {
    throw new Error(`Google Drive request failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload as T;
}
