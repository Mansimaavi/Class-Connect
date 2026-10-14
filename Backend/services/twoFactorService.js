import ApiError from "../utils/ApiError.js";
import { decrypt } from "../utils/crypto.js";
import { hashRecoveryCode, looksLikeRecoveryCode, verifyTotp } from "../utils/twoFactor.js";

export const TWO_FACTOR_FIELDS = "+twoFactor.secret +twoFactor.recoveryCodes +twoFactor.lastUsedStep";

/**
 * Verifies a login-time second factor: either a code from the authenticator
 * app or a one-time recovery code. Mutates `user` (marks the TOTP step as used
 * or burns the recovery code), so the caller must save it afterwards.
 * Returns "totp" or "recovery".
 */
export const verifySecondFactor = (user, code, { allowRecoveryCode = true } = {}) => {
  if (!user.twoFactor?.enabled || !user.twoFactor.secret) {
    throw ApiError.badRequest("Two-factor authentication is not enabled", undefined, "TWO_FACTOR_NOT_ENABLED");
  }

  const step = verifyTotp(decrypt(user.twoFactor.secret), code);
  if (step !== null) {
    if (user.twoFactor.lastUsedStep && step <= user.twoFactor.lastUsedStep) {
      throw ApiError.unauthorized("That code was already used. Wait for the next one.", "TWO_FACTOR_CODE_REUSED");
    }
    user.twoFactor.lastUsedStep = step;
    return "totp";
  }

  if (allowRecoveryCode && looksLikeRecoveryCode(code)) {
    const hash = hashRecoveryCode(code);
    const remaining = user.twoFactor.recoveryCodes || [];
    if (remaining.includes(hash)) {
      user.twoFactor.recoveryCodes = remaining.filter((stored) => stored !== hash);
      return "recovery";
    }
  }

  throw ApiError.unauthorized("Invalid authentication code", "INVALID_2FA_CODE");
};
