import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, trim: true, maxlength: 5000, default: "" },
    photoUrl: { type: String, default: null },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      virtuals: true,
      transform(_doc, ret) {
        delete ret.id;
        return ret;
      },
    },
  }
);

answerSchema.virtual("likes").get(function likes() {
  return this.likedBy?.length ?? 0;
});

answerSchema.virtual("dislikes").get(function dislikes() {
  return this.dislikedBy?.length ?? 0;
});

const Answer = mongoose.models.Answer || mongoose.model("Answer", answerSchema);

export default Answer;
