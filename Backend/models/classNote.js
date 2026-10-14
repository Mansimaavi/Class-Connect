import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    value: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Public notes anyone can browse, rate and review (the "Class Notes" hub).
const classNoteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 255 },
    topic: { type: String, required: true, trim: true, maxlength: 100 },
    subject: { type: String, trim: true, maxlength: 100, default: "General" },
    url: { type: String, required: true },
    publicId: { type: String },
    resourceType: { type: String, default: "raw" },
    mimeType: { type: String },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ratings: { type: [ratingSchema], default: [] },
    reviews: { type: [reviewSchema], default: [] },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

classNoteSchema.index({ subject: 1, createdAt: -1 });
classNoteSchema.index({ averageRating: -1 });
classNoteSchema.index({ title: "text", topic: "text", subject: "text" });

classNoteSchema.methods.setRating = function setRating(userId, value) {
  const existing = this.ratings.find((rating) => rating.user.toString() === userId.toString());
  if (existing) existing.value = value;
  else this.ratings.push({ user: userId, value });

  this.ratingCount = this.ratings.length;
  const total = this.ratings.reduce((sum, rating) => sum + rating.value, 0);
  this.averageRating = Math.round((total / this.ratingCount) * 10) / 10;
};

const ClassNote = mongoose.models.ClassNote || mongoose.model("ClassNote", classNoteSchema);

export default ClassNote;
