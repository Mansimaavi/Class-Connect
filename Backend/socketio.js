import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000"; 
export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: false,
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export const sendMessageSocket = (messageData) => {
  socket.emit("sendMessage", messageData);
};

export const listenForMessages = (callback) => {
  socket.on("newMessage", callback);
};

export const stopListeningForMessages = () => {
  socket.off("newMessage");
};
export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("sendMessage", async ({ chatRoomId, sender, text }) => {
      try {
        // ✅ Save message in MongoDB
        const chatRoom = await ChatRoom.findById(chatRoomId);
        if (!chatRoom) return;

        const newMessage = { sender, text, timestamp: new Date() };
        chatRoom.messages.push(newMessage);
        await chatRoom.save(); // 🔴 Ensure message is saved in MongoDB

        // ✅ Emit real-time event to all users in the room
        io.to(chatRoomId).emit("newMessage", newMessage);
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};






