import express from "express";
import {
  forgotPassword,
  listSessions,
  login,
  loginWithTwoFactor,
  logout,
  logoutAll,
  me,
  refresh,
  register,
  resetPassword,
  revokeSession,
  sendOtp,
} from "../Controllers/authController/authController.js";
import {
  disableTwoFactor,
  enableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
  setupTwoFactor,
} from "../Controllers/authController/twoFactorController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimiters.js";
import validate from "../middleware/validate.js";
import {
  disableTwoFactorSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sendOtpSchema,
  twoFactorCodeSchema,
  twoFactorLoginSchema,
} from "../validators/authValidators.js";
import { z } from "zod";

const router = express.Router();

router.post("/send-otp", otpLimiter, validate({ body: sendOtpSchema }), sendOtp);
router.post("/register", authLimiter, validate({ body: registerSchema }), register);
router.post("/login", authLimiter, validate({ body: loginSchema }), login);
router.post("/login/2fa", authLimiter, validate({ body: twoFactorLoginSchema }), loginWithTwoFactor);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/logout-all", authenticate, logoutAll);
router.post("/forgot-password", otpLimiter, validate({ body: forgotPasswordSchema }), forgotPassword);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), resetPassword);

router.get("/me", authenticate, me);
router.get("/sessions", authenticate, listSessions);
router.delete(
  "/sessions/:sessionId",
  authenticate,
  validate({ params: z.object({ sessionId: z.uuid("Invalid session id") }) }),
  revokeSession
);

router.get("/2fa", authenticate, getTwoFactorStatus);
router.post("/2fa/setup", authenticate, setupTwoFactor);
router.post("/2fa/enable", authenticate, validate({ body: twoFactorCodeSchema }), enableTwoFactor);
router.post("/2fa/disable", authenticate, validate({ body: disableTwoFactorSchema }), disableTwoFactor);
router.post("/2fa/recovery-codes", authenticate, validate({ body: twoFactorCodeSchema }), regenerateRecoveryCodes);

export default router;
