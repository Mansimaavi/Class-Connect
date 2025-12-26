import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./utils/Database.js";
import authRouter from "./routes/authRoutes.js";
import folderRouter from "./routes/folderRoutes.js";
import pdfRoute from "./routes/pdfRoutes.js";
import questionRouter from "./routes/questionRoutes.js";
import answerRouter from "./routes/answerRoutes.js";
import chatRoom from "./routes/chatRoutes.js";
import ChatRoom from "./models/ChatModels/ChatRoom.js";
import whiteboardRoutes from './routes/whiteboardRoutes.js';
import notificationsRoutes from "./routes/notification.js";
import stats from './routes/statRoute.js';
import adminRoutes from "./routes/adminRoutes.js";
import classNotesRouter from "./routes/classNotesRoutes.js";
import summarizeRoutes from "./routes/summarizeRoute.js";
import profile from "./routes/userRoute.js";
// import { initWhiteboardSocket } from "./Controllers/whiteboardController.js";
import progressRouter from "./routes/progressRoutes.js";


const app = express();
const server = http.createServer(app);

// ✅ Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.set("io", io);

// Initialize all socket events
// initWhiteboardSocket(io);

app.use((req, res, next) => {
  req.io = io;
  next();
});

connectDB();
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));

app.get("/", (req, res) => {
  res.send("Backend is working");
});

// ✅ Socket.io Events
io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId, userId }) => {
    socket.join(roomId);
    console.log(`User ${userId} joined room ${roomId}`);
  });
  socket.on("send_message", ({ chatRoom, sender, text }) => {
    if (!chatRoom) return;
    io.to(chatRoom).emit("receive_message", { sender, text });
  });
  socket.on("add_member", async ({ chatRoom, userId, newMember }) => {
    try {
      const room = await ChatRoom.findById(chatRoom);
      if (!room) {
        socket.emit("member_added", { success: false, message: "Chat room not found." });
        return;
      }

      if (room.members.includes(newMember)) {
        socket.emit("member_added", { success: false, message: "Member already in room." });
        return;
      }

      room.members.push(newMember);
      await room.save();

      socket.emit("member_added", { success: true, message: "Member added successfully!" });
      io.to(chatRoom).emit("member_added", { success: true });
    } catch (error) {
      socket.emit("member_added", { success: false, message: "Error adding member." });
    }
  });

  socket.on("disconnect", () => {
    // console.log("User disconnected:", socket.id);
  });
});


// ✅ API Routes
app.use("/api/auth", authRouter);
app.use("/api/folders", folderRouter);
app.use("/api/pdfProgress", progressRouter); 
app.use("/api/pdfs", pdfRoute);
app.use("/api/chat", chatRoom);
app.use("/api/answers", answerRouter);
app.use("/api/questions", questionRouter);
app.use('/api/whiteboard', whiteboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/stat", stats);
app.use("/api/profile", profile);
app.use("/api/class-notes", classNotesRouter);
app.use("/api", summarizeRoutes);


// ✅ Start Server
export const emitUserRegistered = (userName) => {
  io.emit('user-registered', { message: `New user registered: ${userName}` });
};

export const emitFileUploaded = (fileName) => {
  io.emit('file-uploaded', { message: `A new file (${fileName}) has been uploaded.` });
};

export const emitFileDownloaded = (fileName) => {
  io.emit('file-downloaded', { message: `⬇️ ${fileName} has been downloaded.` });
};
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(` Server is running on port ${port}`);
});
export { io };
