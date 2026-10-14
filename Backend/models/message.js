import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    editedAt: { type: Date, default: null },
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

messageSchema.index({ classroom: 1, createdAt: -1 });

const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;
