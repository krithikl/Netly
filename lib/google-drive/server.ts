import { createHash, randomUUID } from "node:crypto";
import { compactDecrypt, CompactEncrypt } from "jose";
import type { NextRequest, NextResponse } from "next/server";

const googleAuthorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenUrl = "https://oauth2.googleapis.com/token";
const googleDriveScope = "https://www.googleapis.com/auth/drive.appdata";
const googleRefreshTokenCookieName = "netly_google_drive_refresh_token";
export const googleDriveStateCookieName = "netly_google_drive_state";
const encryptedCookieVersion = "v1";
const requiredSecretLength = 32;
const thirtyDayCookieMaxAgeSeconds = 60 * 60 * 24 * 30;
const stateCookieMaxAgeSeconds = 10 * 60;
const accessTokenExpirySkewMs = 60 * 1000;
const driveBackupFilePrefix = "netly-backup-v2-";
const driveBackupFileExtension = ".json";
const driveArchiveMimeType = "application/json";
const maxDriveBackups = 20;
const joseHeader = {
  alg: "dir",
  enc: "A256GCM"
} as const;

let cachedAccessToken = "";
let cachedAccessTokenExpiresAt = 0;

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  refresh_token?: string;
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

export type DriveBackupEntry = {
  createdTime: string;
  id: string;
  metadataAvailable: boolean;
  modifiedTime: string;
  name: string;
  timestamp: string;
};

// Builds the Google OAuth URL for the server-side offline-access flow.
export function getGoogleDriveAuthorizationUrl(state: string) {
  const config = getGoogleDriveOAuthConfig();
  const url = new URL(googleAuthorizationUrl);

  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleDriveScope);
  url.searchParams.set("state", state);

  return url.toString();
}

// Short-lived OAuth state cookie options.
export function getGoogleDriveStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: stateCookieMaxAgeSeconds
  };
}

// Exchanges the callback code and stores the Google refresh token in an encrypted cookie.
export async function saveGoogleDriveRefreshToken(response: NextResponse, code: string) {
  const tokenResponse = await exchangeAuthorizationCode(code);

  if (!tokenResponse.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke Netly's Google access, then connect again so Google shows the consent screen.");
  }

  response.cookies.set(googleRefreshTokenCookieName, await encryptGoogleCookieValue(tokenResponse.refresh_token), getGoogleDriveRefreshTokenCookieOptions());
  response.cookies.delete(googleDriveStateCookieName);
}

// Checks whether this browser has a usable Google Drive refresh token cookie.
export async function hasGoogleDriveRefreshToken(request: NextRequest) {
  const cookieValue = request.cookies.get(googleRefreshTokenCookieName)?.value;

  if (!cookieValue) {
    return false;
  }

  await decryptGoogleCookieValue(cookieValue);
  return true;
}

// Lists Netly's hidden appDataFolder backups, newest first.
export async function listGoogleDriveBackupsForRequest(request: NextRequest) {
  const accessToken = await getGoogleDriveAccessToken(request);
  return listDriveBackupsWithAccessToken(accessToken);
}

// Creates a Drive appDataFolder backup file from the client-side archive snapshot.
export async function uploadGoogleDriveBackupForRequest(request: NextRequest, archive: unknown) {
  const accessToken = await getGoogleDriveAccessToken(request);
  const backupCreatedAt = new Date().toISOString();
  const backupArchive = addBackupMetadata(archive, backupCreatedAt);

  await createDriveArchiveFile(accessToken, backupArchive, getDriveBackupFileName(backupCreatedAt));
  await pruneOldDriveBackups(accessToken);

  return listDriveBackupsWithAccessToken(accessToken);
}

// Downloads one backup snapshot from Drive for the client to import locally.
export async function downloadGoogleDriveBackupForRequest(request: NextRequest, fileId: string) {
  const accessToken = await getGoogleDriveAccessToken(request);
  return downloadDriveArchiveFile(accessToken, fileId);
}

// Deletes one Drive appDataFolder backup file.
export async function deleteGoogleDriveBackupForRequest(request: NextRequest, fileId: string) {
  const accessToken = await getGoogleDriveAccessToken(request);

  await deleteDriveBackupFile(accessToken, fileId);
  return listDriveBackupsWithAccessToken(accessToken);
}

// Returns the public app URL used after OAuth callback.
export function getGoogleDrivePostAuthRedirect(request: NextRequest, query: string) {
  const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
  return `${baseUrl}/settings?${query}`;
}

export function createGoogleDriveState() {
  return randomUUID();
}

