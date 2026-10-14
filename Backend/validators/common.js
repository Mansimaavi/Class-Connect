import { z } from "zod";

const OBJECT_ID = /^[a-f\d]{24}$/i;

export const isObjectId = (value) => typeof value === "string" && OBJECT_ID.test(value);

export const objectId = (label = "id") => z.string().regex(OBJECT_ID, `Invalid ${label}`);

export const idParams = (...names) =>
  z.object(Object.fromEntries(names.map((name) => [name, objectId(name)])));

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const trimmed = (min, max, label) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const password = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

export const email = z.string({ error: "Email is required" }).trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Builds the `{ page, limit, total, pages }` block every list endpoint returns. */
export const paginationMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  pages: Math.max(1, Math.ceil(total / limit)),
});
