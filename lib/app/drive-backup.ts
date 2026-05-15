"use client";

import {
  exportTransactionArchiveSnapshot,
  importTransactionArchiveSnapshot,
  markArchiveDriveSynced,
  type TransactionArchiveSnapshot
} from "@/lib/app/transaction-archive";

const googleIdentityScriptUrl = "https://accounts.google.com/gsi/client";
const googleDriveScope = "https://www.googleapis.com/auth/drive.appdata";
const driveArchiveFileName = "netly-transaction-archive-v1.json";
const driveArchiveMimeType = "application/json";
const driveArchiveVersion = 1;
const driveKeyIterations = 210000;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      callback: (response: GoogleTokenResponse) => void;
      client_id: string;
      scope: string;
    }) => GoogleTokenClient;
  };
};

type DriveFile = {
  id: string;
  modifiedTime?: string;
  name: string;
};

type DriveListResponse = {
  files?: DriveFile[];
};

type EncryptedDriveArchive = {
  ciphertext: string;
  iterations: number;
  iv: string;
  kdf: "PBKDF2-SHA-256";
  salt: string;
  version: number;
};

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

// Connects to Google Drive and uploads the encrypted local archive.
export async function uploadArchiveToGoogleDrive(clientId: string, passphrase: string) {
  const accessToken = await requestDriveAccessToken(clientId);
  const snapshot = await exportTransactionArchiveSnapshot();
  const encryptedArchive = await encryptDriveArchive(snapshot, passphrase);
  const existingFile = await findDriveArchiveFile(accessToken);

  if (existingFile) {
    await updateDriveArchiveFile(accessToken, existingFile.id, encryptedArchive);
  } else {
    await createDriveArchiveFile(accessToken, encryptedArchive);
  }

  await markArchiveDriveSynced();
}

// Downloads the Drive archive and merges it into the local encrypted archive.
export async function restoreArchiveFromGoogleDrive(clientId: string, passphrase: string) {
  const accessToken = await requestDriveAccessToken(clientId);
  const existingFile = await findDriveArchiveFile(accessToken);

  if (!existingFile) {
    throw new Error("No Netly transaction archive was found in Google Drive app data.");
  }

  const encryptedArchive = await downloadDriveArchiveFile(accessToken, existingFile.id);
  const snapshot = await decryptDriveArchive(encryptedArchive, passphrase);
  await importTransactionArchiveSnapshot(snapshot);
}

// Requests the narrow Drive appDataFolder scope through Google Identity Services.
async function requestDriveAccessToken(clientId: string) {
  if (!clientId.trim()) {
    throw new Error("Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add it before connecting Google Drive backup.");
  }

  await loadGoogleIdentityScript();

  return new Promise<string>((resolve, reject) => {
    const accounts = window.google?.accounts;

    if (!accounts) {
      reject(new Error("Google Identity Services did not load. Check network access and Google client configuration."));
      return;
    }

    const tokenClient = accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: googleDriveScope,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        if (!response.access_token) {
          reject(new Error("Google Drive did not return an access token."));
          return;
        }

        resolve(response.access_token);
      }
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
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

// Finds Netly's hidden appDataFolder archive file.
async function findDriveArchiveFile(accessToken: string) {
  const params = new URLSearchParams({
    fields: "files(id,name,modifiedTime)",
    pageSize: "1",
    q: `name='${driveArchiveFileName}'`,
    spaces: "appDataFolder"
  });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: getDriveHeaders(accessToken)
  });
  const payload = await readDriveJson<DriveListResponse>(response);

  return payload.files?.[0] || null;
}

// Creates the appDataFolder archive file with metadata and encrypted content.
async function createDriveArchiveFile(accessToken: string, archive: EncryptedDriveArchive) {
  const boundary = `netly-${crypto.randomUUID()}`;
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify({
      name: driveArchiveFileName,
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

// Replaces the encrypted content of the existing appDataFolder archive file.
async function updateDriveArchiveFile(accessToken: string, fileId: string, archive: EncryptedDriveArchive) {
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`, {
    method: "PATCH",
    headers: {
      ...getDriveHeaders(accessToken),
      "content-type": driveArchiveMimeType
    },
    body: JSON.stringify(archive)
  });

  await readDriveJson(response);
}

// Downloads and validates the encrypted archive envelope from Drive.
async function downloadDriveArchiveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: getDriveHeaders(accessToken)
  });

  return readDriveJson<EncryptedDriveArchive>(response);
}

// Encrypts the portable archive with a user passphrase before upload.
async function encryptDriveArchive(snapshot: TransactionArchiveSnapshot, passphrase: string): Promise<EncryptedDriveArchive> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveDriveArchiveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(JSON.stringify(snapshot))
  );

  return {
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
    iterations: driveKeyIterations,
    iv: toBase64Url(iv),
    kdf: "PBKDF2-SHA-256",
    salt: toBase64Url(salt),
    version: driveArchiveVersion
  };
}

// Decrypts the Drive archive and fails loudly on wrong passphrases or corruption.
async function decryptDriveArchive(archive: EncryptedDriveArchive, passphrase: string): Promise<TransactionArchiveSnapshot> {
  assertEncryptedDriveArchive(archive);

  try {
    const key = await deriveDriveArchiveKey(passphrase, fromBase64Url(archive.salt), archive.iterations);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(archive.iv) },
      key,
      fromBase64Url(archive.ciphertext)
    );

    return JSON.parse(textDecoder.decode(plaintext)) as TransactionArchiveSnapshot;
  } catch (error) {
    throw new Error("Could not decrypt Google Drive transaction archive. Check the sync passphrase.");
  }
}

// Derives the portable Drive encryption key from the user sync passphrase.
async function deriveDriveArchiveKey(passphrase: string, salt: Uint8Array, iterations = driveKeyIterations) {
  if (passphrase.trim().length < 12) {
    throw new Error("Enter a Google Drive sync passphrase with at least 12 characters.");
  }

  const baseKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function getDriveHeaders(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`
  };
}

async function readDriveJson<T = unknown>(response: Response) {
  const text = await response.text();
  const payload = text ? JSON.parse(text) as unknown : {};

  if (!response.ok) {
    throw new Error(`Google Drive request failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload as T;
}

function assertEncryptedDriveArchive(archive: EncryptedDriveArchive) {
  if (archive.version !== driveArchiveVersion || archive.kdf !== "PBKDF2-SHA-256" || archive.iterations < driveKeyIterations) {
    throw new Error("Unsupported Google Drive transaction archive format.");
  }

  if (!archive.ciphertext || !archive.iv || !archive.salt) {
    throw new Error("Malformed Google Drive transaction archive.");
  }
}

function toBase64Url(value: Uint8Array) {
  return btoa(String.fromCharCode(...value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function toArrayBuffer(value: Uint8Array) {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}
