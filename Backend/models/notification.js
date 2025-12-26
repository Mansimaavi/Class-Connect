import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    type: { type: String, required: true }, 
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now,expires: 300 }
});

export default mongoose.model("Notification", notificationSchema);
