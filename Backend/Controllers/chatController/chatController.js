import ChatRoom from "../../models/ChatModels/ChatRoom.js";
import Message from "../../models/ChatModels/Message.js";
import Folder from "../../models/Folder.js";

export const sendMessage = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: No user found in request" });
    }

    const { folderId, text } = req.body;
    console.log("📂 Chat Folder ID:", folderId);
    console.log("👤 Chat Sender ID:", req.user._id);

    if (!folderId || !text) {
      return res.status(400).json({ message: "Folder ID and text are required." });
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found." });
    }

    if (!folder.members.includes(req.user._id.toString())) {
      return res.status(403).json({ message: "Access denied to this folder." });
    }

    // ✅ Ensure `messages` is an array
    if (!Array.isArray(folder.messages)) {
      folder.messages = [];
    }

    const message = new Message({
      folder: folderId,
      sender: req.user._id,
      text,
      seenBy: [req.user._id],
    });

    await message.save();
    folder.messages.push(message._id);
    await folder.save();

    // ✅ Ensure `req.io` exists before emitting
    if (req.io) {
      req.io.to(folderId).emit("newMessage", { message });
    } else {
      console.error("❌ Socket.io instance is missing in request.");
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
};

// ✅ Fetch Messages from Folder (Exclude sender from seenBy)
export const getMessages = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user._id;
    // Check if user is a folder member
    const folder = await Folder.findById(folderId);
    if (!folder || !folder.members.includes(userId.toString())) {
      return res.status(403).json({ message: "Access denied to this folder." });
    }

    let messages = await Message.find({ folder: folderId })
      .populate("sender", "name _id")
      .populate("seenBy", "name _id");

    // Filter seenBy to exclude sender
    messages = messages.map((msg) => ({
      ...msg.toObject(),
      seenBy: msg.seenBy.filter(user => user._id.toString() !== msg.sender._id.toString())
    }));

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages", error: error.message });
  }
};
export const markMessagesAsSeen = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user._id;

    const updatedMessages = await Message.updateMany(
      { folder: folderId, seenBy: { $ne: userId } },
      { $addToSet: { seenBy: userId } }
    );

    if (updatedMessages.nModified > 0) {
      const updatedMessagesList = await Message.find({ folder: folderId })
        .populate("sender", "name _id")
        .populate("seenBy", "name _id");

      // Emit updated seen status to all users in the room
      req.io.to(folderId).emit("messages_seen", { folderId, messages: updatedMessagesList });
    }

    res.status(200).json({ message: "Messages marked as seen." });
  } catch (error) {
    console.error("Error updating seen status:", error);
    res.status(500).json({ message: "Error updating seen status", error });
  }
};

// ✅ Delete a Message (Only sender can delete)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Only sender can delete
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this message" });
    }

    await Message.findByIdAndDelete(messageId);
    res.json({ message: "Message deleted successfully" });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// controllers/chatcontroller.js

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    // Check if the logged-in user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to edit this message" });
    }

    message.text = text;
    await message.save();
    res.json(message);
  } catch (err) {
    console.error("Edit message error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete a Chat Room (Only admin can delete)
export const deleteChatRoom = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const userId = req.user._id;

    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
      return res.status(404).json({ message: "Chat room not found." });
    }

    if (chatRoom.createdBy.toString() !== userId) {
      return res.status(403).json({ message: "Unauthorized to delete this chat room." });
    }

    await Message.deleteMany({ chatRoom: chatRoomId });
    await ChatRoom.findByIdAndDelete(chatRoomId);

    res.status(200).json({ message: "Chat room deleted successfully." });
  } catch (error) {
    console.error("Error deleting chat room:", error);
    res.status(500).json({ message: "Error deleting chat room", error });
  }
};

// ✅ Fetch All Chat Rooms
export const getAllChatRooms = async (req, res) => {
  try {
    const chatRooms = await ChatRoom.find()
      .populate("members", "name")
      .populate("createdBy", "name");

    if (chatRooms.length === 0) {
      return res.status(404).json({ message: "No chat rooms found." });
    }

    res.status(200).json(chatRooms);
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    res.status(500).json({ message: "Error fetching chat rooms", error });
  }
};

// ✅ Save a Message
export const saveMessages = async (req, res) => {
  try {
    const { folderId, sender, content } = req.body;

    if (!folderId || !sender || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }

    const newMessage = new Message({
      folder: folderId,
      sender,
      text: content,
      seenBy: [sender], // Add sender to seenBy array initially
    });

    await newMessage.save();

    folder.messages.push(newMessage._id);
    await folder.save();

    res.status(201).json({ message: "Message saved successfully", data: newMessage });
  } catch (error) {
    console.error("Error saving message:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};


export const deleteSelectedMessages = async (req, res) => {
  console.log("🛠 Incoming DELETE request"); // Check if request reaches backend
  console.log("📩 Request Body:", req.body); // Log incoming request data

  try {
    const { messageIds, folderId } = req.body;

    if (!messageIds || !folderId) {
      console.log("❌ Missing required fields:", { messageIds, folderId });
      return res.status(400).json({ message: "Message IDs and Folder ID are required" });
    }

    await Message.deleteMany({ _id: { $in: messageIds }, folder: folderId });

    res.status(200).json({ message: "Selected messages deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting messages:", error);
    res.status(500).json({ message: "Error deleting messages", error });
  }
};
