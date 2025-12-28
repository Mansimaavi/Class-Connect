import axios from "axios";
import { socket } from "./socket"; // Import WebSocket connection

const API_BASE_URL = "http://localhost:5000/api/chat"; // Change to your backend URL

// ✅ Create a Chat Room (REST API)
export const createChatRoom = async (roomData, token) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/rooms`, roomData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error creating chat room:", error.response?.data || error);
    throw error;
  }
};

// ✅ Fetch All Chat Rooms (REST API)
export const getAllChatRooms = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching chat rooms:", error.response?.data || error);
    throw error;
  }
};

// ✅ Fetch Messages from a Chat Room (REST API)
export const getMessages = async (chatRoomId, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/messages/${chatRoomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching messages:", error.response?.data || error);
    throw error;
  }
};

// ✅ Send a Message (REST + WebSockets)
export const sendMessage = async (messageData, token) => {
    try {
      // ✅ Save message in MongoDB first
      const response = await axios.post(`${API_BASE_URL}/messages`, messageData, {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      // ✅ Emit real-time event after saving
      socket.emit("newMessage", response.data);
  
      return response.data;
    } catch (error) {
      console.error("Error sending message:", error.response?.data || error);
      throw error;
    }
  };
  

// ✅ Listen for New Messages via WebSockets
export const listenForMessages = (callback) => {
  socket.on("newMessage", callback);
};

// ✅ Stop Listening to Messages
export const stopListeningForMessages = () => {
  socket.off("newMessage");
};
