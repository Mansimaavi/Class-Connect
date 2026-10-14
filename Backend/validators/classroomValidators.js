import { z } from "zod";
import { CLASSROOM_ROLES } from "../config/permissions.js";
import { idParams, objectId, paginationQuery, trimmed } from "./common.js";

const joinCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,12}$/, "Join code must be 6-12 letters or numbers");

export const classroomParams = idParams("classroomId");
export const memberParams = idParams("classroomId", "userId");
export const resourceParams = idParams("classroomId", "resourceId");
export const announcementParams = idParams("classroomId", "announcementId");
export const commentParams = idParams("classroomId", "announcementId", "commentId");
export const messageParams = idParams("classroomId", "messageId");
export const pollParams = idParams("classroomId", "pollId");

export const listClassroomsQuery = z.object({
  scope: z.enum(["all", "owned", "joined"]).default("all"),
});

export const createClassroomSchema = z.object({
  name: trimmed(1, 100, "Classroom name"),
  subject: trimmed(1, 100, "Subject"),
  description: z.string().trim().max(1000).optional().default(""),
  joinCode: joinCode.optional(),
});

export const updateClassroomSchema = z
  .object({
    name: trimmed(1, 100, "Classroom name").optional(),
    subject: trimmed(1, 100, "Subject").optional(),
    description: z.string().trim().max(1000).optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

// `key` is what the original frontend sent.
export const joinClassroomSchema = z
  .object({ joinCode: joinCode.optional(), key: joinCode.optional() })
  .refine((data) => data.joinCode || data.key, { message: "Join code is required", path: ["joinCode"] })
  .transform((data) => ({ joinCode: data.joinCode || data.key }));

export const updateMemberRoleSchema = z.object({
  role: z.enum([CLASSROOM_ROLES.STUDENT, CLASSROOM_ROLES.TEACHER], { error: "Role must be student or teacher" }),
});

export const progressSchema = z.object({ completed: z.boolean({ error: "completed must be true or false" }) });

export const summarySchema = z.object({
  maxWords: z.coerce.number().int().min(30).max(600).default(150),
});

export const announcementListQuery = paginationQuery.extend({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createAnnouncementSchema = z.object({
  title: trimmed(1, 150, "Title"),
  body: trimmed(1, 5000, "Announcement"),
  pinned: z.boolean().optional().default(false),
  dueDate: z.coerce.date().nullable().optional(),
});

export const updateAnnouncementSchema = z
  .object({
    title: trimmed(1, 150, "Title").optional(),
    body: trimmed(1, 5000, "Announcement").optional(),
    pinned: z.boolean().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nothing to update" });

export const commentSchema = z.object({ text: trimmed(1, 1000, "Comment") });

export const messageListQuery = z.object({
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const sendMessageSchema = z.object({ text: trimmed(1, 2000, "Message") });

export const bulkDeleteSchema = z.object({
  messageIds: z.array(objectId("message id")).min(1, "Select at least one message").max(100),
});

export const createPollSchema = z.object({
  question: trimmed(1, 300, "Question"),
  options: z
    .array(z.string().trim().max(200))
    .transform((options) => options.filter(Boolean))
    .pipe(z.array(z.string()).min(2, "Add at least two options").max(10, "A poll can have at most 10 options")),
});

export const voteSchema = z.object({ optionIndex: z.coerce.number().int().min(0).max(9) });
