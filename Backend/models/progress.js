import mongoose from "mongoose";

// Per-user completion state for a classroom resource. Kept in its own
// collection so progress doesn't bloat the classroom or resource documents.
const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true },
    resource: { type: mongoose.Schema.Types.ObjectId, ref: "Resource", required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

progressSchema.index({ user: 1, resource: 1 }, { unique: true });
progressSchema.index({ classroom: 1, user: 1 });

const Progress = mongoose.models.Progress || mongoose.model("Progress", progressSchema);

export default Progress;
