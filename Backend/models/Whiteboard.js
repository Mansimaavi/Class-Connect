import mongoose from 'mongoose';

const whiteboardSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  elements: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

whiteboardSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Whiteboard', whiteboardSchema);