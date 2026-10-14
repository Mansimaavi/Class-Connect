import { twoFactorChangedTemplate } from "../../mail/templates/passwordTemplates.js";
import User from "../../models/user.js";
import { TWO_FACTOR_FIELDS, verifySecondFactor } from "../../services/twoFactorService.js";
import ApiError from "../../utils/ApiError.js";
import { decrypt, encrypt } from "../../utils/crypto.js";
import logger from "../../utils/logger.js";
import sendMail from "../../utils/mailSender.js";
import {
  buildOtpAuthUrl,
  buildQrCodeDataUrl,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotp,
} from "../../utils/twoFactor.js";

const notifyChange = (user, enabled) =>
  sendMail({
    to: user.email,
    subject: enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
    html: twoFactorChangedTemplate(user.name, enabled),
  }).catch((error) => logger.error({ err: error }, "failed to send 2FA email"));

/** GET /api/auth/2fa — current 2FA status. */
export const getTwoFactorStatus = async (req, res) => {
  const user = await User.findById(req.user._id).select("+twoFactor.recoveryCodes");
  res.json({
    success: true,
    enabled: Boolean(user.twoFactor?.enabled),
    enabledAt: user.twoFactor?.enabledAt ?? null,
    recoveryCodesRemaining: user.twoFactor?.enabled ? user.twoFactor.recoveryCodes?.length ?? 0 : 0,
  });
};

/**
 * POST /api/auth/2fa/setup — creates a new TOTP secret (not active yet) and
 * returns it as a QR code. 2FA only turns on once the user proves their app
 * produces valid codes via /2fa/enable.
 */
export const setupTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select("+twoFactor.pendingSecret");
  if (user.twoFactor?.enabled) {
    throw ApiError.conflict("Two-factor authentication is already enabled", "TWO_FACTOR_ALREADY_ENABLED");
  }

  const secret = generateTotpSecret();
  user.set("twoFactor.pendingSecret", encrypt(secret));
  await user.save();

  const otpauthUrl = buildOtpAuthUrl(secret, user.email);
  res.json({
    success: true,
    otpauthUrl,
    qrCode: await buildQrCodeDataUrl(otpauthUrl),
    secret, // for typing into the app manually
  });
};

/** POST /api/auth/2fa/enable — confirms setup with a code and returns recovery codes (shown once). */
export const enableTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select(`+twoFactor.pendingSecret ${TWO_FACTOR_FIELDS}`);
  if (user.twoFactor?.enabled) {
    throw ApiError.conflict("Two-factor authentication is already enabled", "TWO_FACTOR_ALREADY_ENABLED");
  }
  if (!user.twoFactor?.pendingSecret) {
    throw ApiError.badRequest("Start the setup first", undefined, "TWO_FACTOR_SETUP_REQUIRED");
  }

  const step = verifyTotp(decrypt(user.twoFactor.pendingSecret), req.body.code);
  if (step === null) {
    throw ApiError.badRequest("That code didn't match. Check your device's clock and try again.", undefined, "INVALID_2FA_CODE");
  }

  const { codes, hashes } = generateRecoveryCodes();
  user.set("twoFactor", {
    enabled: true,
    enabledAt: new Date(),
    secret: user.twoFactor.pendingSecret,
    pendingSecret: undefined,
    recoveryCodes: hashes,
    lastUsedStep: step,
  });
  await user.save();
  notifyChange(user, true);

  res.json({
    success: true,
    message: "Two-factor authentication is on. Save your recovery codes somewhere safe.",
    recoveryCodes: codes,
  });
};

/** POST /api/auth/2fa/disable — requires the password and a current code. */
export const disableTwoFactor = async (req, res) => {
  const user = await User.findById(req.user._id).select(`+password ${TWO_FACTOR_FIELDS}`);
  if (!user.twoFactor?.enabled) {
    throw ApiError.badRequest("Two-factor authentication is not enabled", undefined, "TWO_FACTOR_NOT_ENABLED");
  }
  if (!(await user.comparePassword(req.body.password))) {
    throw ApiError.unauthorized("Incorrect password", "INVALID_PASSWORD");
  }
  verifySecondFactor(user, req.body.code);

  user.set("twoFactor", { enabled: false });
  await user.save();
  notifyChange(user, false);

  res.json({ success: true, message: "Two-factor authentication is off" });
};

/** POST /api/auth/2fa/recovery-codes — replaces all recovery codes (needs an app code). */
export const regenerateRecoveryCodes = async (req, res) => {
  const user = await User.findById(req.user._id).select(TWO_FACTOR_FIELDS);
  verifySecondFactor(user, req.body.code, { allowRecoveryCode: false });

  const { codes, hashes } = generateRecoveryCodes();
  user.set("twoFactor.recoveryCodes", hashes);
  await user.save();

  res.json({ success: true, recoveryCodes: codes });
};
