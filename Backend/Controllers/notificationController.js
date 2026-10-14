import Notification from "../models/notification.js";
import ApiError from "../utils/ApiError.js";

/** GET /api/notifications?unreadOnly=&limit= */
export const listMyNotifications = async (req, res) => {
  const filter = { user: req.user._id };
  if (req.query.unreadOnly) filter.read = false;

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(req.query.limit).populate("actor", "name username").lean(),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ success: true, notifications, unreadCount });
};

/** PATCH /api/notifications/:notificationId/read */
export const markRead = async (req, res) => {
  const result = await Notification.updateOne(
    { _id: req.params.notificationId, user: req.user._id },
    { $set: { read: true } }
  );
  if (!result.matchedCount) throw ApiError.notFound("Notification");
  res.json({ success: true });
};

/** PATCH /api/notifications/read-all */
export const markAllRead = async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true, updated: result.modifiedCount });
};
