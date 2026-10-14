import mongoose from "mongoose";

const MAX_ELEMENTS = 5000;

const whiteboardSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, trim: true, maxlength: 100 },
    elements: { type: [mongoose.Schema.Types.Mixed], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

whiteboardSchema.statics.MAX_ELEMENTS = MAX_ELEMENTS;

const Whiteboard = mongoose.models.Whiteboard || mongoose.model("Whiteboard", whiteboardSchema);

export default Whiteboard;
