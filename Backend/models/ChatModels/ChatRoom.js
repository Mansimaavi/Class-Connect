import mongoose from "mongoose";

const ChatRoomSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    }, // Trim extra spaces

    description: { 
      type: String, 
      default: "" 
    },

    members: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
      }
    ], // Users in the chat

    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Creator of chat

    isGroup: { 
      type: Boolean, 
      default: true 
    }, // True for group chats, false for direct messages

    messages: [
      { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Message" 
      }
    ], // ✅ Array to store messages related to the chat room

    lastMessage: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Message", 
      default: null 
    }, // Store the last message for faster access

    isActive: { 
      type: Boolean, 
      default: true 
    }, // Active status for future scalability

  },
  { timestamps: true }
);

// 🔹 Index for faster query performance
ChatRoomSchema.index({ name: 1 });
ChatRoomSchema.index({ createdBy: 1 });

export default mongoose.model("ChatRoom", ChatRoomSchema);

  