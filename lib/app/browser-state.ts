import { categoryColorsStorageKey, categoryOverridesStorageKey, customCategoriesStorageKey, deletedCategoriesStorageKey } from "@/lib/app/constants";
import { defaultCategoryColors } from "@/lib/categories";
import { parseStoredJson } from "@/lib/app/storage";
import type { DataMode } from "@/lib/app/types";

export function readCategoryOverrides() {
  return parseStoredJson<Record<string, string>>(window.localStorage.getItem(categoryOverridesStorageKey)) || {};
}

export function readCustomCategories() {
  return parseStoredJson<string[]>(window.localStorage.getItem(customCategoriesStorageKey)) || [];
}

export function readDeletedCategories() {
  return parseStoredJson<string[]>(window.localStorage.getItem(deletedCategoriesStorageKey)) || [];
}

export function readCategoryColors() {
  const stored = parseStoredJson<Record<string, string>>(window.localStorage.getItem(categoryColorsStorageKey)) || {};
  return { ...defaultCategoryColors, ...stored };
}

export function readInitialDataMode(): DataMode {
  return window.localStorage.getItem("netly_data_mode") === "demo" ? "demo" : "user";
}

// Reads the OAuth response cookie used by the Connect screen fallback flow.
export function readAuthResponseCookie() {
  return "";
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
