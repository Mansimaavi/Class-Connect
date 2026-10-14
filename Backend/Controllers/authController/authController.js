import bcrypt from "bcryptjs";
import env from "../../config/env.js";
import { permissionsForRole } from "../../config/permissions.js";
import otpTemplate from "../../mail/templates/emailVerificationTemplate.js";
import { passwordResetTemplate, passwordUpdatedTemplate } from "../../mail/templates/passwordTemplates.js";
import OtpCode, { OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "../../models/otpCode.js";
import User from "../../models/user.js";
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  endSession,
  revokeAllSessions,
  rotateSession,
  startSession,
} from "../../services/authService.js";
import { notifyAdmins } from "../../services/notificationService.js";
import { broadcastStats } from "../../services/statsService.js";
import { TWO_FACTOR_FIELDS, verifySecondFactor } from "../../services/twoFactorService.js";
import ApiError from "../../utils/ApiError.js";
import { randomNumericCode, randomToken, safeEqual, sha256 } from "../../utils/crypto.js";
import logger from "../../utils/logger.js";
import sendMail from "../../utils/mailSender.js";
import { signTwoFactorChallenge, verifyTwoFactorChallenge } from "../../utils/tokens.js";

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
// Compared against when the account doesn't exist, so a failed login takes the
// same time whether or not the email/username is registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 4);

const otpHash = (email, code) => sha256(`${email}:${code}`);

const authPayload = (user, accessToken) => ({
  success: true,
  accessToken,
  user,
  permissions: permissionsForRole(user.role),
});

const sendInBackground = (mail) =>
  sendMail(mail).catch((error) => logger.error({ err: error, to: mail.to }, "failed to send email"));

