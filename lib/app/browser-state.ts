import {
  categoryColorsStorageKey,
  categoryOverridesStorageKey,
  categoryRulesStorageKey,
  categorySettingsVersion,
  categorySettingsVersionStorageKey,
  cardFitIncludedCategoriesStorageKey,
  customCategoriesStorageKey,
  deletedCategoriesStorageKey,
  hideBalancesStorageKey
} from "@/lib/app/constants";
import { defaultCategoryColors, defaultTransactionCategories, categoryRollupCategory, netlyPalette } from "@/lib/categories";
import { parseStoredJson } from "@/lib/app/storage";
import type { DataMode } from "@/lib/app/types";

export function resetOutdatedCategorySettings() {
  const storedVersion = window.localStorage.getItem(categorySettingsVersionStorageKey);

  if (storedVersion === categorySettingsVersion) {
    return;
  }

  [
    categoryColorsStorageKey,
    categoryOverridesStorageKey,
    categoryRulesStorageKey,
    cardFitIncludedCategoriesStorageKey,
    customCategoriesStorageKey,
    deletedCategoriesStorageKey
  ].forEach((storageKey) => window.localStorage.removeItem(storageKey));
  window.localStorage.setItem(categorySettingsVersionStorageKey, categorySettingsVersion);
}

export function readCategoryOverrides() {
  const storedValue = window.localStorage.getItem(categoryOverridesStorageKey);

  if (storedValue === null) {
    return {};
  }

  return assertStringRecord(categoryOverridesStorageKey, parseStoredJson<unknown>(categoryOverridesStorageKey, storedValue));
}

export function readCategoryRules() {
  const storedValue = window.localStorage.getItem(categoryRulesStorageKey);

  if (storedValue === null) {
    return {};
  }

  return assertStringRecord(categoryRulesStorageKey, parseStoredJson<unknown>(categoryRulesStorageKey, storedValue));
}

export function readCustomCategories() {
  const storedValue = window.localStorage.getItem(customCategoriesStorageKey);

  if (storedValue === null) {
    return [];
  }

  return assertStringArray(customCategoriesStorageKey, parseStoredJson<unknown>(customCategoriesStorageKey, storedValue));
}

export function readDeletedCategories() {
  const storedValue = window.localStorage.getItem(deletedCategoriesStorageKey);

  if (storedValue === null) {
    return [];
  }

  return assertStringArray(deletedCategoriesStorageKey, parseStoredJson<unknown>(deletedCategoriesStorageKey, storedValue));
}

export function readCardFitIncludedCategories() {
  const storedValue = window.localStorage.getItem(cardFitIncludedCategoriesStorageKey);

  if (storedValue === null) {
    return null;
  }

  return assertStringArray(cardFitIncludedCategoriesStorageKey, parseStoredJson<unknown>(cardFitIncludedCategoriesStorageKey, storedValue));
}

export function readCategoryColors() {
  const storedValue = window.localStorage.getItem(categoryColorsStorageKey);
  const stored = storedValue === null
    ? {}
    : assertStringRecord(categoryColorsStorageKey, parseStoredJson<unknown>(categoryColorsStorageKey, storedValue));
  return { ...defaultCategoryColors, ...getStoredCategoryColorOverrides(stored) };
}

export function readInitialDataMode(): DataMode {
  const value = window.localStorage.getItem("netly_data_mode");

  if (value === null) {
    return "user";
  }

  if (value === "user" || value === "demo") {
    return value;
  }

  throw new Error(`Invalid localStorage key "netly_data_mode": expected "user" or "demo", received "${value}".`);
}

export function readHideBalances() {
  const value = window.localStorage.getItem(hideBalancesStorageKey);

  if (value === null) {
    return false;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new Error(`Invalid localStorage key "${hideBalancesStorageKey}": expected "true" or "false", received "${value}".`);
}

// Reads Akahu callback URL params, shows a status message, then cleans the URL
// Reads Akahu callback query params, cleans the URL, and returns connection state.
export function handleCallbackParams({
  setSyncResult
}: {
  setSyncResult: (message: string) => void;
}) {
  const params = new URLSearchParams(window.location.search);
  const connected = params.get("connected");
  const connectionError = params.get("connect_error") || params.get("connectionError");

  if (connected === "1") {
    setSyncResult("Connected to Akahu. Loading transactions...");
    clearUrlParams();
    return { forceUserMode: true };
  }

  if (connectionError) {
    setSyncResult(`Connection failed: ${decodeURIComponent(connectionError)}`);
    clearUrlParams();
    return { forceUserMode: false };
  }

  return { forceUserMode: false };
}

function clearUrlParams() {
  window.history.replaceState({}, "", window.location.pathname);
}

function assertStringRecord(storageKey: string, value: unknown): Record<string, string> {
  if (!isRecord(value) || !Object.values(value).every((item) => typeof item === "string")) {
    throw new Error(`Invalid localStorage key "${storageKey}": expected an object with string values.`);
  }

  return value as Record<string, string>;
}

function assertStringArray(storageKey: string, value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Invalid localStorage key "${storageKey}": expected an array of strings.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStoredCategoryColorOverrides(stored: Record<string, string>) {
  const builtInCategorySet = new Set([...defaultTransactionCategories, categoryRollupCategory]);
  const builtInDefaultColorOwners = new Map(
    [...builtInCategorySet].map((category) => [defaultCategoryColors[category], category])
  );

  return Object.fromEntries(
    Object.entries(stored).filter(([category, color]) => {
      if (!netlyPalette.includes(color)) {
        return false;
      }

      if (!builtInCategorySet.has(category)) {
        return true;
      }

      const defaultColorOwner = builtInDefaultColorOwners.get(color);
      return defaultColorOwner === undefined || defaultColorOwner === category;
    })
  );
}
