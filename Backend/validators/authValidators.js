import { z } from "zod";
import { email, password, trimmed } from "./common.js";

const otp = z
  .string({ error: "Verification code is required" })
  .trim()
  .regex(/^\d{6}$/, "Verification code must be 6 digits");

const twoFactorCode = z
  .string({ error: "Code is required" })
  .trim()
  .min(6, "Enter the 6-digit code or a recovery code")
  .max(20, "Enter the 6-digit code or a recovery code");

const coordinate = (min, max) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(min).max(max).optional()
  );

export const sendOtpSchema = z.object({ email });

export const registerSchema = z.object({
  name: trimmed(1, 80, "Name"),
  username: trimmed(3, 30, "Username")
    .toLowerCase()
    .regex(/^[a-z0-9_.]+$/, "Username can only contain letters, numbers, dots and underscores"),
  email,
  password,
  course: trimmed(1, 100, "Course"),
  college: trimmed(1, 150, "College"),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  otp,
});

// `email` is accepted for compatibility with the original login form.
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1).max(254).optional(),
    email: z.string().trim().min(1).max(254).optional(),
    password: z.string({ error: "Password is required" }).min(1, "Password is required").max(128),
  })
  .refine((data) => data.identifier || data.email, {
    message: "Email or username is required",
    path: ["identifier"],
  })
  .transform(({ identifier, email: legacyEmail, password: pwd }) => ({
    identifier: (identifier || legacyEmail).toLowerCase(),
    password: pwd,
  }));

export const twoFactorLoginSchema = z.object({
  twoFactorToken: z.string({ error: "Sign-in challenge is missing" }).min(10),
  code: twoFactorCode,
});

export const twoFactorCodeSchema = z.object({ code: twoFactorCode });

export const disableTwoFactorSchema = z.object({
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
  code: twoFactorCode,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().regex(/^[a-f0-9]{64}$/, "Invalid or expired reset link"),
    password,
    confirmPassword: z.string().optional(),
  })
  .refine((data) => data.confirmPassword === undefined || data.confirmPassword === data.password, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
