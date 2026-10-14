import Notification from "../models/notification.js";
import logger from "../utils/logger.js";
import { emitToAdmins, emitToUsers } from "../socket/emitter.js";

/**
 * Stores a notification for each recipient and pushes it to their open
 * sockets. Failures are logged, never thrown: a missed notification should not
 * fail the request that triggered it.
 */
export const notifyUsers = async (userIds, { type, title, message, link, classroom, actor }) => {
  const actorId = actor?.toString();
  const recipients = [...new Set(userIds.map((id) => id.toString()))].filter((id) => id !== actorId);
  if (!recipients.length) return [];

  try {
    const docs = await Notification.insertMany(
      recipients.map((user) => ({ audience: "user", user, type, title, message, link, classroom, actor }))
    );
    for (const doc of docs) {
      emitToUsers([doc.user], "notification:new", doc.toJSON());
    }
    return docs;
  } catch (error) {
    logger.error({ err: error, type }, "failed to create notifications");
    return [];
  }
};

/** Adds an entry to the admin dashboard's live activity feed. */
export const notifyAdmins = async ({ type, title, message, actor }) => {
  try {
    const doc = await Notification.create({ audience: "admin", type, title, message, actor });
    emitToAdmins("admin:activity", doc.toJSON());
    return doc;
  } catch (error) {
    logger.error({ err: error, type }, "failed to create admin notification");
    return null;
  }
};
