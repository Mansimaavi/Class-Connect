import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const announcementSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    pinned: { type: Boolean, default: false },
    dueDate: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

// Pinned first, newest first: matches the default listing order.
announcementSchema.index({ classroom: 1, pinned: -1, createdAt: -1 });

const Announcement =
  mongoose.models.Announcement || mongoose.model("Announcement", announcementSchema);

export default Announcement;