// Exchanges a refresh token for a short-lived access token.
async function getGoogleDriveAccessToken(request: NextRequest) {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - accessTokenExpirySkewMs) {
    return cachedAccessToken;
  }

  const refreshToken = await getGoogleDriveRefreshToken(request);
  const config = getGoogleDriveOAuthConfig();
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    })
  });
  const payload = await readGoogleJson<GoogleTokenResponse>(response);

  if (!payload.access_token) {
    throw new Error("Google did not return an access token from the stored refresh token.");
  }

  cachedAccessToken = payload.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Math.max(1, payload.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

async function getGoogleDriveRefreshToken(request: NextRequest) {
  const cookieValue = request.cookies.get(googleRefreshTokenCookieName)?.value;

  if (!cookieValue) {
    throw new Error("Connect Google Drive backup before using Drive backup controls.");
  }

  return decryptGoogleCookieValue(cookieValue);
}

async function exchangeAuthorizationCode(code: string) {
  const config = getGoogleDriveOAuthConfig();
  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri
    })
  });

  return readGoogleJson<GoogleTokenResponse>(response);
}

function getGoogleDriveOAuthConfig() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientId.trim()) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID.");
  }

  if (!clientSecret.trim()) {
    throw new Error("Missing GOOGLE_CLIENT_SECRET.");
  }

  if (!redirectUri.trim()) {
    throw new Error("Missing GOOGLE_REDIRECT_URI.");
  }

  return {
    clientId,
    clientSecret,
    redirectUri
  };
}

function getGoogleDriveRefreshTokenCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: thirtyDayCookieMaxAgeSeconds
  };
}

async function encryptGoogleCookieValue(value: string) {
  return [
    encryptedCookieVersion,
    await new CompactEncrypt(new TextEncoder().encode(value))
      .setProtectedHeader(joseHeader)
      .encrypt(getGoogleCookieEncryptionKey())
  ].join(":");
}

async function decryptGoogleCookieValue(value: string) {
  const [version, encryptedValue, ...extraParts] = value.split(":");

  if (version !== encryptedCookieVersion || !encryptedValue || extraParts.length > 0) {
    throw new Error("Invalid encrypted Google Drive token cookie format. Reconnect Google Drive backup from Settings.");
  }

  try {
    const result = await compactDecrypt(encryptedValue, getGoogleCookieEncryptionKey());
    return new TextDecoder().decode(result.plaintext);
  } catch (error) {
    throw new Error("Could not decrypt Google Drive token cookie. Reconnect Google Drive backup from Settings.");
  }
}

function getGoogleCookieEncryptionKey() {
  const secret = process.env.GOOGLE_COOKIE_SECRET;

  if (!secret) {
    throw new Error("Missing GOOGLE_COOKIE_SECRET. It encrypts Google Drive refresh-token cookies.");
  }

  if (secret.length < requiredSecretLength) {
    throw new Error(`GOOGLE_COOKIE_SECRET must be at least ${requiredSecretLength} characters.`);
  }

  return createHash("sha256").update(secret, "utf8").digest();
}

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
  const payload = await readGoogleJson<DriveListResponse>(response);

  return (payload.files || [])
    .filter((file) => file.name.startsWith(driveBackupFilePrefix) && file.name.endsWith(driveBackupFileExtension))
    .map(toDriveBackupEntry)
    .sort((first, second) => second.timestamp.localeCompare(first.timestamp));
}

async function createDriveArchiveFile(accessToken: string, archive: unknown, fileName: string) {
  const boundary = `netly-${randomUUID()}`;
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

  await readGoogleJson(response);
}

async function downloadDriveArchiveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: getDriveHeaders(accessToken)
  });

  return readGoogleJson<unknown>(response);
}

async function pruneOldDriveBackups(accessToken: string) {
  const backups = await listDriveBackupsWithAccessToken(accessToken);
  const staleBackups = backups.slice(maxDriveBackups);

  await Promise.all(staleBackups.map((backup) => deleteDriveBackupFile(accessToken, backup.id)));
}

async function deleteDriveBackupFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "DELETE",
    headers: getDriveHeaders(accessToken)
  });

  await readGoogleJson(response);
}

function addBackupMetadata(archive: unknown, backupCreatedAt: string) {
  if (!isRecord(archive) || !isRecord(archive.metadata) || !Array.isArray(archive.transactions)) {
    throw new Error("Invalid backup snapshot. Expected metadata and transactions.");
  }

  return {
    ...archive,
    metadata: {
      ...archive.metadata,
      backupCreatedAt,
      backupTransactionCount: archive.transactions.length
    }
  };
}

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

function getDriveBackupFileName(createdAt: string) {
  const createdDate = new Date(createdAt);

  if (!Number.isFinite(createdDate.getTime())) {
    throw new Error(`Invalid backup timestamp "${createdAt}".`);
  }

  return `${driveBackupFilePrefix}${formatBackupDate(createdDate)}${driveBackupFileExtension}`;
}

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

function getDriveHeaders(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`
  };
}

async function readGoogleJson<T = unknown>(response: Response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as unknown : {};

  if (!response.ok) {
    throw new Error(`Google request failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