/** POST /api/auth/send-otp — emails a 6-digit code to verify a new account's address. */
export const sendOtp = async (req, res) => {
  const { email } = req.body;
  if (await User.exists({ email })) {
    throw ApiError.conflict("An account with this email already exists", "EMAIL_TAKEN");
  }

  const code = randomNumericCode(6);
  await OtpCode.deleteMany({ email, purpose: "register" });
  await OtpCode.create({ email, purpose: "register", codeHash: otpHash(email, code) });

  await sendMail({
    to: email,
    subject: `${code} is your ClassConnect verification code`,
    html: otpTemplate(code, OTP_TTL_MINUTES),
    text: `Your ClassConnect verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    devPreview: `verification code: ${code}`,
  });

  res.json({ success: true, message: "We've sent a verification code to your email" });
};

/** POST /api/auth/register */
export const register = async (req, res) => {
  const { otp, latitude, longitude, ...profile } = req.body;
  const { email, username } = profile;

  const record = await OtpCode.findOne({ email, purpose: "register" }).sort({ createdAt: -1 });
  if (!record || record.expiresAt < new Date()) {
    throw ApiError.badRequest("Your verification code has expired. Please request a new one.", undefined, "OTP_EXPIRED");
  }
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await record.deleteOne();
    throw ApiError.badRequest("Too many incorrect attempts. Please request a new code.", undefined, "OTP_TOO_MANY_ATTEMPTS");
  }
  if (!safeEqual(record.codeHash, otpHash(email, otp))) {
    record.attempts += 1;
    await record.save();
    throw ApiError.badRequest("That verification code is incorrect", undefined, "OTP_INVALID");
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] }).select("email username");
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    throw new ApiError(409, `That ${field} is already registered`, "DUPLICATE_KEY", [{ field, message: "Already in use" }]);
  }

  const user = await User.create({
    ...profile,
    location: { latitude: latitude ?? null, longitude: longitude ?? null },
  });
  await OtpCode.deleteMany({ email });

  await notifyAdmins({
    type: "user_registered",
    title: "New user",
    message: `${user.name} (@${user.username}) just joined ClassConnect`,
    actor: user._id,
  });
  broadcastStats();

  res.status(201).json({ success: true, message: "Account created. You can sign in now.", user });
};

/** POST /api/auth/login — email or username + password. */
export const login = async (req, res) => {
  const { identifier, password } = req.body;
  const query = identifier.includes("@") ? { email: identifier } : { username: identifier };
  const user = await User.findOne(query).select("+password +sessions +tokenVersion");

  const passwordOk = user ? await user.comparePassword(password) : await bcrypt.compare(password, DUMMY_HASH);
  if (!user || !passwordOk) {
    throw ApiError.unauthorized("Incorrect email/username or password", "INVALID_CREDENTIALS");
  }
  if (user.isBlocked) {
    throw ApiError.forbidden("Your account has been blocked. Please contact an administrator.", "ACCOUNT_BLOCKED");
  }

  if (user.twoFactor?.enabled) {
    return res.json({
      success: true,
      requiresTwoFactor: true,
      twoFactorToken: signTwoFactorChallenge(user),
      message: "Enter the code from your authenticator app",
    });
  }

  user.recordLogin();
  const accessToken = await startSession(user, req, res);
  return res.json(authPayload(user, accessToken));
};

/** POST /api/auth/login/2fa — second step of sign-in for accounts with 2FA. */
export const loginWithTwoFactor = async (req, res) => {
  const { twoFactorToken, code } = req.body;

  let challenge;
  try {
    challenge = verifyTwoFactorChallenge(twoFactorToken);
  } catch {
    throw ApiError.unauthorized("This sign-in attempt has expired. Please sign in again.", "TWO_FACTOR_CHALLENGE_EXPIRED");
  }

  const user = await User.findById(challenge.sub).select(`+sessions +tokenVersion ${TWO_FACTOR_FIELDS}`);
  if (!user || !user.twoFactor?.enabled) {
    throw ApiError.unauthorized("This sign-in attempt is no longer valid. Please sign in again.", "TWO_FACTOR_CHALLENGE_EXPIRED");
  }
  if (user.isBlocked) {
    throw ApiError.forbidden("Your account has been blocked. Please contact an administrator.", "ACCOUNT_BLOCKED");
  }

  const method = verifySecondFactor(user, code);
  user.recordLogin();
  const accessToken = await startSession(user, req, res);

  return res.json({
    ...authPayload(user, accessToken),
    ...(method === "recovery" && { recoveryCodesRemaining: user.twoFactor.recoveryCodes.length }),
  });
};

/** POST /api/auth/refresh — rotates the refresh cookie and returns a new access token. */
export const refresh = async (req, res) => {
  const { user, accessToken } = await rotateSession(req.cookies?.[REFRESH_COOKIE], req, res);
  res.json(authPayload(user, accessToken));
};

/** POST /api/auth/logout — ends this device's session. */
export const logout = async (req, res) => {
  await endSession(req.cookies?.[REFRESH_COOKIE], res);
  res.json({ success: true, message: "Signed out" });
};

/** POST /api/auth/logout-all — ends every session and invalidates all access tokens. */
export const logoutAll = async (req, res) => {
  await revokeAllSessions(req.user._id);
  clearRefreshCookie(res);
  res.json({ success: true, message: "Signed out of all devices" });
};

/** GET /api/auth/me */
export const me = async (req, res) => {
  res.json({ success: true, user: req.user, permissions: permissionsForRole(req.user.role) });
};

/** GET /api/auth/sessions — devices this account is signed in on. */
export const listSessions = async (req, res) => {
  const user = await User.findById(req.user._id).select("+sessions");
  const now = Date.now();
  const sessions = user.sessions
    .filter((session) => session.expiresAt.getTime() > now)
    .map((session) => ({
      id: session.jti,
      userAgent: session.userAgent,
      ip: session.ip,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
    }))
    .reverse();
  res.json({ success: true, sessions });
};

/** DELETE /api/auth/sessions/:sessionId — signs out one device. */
export const revokeSession = async (req, res) => {
  const result = await User.updateOne(
    { _id: req.user._id },
    { $pull: { sessions: { jti: req.params.sessionId } } }
  );
  if (!result.modifiedCount) throw ApiError.notFound("Session");
  res.json({ success: true, message: "Device signed out" });
};

/** POST /api/auth/forgot-password — always answers the same way to avoid revealing accounts. */
export const forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && !user.isBlocked) {
    const token = randomToken(32);
    user.passwordReset = { tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) };
    await user.save();
    const resetUrl = `${env.appUrl}/reset-password/${token}`;
    sendInBackground({
      to: user.email,
      subject: "Reset your ClassConnect password",
      html: passwordResetTemplate(user.name, resetUrl),
      text: `Reset your password: ${resetUrl}`,
      devPreview: resetUrl,
    });
  }
  res.json({ success: true, message: "If an account exists for that email, we've sent a reset link." });
};

/** POST /api/auth/reset-password */
export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    "passwordReset.tokenHash": sha256(token),
    "passwordReset.expiresAt": { $gt: new Date() },
  }).select("+passwordReset.tokenHash +passwordReset.expiresAt +sessions +tokenVersion");

  if (!user) {
    throw ApiError.badRequest("This reset link is invalid or has expired", undefined, "INVALID_RESET_TOKEN");
  }

  user.password = password;
  user.passwordReset = undefined;
  user.sessions = [];
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  sendInBackground({
    to: user.email,
    subject: "Your ClassConnect password was changed",
    html: passwordUpdatedTemplate(user.name, user.email),
  });

  res.json({ success: true, message: "Password updated. Please sign in with your new password." });
};
