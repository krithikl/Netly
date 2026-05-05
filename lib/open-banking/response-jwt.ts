export function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Expected a JWT with header.payload.signature format");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
}
