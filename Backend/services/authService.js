import env from "../config/env.js";
import User from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";
import {
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";

export const REFRESH_COOKIE = "cc_refresh";
const ROTATION_GRACE_MS = 30 * 1000;

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.cookie.secure || env.cookie.sameSite === "none",
  sameSite: env.cookie.sameSite,
  path: "/api/auth",
  maxAge: REFRESH_TOKEN_TTL_MS,
});

export const setRefreshCookie = (res, token) => res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());

export const clearRefreshCookie = (res) => {
  const { maxAge: _maxAge, ...options } = refreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE, options);
};

const clientInfo = (req) => ({
  userAgent: (req.get("user-agent") || "").slice(0, 300),
  ip: (req.ip || "").slice(0, 64),
});

/**
 * Starts a new signed-in session: records it on the user, sets the refresh
 * cookie and returns the short-lived access token for the response body.
 * `user` must have been loaded with `+sessions +tokenVersion`.
 */
export const startSession = async (user, req, res) => {
  const refresh = signRefreshToken(user);
  user.addSession({ jti: refresh.jti, expiresAt: refresh.expiresAt, ...clientInfo(req) });
  await user.save();
  setRefreshCookie(res, refresh.token);
  return signAccessToken(user);
};

/**
 * Exchanges a refresh token for a new access token and a new refresh token
 * (rotation). Presenting a refresh token that was already rotated (outside a
 * short grace window) means it was copied somewhere, so every session for
 * that user is revoked.
 */
export const rotateSession = async (refreshToken, req, res) => {
  if (!refreshToken) throw ApiError.unauthorized("No active session", "NO_REFRESH_TOKEN");

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    clearRefreshCookie(res);
    throw ApiError.unauthorized("Your session has expired, please sign in again", "INVALID_REFRESH_TOKEN");
  }

  const user = await User.findById(payload.sub).select("+tokenVersion");
  if (!user || (user.tokenVersion ?? 0) !== payload.tv) {
    clearRefreshCookie(res);
    throw ApiError.unauthorized("Your session has expired, please sign in again", "INVALID_REFRESH_TOKEN");
  }
  if (user.isBlocked) {
    clearRefreshCookie(res);
    throw ApiError.forbidden("Your account has been blocked. Please contact an administrator.", "ACCOUNT_BLOCKED");
  }

  // Rotate atomically: only the request that still holds the current jti wins.
  const refresh = signRefreshToken(user);
  const now = new Date();
  const { userAgent, ip } = clientInfo(req);
  const rotated = await User.updateOne(
    { _id: user._id, "sessions.jti": payload.jti },
    {
      $set: {
        "sessions.$.jti": refresh.jti,
        "sessions.$.previousJti": payload.jti,
        "sessions.$.rotatedAt": now,
        "sessions.$.lastUsedAt": now,
        "sessions.$.expiresAt": refresh.expiresAt,
        "sessions.$.userAgent": userAgent,
        "sessions.$.ip": ip,
      },
    }
  );

  if (!rotated.modifiedCount) {
    // A request that left before a concurrent refresh rotated this token:
    // give it an access token but leave the cookie the other response set.
    const fresh = await User.findById(user._id).select("+sessions");
    const justRotated = fresh?.sessions.some(
      (session) =>
        session.previousJti === payload.jti && session.rotatedAt && Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS
    );
    if (justRotated) return { user, accessToken: signAccessToken(user) };

    logger.warn({ userId: user._id.toString() }, "refresh token reuse detected; revoking all sessions");
    await revokeAllSessions(user._id);
    clearRefreshCookie(res);
    throw ApiError.unauthorized("Your session is no longer valid, please sign in again", "REFRESH_TOKEN_REUSED");
  }

  setRefreshCookie(res, refresh.token);
  return { user, accessToken: signAccessToken(user) };
};

/** Ends the session the refresh cookie belongs to (if any). */
export const endSession = async (refreshToken, res) => {
  clearRefreshCookie(res);
  if (!refreshToken) return null;
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub).select("+sessions");
    if (!user) return null;
    user.sessions = user.sessions.filter((session) => session.jti !== payload.jti);
    user.recordLogout();
    await user.save();
    return user;
  } catch {
    return null;
  }
};

/** Signs the user out everywhere: drops every session and invalidates access tokens. */
export const revokeAllSessions = async (userId) => {
  await User.updateOne({ _id: userId }, { $set: { sessions: [] }, $inc: { tokenVersion: 1 } });
};
