import { createHash } from "node:crypto";
import { compactDecrypt, CompactEncrypt } from "jose";

const encryptedCookieVersion = "v1";
const requiredSecretLength = 32;
const joseHeader = {
  alg: "dir",
  enc: "A256GCM"
} as const;

// Encrypts bearer tokens into compact JWE cookie values using jose.
export async function encryptAkahuCookieValue(value: string) {
  const key = getCookieEncryptionKey();

  return [
    encryptedCookieVersion,
    await new CompactEncrypt(new TextEncoder().encode(value))
      .setProtectedHeader(joseHeader)
      .encrypt(key)
  ].join(":");
}

// Decrypts and validates Akahu token cookies, failing loudly on stale formats.
export async function decryptAkahuCookieValue(value: string) {
  const [version, encryptedValue, ...extraParts] = value.split(":");

  if (version !== encryptedCookieVersion || !encryptedValue || extraParts.length > 0) {
    throw new Error("Invalid encrypted Akahu token cookie format. Reconnect Akahu from the Connect page.");
  }

  try {
    const result = await compactDecrypt(encryptedValue, getCookieEncryptionKey());
    return new TextDecoder().decode(result.plaintext);
  } catch (error) {
    throw new Error("Could not decrypt Akahu token cookie. Reconnect Akahu from the Connect page.");
  }
}

// Derives a fixed-width jose key from the configured cookie secret.
function getCookieEncryptionKey() {
  const secret = process.env.AKAHU_COOKIE_SECRET;

  if (!secret) {
    throw new Error("Missing required environment variable: AKAHU_COOKIE_SECRET. It encrypts manually entered Akahu tokens stored in cookies.");
  }

  if (secret.length < requiredSecretLength) {
    throw new Error(`AKAHU_COOKIE_SECRET must be at least ${requiredSecretLength} characters.`);
  }

  return createHash("sha256").update(secret, "utf8").digest();
}
