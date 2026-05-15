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

declare global {
  interface Window {
    google?: {
      accounts?: GoogleAccounts;
    };
  }
}

// Connects to Google Drive and uploads the local archive to hidden app data.
export async function uploadArchiveToGoogleDrive(clientId: string) {
  const accessToken = await requestDriveAccessToken(clientId);
  const snapshot = await exportTransactionArchiveSnapshot();
  const existingFile = await findDriveArchiveFile(accessToken);

  if (existingFile) {
    await updateDriveArchiveFile(accessToken, existingFile.id, snapshot);
  } else {
    await createDriveArchiveFile(accessToken, snapshot);
  }

  await markArchiveDriveSynced();
}

// Downloads the Drive archive and merges it into the local encrypted archive.
export async function restoreArchiveFromGoogleDrive(clientId: string) {
  const accessToken = await requestDriveAccessToken(clientId);
  const existingFile = await findDriveArchiveFile(accessToken);

  if (!existingFile) {
    throw new Error("No Netly transaction archive was found in Google Drive app data.");
  }

  const snapshot = await downloadDriveArchiveFile(accessToken, existingFile.id);
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

// Creates the appDataFolder archive file with metadata and archive content.
async function createDriveArchiveFile(accessToken: string, archive: TransactionArchiveSnapshot) {
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

// Replaces the content of the existing appDataFolder archive file.
async function updateDriveArchiveFile(accessToken: string, fileId: string, archive: TransactionArchiveSnapshot) {
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

// Downloads the archive snapshot from Drive.
async function downloadDriveArchiveFile(accessToken: string, fileId: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: getDriveHeaders(accessToken)
  });

  return readDriveJson<TransactionArchiveSnapshot>(response);
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
