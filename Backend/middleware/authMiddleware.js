import User from "../models/user.js";
import ApiError from "../utils/ApiError.js";
import { verifyAccessToken } from "../utils/tokens.js";

const readBearerToken = (req) => {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token.trim() : null;
};

/**
 * Resolves the user behind an access token. Shared by the HTTP middleware and
 * the Socket.IO handshake so both enforce exactly the same rules.
 */
export const resolveUserFromAccessToken = async (token) => {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Your session has expired", "TOKEN_EXPIRED");
    }
    throw ApiError.unauthorized("Invalid access token", "INVALID_TOKEN");
  }

  const user = await User.findById(payload.sub).select("+tokenVersion");
  if (!user) throw ApiError.unauthorized("This account no longer exists", "INVALID_TOKEN");
  // tokenVersion is bumped on "sign out everywhere" and password changes.
  if ((user.tokenVersion ?? 0) !== payload.tv) {
    throw ApiError.unauthorized("This session has been signed out", "TOKEN_REVOKED");
  }
  if (user.isBlocked) {
    throw ApiError.forbidden("Your account has been blocked. Please contact an administrator.", "ACCOUNT_BLOCKED");
  }
  return { user, payload };
};

/** Requires a valid `Authorization: Bearer <access token>` header. */
export const authenticate = async (req, _res, next) => {
  const token = readBearerToken(req);
  if (!token) throw ApiError.unauthorized("Please sign in to continue", "NO_TOKEN");
  const { user, payload } = await resolveUserFromAccessToken(token);
  req.user = user;
  req.auth = payload;
  next();
};

/** Attaches the user when a valid token is sent, but never rejects the request. */
export const optionalAuth = async (req, _res, next) => {
  const token = readBearerToken(req);
  if (token) {
    try {
      const { user, payload } = await resolveUserFromAccessToken(token);
      req.user = user;
      req.auth = payload;
    } catch {
      // treat as anonymous
    }
  }
  next();
};

export default authenticate;
