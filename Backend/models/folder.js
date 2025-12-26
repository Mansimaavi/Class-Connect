import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    uniqueKey: { type: String, unique: true, required: true },
    // description: { type: String, default: "" ,required: true},
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], 
    pdfs: [
      {
        name: { type: String, required: true },
        path: { type: String, required: true }, // Cloudinary URL
        createdAt: { type: Date, default: Date.now },
        downloadedBy: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            date: { type: Date, default: Date.now },
          },
        ],
        progressByUser: [
          {
            user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            completed: { type: Boolean, default: false }, 
            updatedAt: { type: Date, default: Date.now },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

const Folder = mongoose.model('Folder', folderSchema);
export default Folder;
