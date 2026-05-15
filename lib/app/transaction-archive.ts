"use client";

import {
  categoryColorsStorageKey,
  categoryOverridesStorageKey,
  categoryRulesStorageKey,
  customCategoriesStorageKey,
  deletedCategoriesStorageKey
} from "@/lib/app/constants";
import { getTransactionDate, getTransactionId } from "@/lib/transaction-display";
import type { Transaction, TransactionDateRange } from "@/lib/types";

const archiveDatabaseName = "netly-transaction-archive";
const archiveDatabaseVersion = 1;
const archiveRecordsStore = "transaction-records";
const archiveMetadataStore = "archive-metadata";
const archiveKeyStorageKey = "netly_transaction_archive_key_v1";
const archiveDeviceIdStorageKey = "netly_transaction_archive_device_id";
const archiveSchemaVersion = 1;
const metadataKey = "metadata";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type TransactionArchiveMetadata = {
  deviceId: string;
  lastDriveSyncAt: string;
  lastLocalUpdateAt: string;
  schemaVersion: number;
};

export type TransactionArchiveSnapshot = {
  metadata: TransactionArchiveMetadata;
  settings: Record<string, string | null>;
  transactions: TransactionArchiveSnapshotRecord[];
};

export type TransactionArchiveSnapshotRecord = {
  archivedAt: string;
  id: string;
  sourceUpdatedAt: string;
  transaction: Transaction;
};

type EncryptedTransactionRecord = {
  archivedAt: string;
  ciphertext: string;
  id: string;
  iv: string;
  sourceUpdatedAt: string;
};

type StoredArchiveMetadata = Partial<TransactionArchiveMetadata>;

// Archives fresh transactions and returns the archive merged with those fresh records.
export async function archiveAndMergeTransactions(freshTransactions: Transaction[], dateRange?: TransactionDateRange) {
  if (freshTransactions.length > 0) {
    await upsertArchivedTransactions(freshTransactions);
  }

  const archivedTransactions = await readArchivedTransactions(dateRange);
  return mergeTransactions(archivedTransactions, freshTransactions);
}

// Stores normalized transactions as encrypted IndexedDB records.
export async function upsertArchivedTransactions(transactions: Transaction[]) {
  const realTransactions = transactions.filter((transaction) => !isDemoTransaction(transaction));

  if (realTransactions.length !== transactions.length) {
    throw new Error("Demo transactions must not be written to the Akahu transaction archive.");
  }

  const key = await getLocalArchiveCryptoKey();
  const now = new Date().toISOString();
  const encryptedRecords: EncryptedTransactionRecord[] = [];

  for (const item of realTransactions) {
    encryptedRecords.push(await encryptTransactionRecord(key, {
      archivedAt: now,
      id: getArchiveTransactionId(item),
      sourceUpdatedAt: getTransactionSourceUpdatedAt(item),
      transaction: item
    }));
  }

  const database = await openArchiveDatabase();
  const transaction = database.transaction([archiveRecordsStore, archiveMetadataStore], "readwrite");
  const transactionDone = waitForTransaction(transaction);
  const recordsStore = transaction.objectStore(archiveRecordsStore);
  const metadataStore = transaction.objectStore(archiveMetadataStore);

  encryptedRecords.forEach((encryptedRecord) => {
    recordsStore.put(encryptedRecord);
  });

  metadataStore.put({
    ...await readMetadataFromStore(metadataStore),
    deviceId: getArchiveDeviceId(),
    lastLocalUpdateAt: now,
    schemaVersion: archiveSchemaVersion
  }, metadataKey);

  await transactionDone;
  database.close();
}

// Reads archived transactions, optionally narrowed to the active Transactions date range.
export async function readArchivedTransactions(dateRange?: TransactionDateRange) {
  const snapshot = await exportTransactionArchiveSnapshot();
  return snapshot.transactions
    .map((record) => record.transaction)
    .filter((transaction) => !isDemoTransaction(transaction))
    .filter((transaction) => isTransactionInOptionalRange(transaction, dateRange));
}

// Exports decrypted archive data for encrypted Drive backup.
export async function exportTransactionArchiveSnapshot(): Promise<TransactionArchiveSnapshot> {
  const database = await openArchiveDatabase();
  const key = await getLocalArchiveCryptoKey();
  const transaction = database.transaction([archiveRecordsStore, archiveMetadataStore], "readonly");
  const transactionDone = waitForTransaction(transaction);
  const recordsStore = transaction.objectStore(archiveRecordsStore);
  const metadataStore = transaction.objectStore(archiveMetadataStore);
  const encryptedRecords = await requestToPromise<EncryptedTransactionRecord[]>(recordsStore.getAll());
  const metadata = normalizeArchiveMetadata(await readMetadataFromStore(metadataStore));
  const transactions: TransactionArchiveSnapshotRecord[] = [];

  for (const encryptedRecord of encryptedRecords) {
    transactions.push(await decryptTransactionRecord(key, encryptedRecord));
  }

  await transactionDone;
  database.close();

  const realTransactionRecords = transactions.filter((record) => !isDemoTransaction(record.transaction));

  return {
    metadata,
    settings: readPortableSettings(),
    transactions: realTransactionRecords.sort((first, second) => getTransactionDate(second.transaction).localeCompare(getTransactionDate(first.transaction)))
  };
}

