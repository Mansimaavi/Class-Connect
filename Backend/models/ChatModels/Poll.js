import mongoose from "mongoose";

const pollSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [
    {
      text: String,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Poll", pollSchema);
