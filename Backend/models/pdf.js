import mongoose from 'mongoose';
const pdfSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', required: false },
    path: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    ratings: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        rating: { type: Number, required: true },
      },
    ],
    progressByUser: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        completed: { type: Boolean, default: false },
        updatedAt: { type: Date, default: Date.now }
      },
    ],
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
const Pdf = mongoose.model('Pdf', pdfSchema);
export default Pdf;




