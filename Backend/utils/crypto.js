import crypto from "node:crypto";
import env from "../config/env.js";

const ENCRYPTION_KEY = crypto.createHash("sha256").update(env.twoFactorKey).digest(); // 32 bytes
const IV_LENGTH = 12;

/** AES-256-GCM. Output format: base64(iv).base64(authTag).base64(ciphertext) */
export const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64")).join(".");
};

export const decrypt = (payload) => {
  const [iv, tag, encrypted] = String(payload)
    .split(".")
    .map((part) => Buffer.from(part, "base64"));
  if (!iv || !tag || !encrypted) throw new Error("Malformed encrypted payload");
  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

export const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

export const randomNumericCode = (digits = 6) =>
  crypto.randomInt(0, 10 ** digits).toString().padStart(digits, "0");

/** Constant-time comparison of two strings (e.g. hashes). */
export const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};
