// Parses persisted app settings. Callers handle missing values before parsing.
export function parseStoredJson<T>(storageKey: string, value: string) {
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Invalid JSON in localStorage key "${storageKey}". Clear or repair this setting.`, { cause: error });
  }
}
