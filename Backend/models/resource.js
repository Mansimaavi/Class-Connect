import mongoose from "mongoose";

// A file shared inside a classroom (PDF, slides, image). The file itself lives
// in Cloudinary; this document holds the metadata and access history.
const resourceSchema = new mongoose.Schema(
  {
    classroom: { type: mongoose.Schema.Types.ObjectId, ref: "Classroom", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 255 },
    url: { type: String, required: true },
    publicId: { type: String },
    resourceType: { type: String, default: "raw" }, // cloudinary resource_type, needed to delete
    mimeType: { type: String },
    size: { type: Number, default: 0 }, // bytes
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    downloadCount: { type: Number, default: 0 },
    downloadedBy: {
      type: [
        {
          _id: false,
          user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false,
    },
  },
  { timestamps: true, toJSON: { versionKey: false } }
);

resourceSchema.index({ classroom: 1, createdAt: -1 });

const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema);

export default Resource;
