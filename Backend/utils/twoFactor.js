import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { randomToken, sha256 } from "./crypto.js";

const ISSUER = "ClassConnect";
const PERIOD_SECONDS = 30;
const RECOVERY_CODE_COUNT = 8;

const buildTotp = (secretBase32, label = "") =>
  new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1", // what Google Authenticator / Authy / 1Password expect
    digits: 6,
    period: PERIOD_SECONDS,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

export const generateTotpSecret = () => new OTPAuth.Secret({ size: 20 }).base32;

export const buildOtpAuthUrl = (secretBase32, accountLabel) =>
  buildTotp(secretBase32, accountLabel).toString();

export const buildQrCodeDataUrl = (otpAuthUrl) => QRCode.toDataURL(otpAuthUrl, { margin: 1, width: 220 });

/**
 * Checks a 6-digit code, allowing one step of clock drift either way.
 * Returns the absolute time-step the code belongs to (so callers can reject a
 * code that was already used), or null if the code is wrong.
 */
export const verifyTotp = (secretBase32, code, timestamp = Date.now()) => {
  const token = String(code ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return null;
  const delta = buildTotp(secretBase32).validate({ token, timestamp, window: 1 });
  if (delta === null) return null;
  return Math.floor(timestamp / 1000 / PERIOD_SECONDS) + delta;
};

export const generateTotpCode = (secretBase32, timestamp = Date.now()) =>
  buildTotp(secretBase32).generate({ timestamp });

const normalizeRecoveryCode = (code) => String(code ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export const hashRecoveryCode = (code) => sha256(normalizeRecoveryCode(code));

/** Returns `{ codes, hashes }`; show `codes` to the user once, store only `hashes`. */
export const generateRecoveryCodes = (count = RECOVERY_CODE_COUNT) => {
  const codes = Array.from({ length: count }, () => {
    const raw = randomToken(5).toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
};

export const looksLikeRecoveryCode = (code) => normalizeRecoveryCode(code).length === 10;