// Imports a decrypted Drive snapshot into the encrypted local archive.
export async function importTransactionArchiveSnapshot(snapshot: TransactionArchiveSnapshot) {
  assertArchiveSnapshot(snapshot);
  await upsertArchivedTransactions(snapshot.transactions.map((record) => record.transaction));
  writePortableSettings(snapshot.settings);
  await updateArchiveMetadata({
    lastDriveSyncAt: new Date().toISOString(),
    lastLocalUpdateAt: snapshot.metadata.lastLocalUpdateAt
  });
}

// Records a successful Drive sync timestamp in archive metadata.
export async function markArchiveDriveSynced() {
  await updateArchiveMetadata({
    lastDriveSyncAt: new Date().toISOString()
  });
}

// Returns metadata without requiring each encrypted transaction to be decrypted.
export async function readArchiveMetadata(database?: IDBDatabase): Promise<TransactionArchiveMetadata> {
  const shouldClose = !database;
  const archiveDatabase = database || await openArchiveDatabase();
  const transaction = archiveDatabase.transaction(archiveMetadataStore, "readonly");
  const transactionDone = waitForTransaction(transaction);
  const metadata = await readMetadataFromStore(transaction.objectStore(archiveMetadataStore));

  await transactionDone;

  if (shouldClose) {
    archiveDatabase.close();
  }

  return normalizeArchiveMetadata(metadata);
}

// Updates metadata fields while preserving the current device and schema values.
async function updateArchiveMetadata(metadata: Partial<TransactionArchiveMetadata>) {
  const database = await openArchiveDatabase();
  const transaction = database.transaction(archiveMetadataStore, "readwrite");
  const transactionDone = waitForTransaction(transaction);
  const store = transaction.objectStore(archiveMetadataStore);
  const currentMetadata = await readMetadataFromStore(store);

  store.put({
    ...normalizeArchiveMetadata(currentMetadata),
    ...metadata,
    deviceId: getArchiveDeviceId(),
    schemaVersion: archiveSchemaVersion
  }, metadataKey);

  await transactionDone;
  database.close();
}

