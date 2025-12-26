import mongoose from 'mongoose';

const classNoteSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  path: { type: String, required: true, trim: true },
  topic: { type: String, trim: true },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  ratings: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      rating: { type: Number, min: 1, max: 5 }
    }
  ],
  reviews: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      review: String,
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

const ClassNote = mongoose.model('ClassNote', classNoteSchema);
export default ClassNote;
