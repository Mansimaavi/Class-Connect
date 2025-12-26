import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true }, // Ensure text is stored as UTF-8
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true, collation: { locale: "en", strength: 2 } }  // Ensures UTF-8 support
);
const Message = mongoose.model("Message", MessageSchema);
export default Message;