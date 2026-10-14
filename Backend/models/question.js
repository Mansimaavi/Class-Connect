import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    details: { type: String, trim: true, maxlength: 5000, default: "" },
    imageUrl: { type: String, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    answerCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

questionSchema.index({ createdAt: -1 });
questionSchema.index({ title: "text", details: "text" });

const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);

export default Question;
