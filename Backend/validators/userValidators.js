import { z } from "zod";
import { ROLES } from "../config/permissions.js";
import { email, escapeRegex, idParams, paginationQuery, password, trimmed } from "./common.js";

export const userIdParams = idParams("userId");

export const updateProfileSchema = z
  .object({
    name: trimmed(1, 80, "Name").optional(),
    course: trimmed(1, 100, "Course").optional(),
    college: trimmed(1, 150, "College").optional(),
    avatarUrl: z.url("Avatar must be a valid URL").max(500).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const changeEmailSchema = z.object({
  newEmail: email,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: "Current password is required" }).min(1, "Current password is required"),
  newPassword: password,
});

export const listUsersQuery = paginationQuery.extend({
  search: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? escapeRegex(value) : undefined)),
  role: z.enum(Object.values(ROLES)).optional(),
  status: z.enum(["active", "blocked"]).optional(),
  sort: z.enum(["lastLogin", "createdAt", "name"]).default("lastLogin"),
});

export const updateRoleSchema = z.object({
  role: z.enum([ROLES.USER, ROLES.ADMIN], { error: "Role must be user or admin" }),
});

export const updateStatusSchema = z.object({
  blocked: z.boolean({ error: "blocked must be true or false" }),
});

export const statsQuery = z.object({
  range: z.enum(["last24hours", "last7days", "lastMonth", "lastYear", "overall"]).default("last7days"),
});

export const activityQuery = z.object({
  scope: z.enum(["today", "overall"]).default("today"),
  // minutes east of UTC, used to decide where "today" starts (India = 330)
  tzOffset: z.coerce.number().int().min(-720).max(840).default(330),
});
