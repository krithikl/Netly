import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const encryptedCookieVersion = "v1";
const requiredSecretLength = 32;

export function encryptAkahuCookieValue(value: string) {
  const key = getCookieEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    encryptedCookieVersion,
    toBase64Url(iv),
    toBase64Url(encrypted),
    toBase64Url(tag)
  ].join(":");
}

export function decryptAkahuCookieValue(value: string) {
  const [version, iv, encrypted, tag] = value.split(":");

  if (version !== encryptedCookieVersion || !iv || !encrypted || !tag) {
    throw new Error("Invalid encrypted Akahu token cookie format. Reconnect Akahu from the Connect page.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getCookieEncryptionKey(), fromBase64Url(iv));
  decipher.setAuthTag(fromBase64Url(tag));

  return Buffer.concat([
    decipher.update(fromBase64Url(encrypted)),
    decipher.final()
  ]).toString("utf8");
}

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

function toBase64Url(value: Buffer) {
  return value.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}
