// AES-256-GCM encryption for integration credentials
// Uses ENCRYPTION_KEY from env vars (must be 32 bytes / 64 hex chars)

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set");
  }
  // Accept hex-encoded 32-byte key (64 hex chars)
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }
  // Accept raw 32-byte key
  if (key.length === 32) {
    return Buffer.from(key, "utf-8");
  }
  throw new Error(
    "ENCRYPTION_KEY must be 32 bytes (64 hex characters or 32 raw characters)"
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64 string in the format: iv:authTag:ciphertext
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Decrypts a string previously encrypted with encrypt().
 * Expects format: iv:authTag:ciphertext (all base64)
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivB64, authTagB64, ciphertext] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length");
  }
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
