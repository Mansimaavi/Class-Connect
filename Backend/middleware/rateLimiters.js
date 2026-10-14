import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

const MINUTE = 60 * 1000;

const limiter = ({ windowMs, limit, message, keyByUser = false }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => env.isTest,
    // Per-user limits for authenticated endpoints, per-IP otherwise.
    ...(keyByUser && {
      keyGenerator: (req) => (req.user ? `user:${req.user._id}` : ipKeyGenerator(req.ip)),
    }),
    handler: (_req, _res, next) => next(ApiError.tooMany(message)),
  });

export const apiLimiter = limiter({ windowMs: 15 * MINUTE, limit: 600 });

export const authLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  message: "Too many sign-in attempts. Please wait a few minutes and try again.",
});

export const otpLimiter = limiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  message: "Too many verification emails requested. Please try again later.",
});

export const uploadLimiter = limiter({ windowMs: 15 * MINUTE, limit: 40, keyByUser: true });

export const summarizeLimiter = limiter({
  windowMs: 60 * MINUTE,
  limit: 15,
  keyByUser: true,
  message: "You've reached the summary limit for now. Please try again in an hour.",
});
