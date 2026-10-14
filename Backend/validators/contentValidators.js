import { z } from "zod";
import { escapeRegex, idParams, paginationQuery, trimmed } from "./common.js";

const searchTerm = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((value) => (value ? escapeRegex(value) : undefined));

// --- class notes ------------------------------------------------------------
export const noteParams = idParams("noteId");

export const listNotesQuery = paginationQuery.extend({
  search: searchTerm,
  subject: z.string().trim().max(100).optional(),
  sort: z.enum(["recent", "rating", "popular"]).default("recent"),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

export const uploadNoteSchema = z.object({
  title: z.string().trim().max(255).optional(),
  topic: trimmed(1, 100, "Topic"),
  subject: z.string().trim().max(100).optional().default("General"),
});

export const rateNoteSchema = z.object({
  rating: z.coerce.number().int().min(1, "Rating must be 1-5").max(5, "Rating must be 1-5"),
});

export const reviewNoteSchema = z.object({
  text: trimmed(1, 1000, "Review"),
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

// --- discussion ---------------------------------------------------------------
export const questionParams = idParams("questionId");
export const answerParams = idParams("answerId");

export const listQuestionsQuery = paginationQuery.extend({ search: searchTerm });

export const createQuestionSchema = z.object({
  title: trimmed(5, 300, "Question"),
  details: z.string().trim().max(5000).optional().default(""),
  imageUrl: z.url("Image must be a valid URL").max(500).nullable().optional(),
});

export const createAnswerSchema = z
  .object({
    text: z.string().trim().max(5000).optional().default(""),
    photoUrl: z.url("Photo must be a valid URL").max(500).nullable().optional(),
  })
  .refine((data) => data.text || data.photoUrl, { message: "Write an answer or attach a photo", path: ["text"] });

export const reactionSchema = z.object({ type: z.enum(["like", "dislike"]) });

// --- notifications --------------------------------------------------------------
export const notificationParams = idParams("notificationId");

export const listNotificationsQuery = z.object({
  unreadOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// --- whiteboard -----------------------------------------------------------------
export const whiteboardParams = z.object({
  roomId: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{1,100}$/, "Invalid whiteboard id"),
});

export const saveWhiteboardSchema = z.object({
  elements: z.array(z.record(z.string(), z.unknown())).max(5000, "Whiteboard is too large to save"),
});
