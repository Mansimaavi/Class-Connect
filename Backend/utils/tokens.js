import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

const { accessSecret, refreshSecret, accessTtl, refreshTtlDays, issuer, audience } = env.jwt;
const ALGORITHM = "HS256";
const TWO_FACTOR_CHALLENGE_TTL = "5m";

const baseSignOptions = { algorithm: ALGORITHM, issuer, audience };
const baseVerifyOptions = { algorithms: [ALGORITHM], issuer, audience };

// Each token carries a `typ` claim so one kind of token can never be replayed
// where another is expected (e.g. a 2FA challenge used as an access token).
const verifyTyped = (token, secret, expectedType) => {
  const payload = jwt.verify(token, secret, baseVerifyOptions);
  if (payload.typ !== expectedType) {
    throw new jwt.JsonWebTokenError(`Expected a ${expectedType} token`);
  }
  return payload;
};

export const REFRESH_TOKEN_TTL_MS = refreshTtlDays * 24 * 60 * 60 * 1000;

export const signAccessToken = (user) =>
  jwt.sign({ typ: "access", role: user.role, tv: user.tokenVersion ?? 0 }, accessSecret, {
    ...baseSignOptions,
    subject: user._id.toString(),
    expiresIn: accessTtl,
  });

export const verifyAccessToken = (token) => verifyTyped(token, accessSecret, "access");

export const signRefreshToken = (user, jti = crypto.randomUUID()) => ({
  jti,
  token: jwt.sign({ typ: "refresh", tv: user.tokenVersion ?? 0 }, refreshSecret, {
    ...baseSignOptions,
    subject: user._id.toString(),
    expiresIn: `${refreshTtlDays}d`,
    jwtid: jti,
  }),
  expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
});

export const verifyRefreshToken = (token) => verifyTyped(token, refreshSecret, "refresh");

export const signTwoFactorChallenge = (user) =>
  jwt.sign({ typ: "2fa" }, accessSecret, {
    ...baseSignOptions,
    subject: user._id.toString(),
    expiresIn: TWO_FACTOR_CHALLENGE_TTL,
  });

export const verifyTwoFactorChallenge = (token) => verifyTyped(token, accessSecret, "2fa");
