import mongoose from "mongoose";

export const NOTIFICATION_TYPES = Object.freeze([
  "announcement",
  "resource",
  "member_joined",
  "role_changed",
  "poll",
  "user_registered", // admin feed
  "system",
]);

const RETENTION_DAYS = 30;

// `audience: "user"` notifications belong to one user. `audience: "admin"`
// entries make up the live activity feed shown on the admin dashboard.
const notificationSchema = new mongoose.Schema(
  {
    audience: { type: String, enum: ["user", "admin"], default: "user" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 500 },
    link: { type: String, maxlength: 300 },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", default: null },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: RETENTION_DAYS * 24 * 60 * 60 },
  },
  { toJSON: { versionKey: false } }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ audience: 1, createdAt: -1 });

const Notification =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);

export default Notification;