// Opens the archive database and creates the encrypted record stores.
function openArchiveDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(archiveDatabaseName, archiveDatabaseVersion);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(archiveRecordsStore)) {
        database.createObjectStore(archiveRecordsStore, { keyPath: "id" });
      }

      if (!database.objectStoreNames.contains(archiveMetadataStore)) {
        database.createObjectStore(archiveMetadataStore);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Could not open transaction archive: ${getRequestErrorMessage(request)}.`));
  });
}

// Creates or reads the browser-local archive encryption key.
async function getLocalArchiveCryptoKey() {
  const keyBytes = getOrCreateLocalArchiveKeyBytes();

  return window.crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

// Keeps the local IndexedDB archive encrypted even before Drive is connected.
function getOrCreateLocalArchiveKeyBytes() {
  const storedKey = window.localStorage.getItem(archiveKeyStorageKey);

  if (storedKey) {
    const key = fromBase64Url(storedKey);

    if (key.byteLength !== 32) {
      throw new Error("Invalid local transaction archive encryption key. Clear the archive or restore from Drive.");
    }

    return key;
  }

  const key = window.crypto.getRandomValues(new Uint8Array(32));
  window.localStorage.setItem(archiveKeyStorageKey, toBase64Url(key));
  return key;
}

// Encrypts one transaction record for IndexedDB storage.
async function encryptTransactionRecord(key: CryptoKey, record: TransactionArchiveSnapshotRecord): Promise<EncryptedTransactionRecord> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(JSON.stringify(record.transaction))
  );

  return {
    archivedAt: record.archivedAt,
    ciphertext: toBase64Url(new Uint8Array(ciphertext)),
    id: record.id,
    iv: toBase64Url(iv),
    sourceUpdatedAt: record.sourceUpdatedAt
  };
}

// Decrypts and validates one local transaction archive record.
async function decryptTransactionRecord(key: CryptoKey, record: EncryptedTransactionRecord): Promise<TransactionArchiveSnapshotRecord> {
  try {
    const plaintext = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64Url(record.iv) },
      key,
      fromBase64Url(record.ciphertext)
    );
    const transaction = JSON.parse(textDecoder.decode(plaintext)) as unknown;

    assertTransaction(transaction);

    return {
      archivedAt: record.archivedAt,
      id: record.id,
      sourceUpdatedAt: record.sourceUpdatedAt,
      transaction
    };
  } catch (error) {
    throw new Error(`Could not decrypt transaction archive record "${record.id}".`);
  }
}

// Merges archived and fresh records, preferring freshly fetched Akahu fields.
function mergeTransactions(archivedTransactions: Transaction[], freshTransactions: Transaction[]) {
  const byId = new Map<string, Transaction>();

  archivedTransactions.forEach((transaction) => {
    byId.set(getArchiveTransactionId(transaction), transaction);
  });
  freshTransactions.forEach((transaction) => {
    byId.set(getArchiveTransactionId(transaction), transaction);
  });

  return [...byId.values()].sort((first, second) => getTransactionDate(second).localeCompare(getTransactionDate(first)));
}

// Requires every archived transaction to have a stable, non-empty identity.
function getArchiveTransactionId(transaction: Transaction) {
  const id = getTransactionId(transaction);

  if (!id.trim()) {
    throw new Error("Transaction archive invariant failed: transaction has no stable ID.");
  }

  return id;
}

function getTransactionSourceUpdatedAt(transaction: Transaction) {
  return transaction.updated_at || transaction.created_at || new Date().toISOString();
}

function isTransactionInOptionalRange(transaction: Transaction, dateRange?: TransactionDateRange) {
  const transactionDate = getTransactionDate(transaction);

  if (dateRange?.from && transactionDate < dateRange.from) {
    return false;
  }

  if (dateRange?.to && transactionDate > dateRange.to) {
    return false;
  }

  return true;
}

// Prevents demo fixture records from ever appearing in the persistent user archive.
function isDemoTransaction(transaction: Transaction) {
  return transaction._connection === "conn_fixture_akahu"
    || transaction._account?.startsWith("acc_fixture_")
    || transaction._account?.startsWith("acc_demo_")
    || transaction._id?.startsWith("txn_fixture_")
    || transaction._id?.startsWith("txn_demo_");
}

// Normalizes missing metadata while rejecting unsupported archive schemas.
function normalizeArchiveMetadata(metadata: StoredArchiveMetadata | undefined): TransactionArchiveMetadata {
  const schemaVersion = metadata?.schemaVersion ?? archiveSchemaVersion;

  if (schemaVersion !== archiveSchemaVersion) {
    throw new Error(`Unsupported transaction archive schema version ${schemaVersion}.`);
  }

  return {
    deviceId: metadata?.deviceId || getArchiveDeviceId(),
    lastDriveSyncAt: metadata?.lastDriveSyncAt || "",
    lastLocalUpdateAt: metadata?.lastLocalUpdateAt || "",
    schemaVersion
  };
}

function getArchiveDeviceId() {
  const existing = window.localStorage.getItem(archiveDeviceIdStorageKey);

  if (existing) {
    return existing;
  }

  const next = window.crypto.randomUUID();
  window.localStorage.setItem(archiveDeviceIdStorageKey, next);
  return next;
}

function readPortableSettings() {
  const settingKeys = [
    categoryColorsStorageKey,
    categoryOverridesStorageKey,
    categoryRulesStorageKey,
    customCategoriesStorageKey,
    deletedCategoriesStorageKey
  ];

  return Object.fromEntries(settingKeys.map((key) => [key, window.localStorage.getItem(key)]));
}

// Restores only known local settings keys from a validated archive snapshot.
function writePortableSettings(settings: Record<string, string | null>) {
  Object.entries(settings).forEach(([key, value]) => {
    if (!isPortableSettingsKey(key)) {
      throw new Error(`Unexpected settings key in Drive archive: ${key}.`);
    }

    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  });
}

function isPortableSettingsKey(key: string) {
  return [
    categoryColorsStorageKey,
    categoryOverridesStorageKey,
    categoryRulesStorageKey,
    customCategoriesStorageKey,
    deletedCategoriesStorageKey
  ].includes(key);
}

function assertArchiveSnapshot(snapshot: TransactionArchiveSnapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Invalid Drive archive: expected an object.");
  }

  if (!snapshot.metadata || snapshot.metadata.schemaVersion !== archiveSchemaVersion) {
    throw new Error("Invalid Drive archive: unsupported or missing schema version.");
  }

  if (!Array.isArray(snapshot.transactions)) {
    throw new Error("Invalid Drive archive: expected a transactions array.");
  }

  snapshot.transactions.forEach((record) => {
    assertTransaction(record.transaction);
    getArchiveTransactionId(record.transaction);
  });
}

function assertTransaction(value: unknown): asserts value is Transaction {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid archived transaction: expected an object.");
  }

  const transaction = value as Partial<Transaction>;

  if (typeof transaction.date !== "string" || typeof transaction.description !== "string" || typeof transaction.amount !== "number") {
    throw new Error("Invalid archived transaction: missing date, description, or amount.");
  }
}

function readMetadataFromStore(store: IDBObjectStore) {
  return requestToPromise<StoredArchiveMetadata | undefined>(store.get(metadataKey));
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(getRequestErrorMessage(request)));
  });
}

function waitForTransaction(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(new Error(`Transaction archive operation aborted: ${transaction.error?.message || "unknown error"}.`));
    transaction.onerror = () => reject(new Error(`Transaction archive operation failed: ${transaction.error?.message || "unknown error"}.`));
  });
}

function getRequestErrorMessage(request: IDBRequest) {
  return request.error?.message || "unknown IndexedDB error";
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
