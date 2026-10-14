import { PERMISSIONS } from "../../config/permissions.js";
import { hasClassroomPermission } from "../../middleware/rbac.js";
import Message from "../../models/message.js";
import { emitToClassroom } from "../../socket/emitter.js";
import ApiError from "../../utils/ApiError.js";

const SENDER_FIELDS = "name username avatarUrl";

/**
 * GET /api/classrooms/:classroomId/messages?before=<date>&limit=50
 * Returns messages oldest-first. Pass the oldest `createdAt` you have as
 * `before` to page further back.
 */
export const listMessages = async (req, res) => {
  const { before, limit } = req.query;
  const filter = { classroom: req.classroom._id };
  if (before) filter.createdAt = { $lt: before };

  const page = await Message.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate("sender", SENDER_FIELDS)
    .lean();

  const hasMore = page.length > limit;
  const messages = page.slice(0, limit).reverse();
  res.json({ success: true, messages, hasMore });
};

/** POST /api/classrooms/:classroomId/messages */
export const sendMessage = async (req, res) => {
  const classroomId = req.classroom._id;
  const message = await Message.create({
    classroom: classroomId,
    sender: req.user._id,
    text: req.body.text,
    seenBy: [req.user._id],
  });
  await message.populate("sender", SENDER_FIELDS);

  emitToClassroom(classroomId, "message:new", { classroomId, message });
  res.status(201).json({ success: true, message });
};

const findMessage = async (req) => {
  const message = await Message.findOne({ _id: req.params.messageId, classroom: req.classroom._id });
  if (!message) throw ApiError.notFound("Message");
  return message;
};

/** PATCH /api/classrooms/:classroomId/messages/:messageId — sender only. */
export const editMessage = async (req, res) => {
  const message = await findMessage(req);
  if (!message.sender.equals(req.user._id)) {
    throw ApiError.forbidden("You can only edit your own messages");
  }

  message.text = req.body.text;
  message.editedAt = new Date();
  await message.save();
  await message.populate("sender", SENDER_FIELDS);

  emitToClassroom(req.classroom._id, "message:updated", { classroomId: req.classroom._id, message });
  res.json({ success: true, message });
};

/** DELETE /api/classrooms/:classroomId/messages/:messageId — sender or a teacher. */
export const deleteMessage = async (req, res) => {
  const message = await findMessage(req);
  const isSender = message.sender.equals(req.user._id);
  if (!isSender && !hasClassroomPermission(req, PERMISSIONS.MESSAGE_MODERATE)) {
    throw ApiError.forbidden("You can only delete your own messages");
  }

  await message.deleteOne();
  emitToClassroom(req.classroom._id, "message:deleted", {
    classroomId: req.classroom._id,
    messageIds: [message._id],
  });
  res.json({ success: true, message: "Message deleted" });
};

/** POST /api/classrooms/:classroomId/messages/bulk-delete — own messages (or any, for teachers). */
export const bulkDeleteMessages = async (req, res) => {
  const filter = { classroom: req.classroom._id, _id: { $in: req.body.messageIds } };
  if (!hasClassroomPermission(req, PERMISSIONS.MESSAGE_MODERATE)) filter.sender = req.user._id;

  const deletable = await Message.find(filter).select("_id").lean();
  const ids = deletable.map((doc) => doc._id);
  if (ids.length) await Message.deleteMany({ _id: { $in: ids } });

  emitToClassroom(req.classroom._id, "message:deleted", { classroomId: req.classroom._id, messageIds: ids });
  res.json({
    success: true,
    deletedCount: ids.length,
    skippedCount: req.body.messageIds.length - ids.length,
    messageIds: ids,
  });
};

/** POST /api/classrooms/:classroomId/messages/seen — marks everything as read by the caller. */
export const markMessagesSeen = async (req, res) => {
  const result = await Message.updateMany(
    { classroom: req.classroom._id, seenBy: { $ne: req.user._id } },
    { $addToSet: { seenBy: req.user._id } }
  );
  if (result.modifiedCount > 0) {
    emitToClassroom(req.classroom._id, "messages:seen", {
      classroomId: req.classroom._id,
      userId: req.user._id,
      name: req.user.name,
    });
  }
  res.json({ success: true, updated: result.modifiedCount });
};
