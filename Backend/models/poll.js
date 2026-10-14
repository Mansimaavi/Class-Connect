import mongoose from "mongoose";

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    votes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { _id: false }
);

const pollSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true, trim: true, maxlength: 300 },
    options: {
      type: [optionSchema],
      validate: {
        validator: (options) => options.length >= 2 && options.length <= 10,
        message: "A poll needs between 2 and 10 options",
      },
    },
    closed: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

pollSchema.index({ classroom: 1, createdAt: -1 });

const Poll = mongoose.models.Poll || mongoose.model("Poll", pollSchema);

export default Poll;
