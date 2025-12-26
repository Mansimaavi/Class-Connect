import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  questionName: {
    type: String,
    required: true,
  },
  questionUrl: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  answers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Answers",
    },
  ],
});

export default mongoose.model("Questions", QuestionSchema);
