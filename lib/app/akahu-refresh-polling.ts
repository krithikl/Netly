export const akahuRefreshPollingIntervalMs = 5 * 1000;
export const akahuRefreshPollingTimeoutMs = 60 * 1000;
export const akahuRefreshStillProcessingNotice = "Akahu accepted the refresh request, but transaction updates are still processing. Try again shortly if the latest transactions are not visible.";

// Checks Akahu freshness timestamps while rejecting malformed timestamp strings.
export function hasRefreshTimestampAdvanced(previousValue: string | null, nextValue: string | null, label: string) {
  if (!nextValue) {
    return false;
  }

  const nextTimestamp = parseRefreshTimestamp(nextValue, label);

  if (!previousValue) {
    return true;
  }

  return nextTimestamp > parseRefreshTimestamp(previousValue, label);
}

// Parses Akahu freshness timestamps without silently accepting malformed values.
function parseRefreshTimestamp(value: string, label: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid Akahu ${label} timestamp "${value}".`);
  }

  return timestamp;
}
