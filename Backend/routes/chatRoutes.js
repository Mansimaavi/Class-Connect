import express from "express";
import {
  createPoll,
  votePoll,
  getPollsByFolder,
  deletePoll,
  unvotePoll
} from "../Controllers/ChatController/pollController.js"; 
import {
  sendMessage,
  getMessages,
  markMessagesAsSeen,
  deleteMessage,
  deleteChatRoom,
  getAllChatRooms,
  saveMessages,
  editMessage ,
  deleteSelectedMessages
} from "../Controllers/ChatController/chatController.js";
import {AuthMiddleware} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/messages/:folderId", AuthMiddleware, sendMessage);
router.put("/messages/:messageId", AuthMiddleware, editMessage);
router.get("/messages/:folderId", AuthMiddleware, getMessages);
router.put("/messages/seen/:folderId", AuthMiddleware, markMessagesAsSeen);
router.delete("/messages/:messageId", AuthMiddleware, deleteMessage);
router.delete("/rooms/:folderId", AuthMiddleware, deleteChatRoom);
router.get("/rooms/:folderId", AuthMiddleware,getAllChatRooms);
router.post("/messages/:folderId", AuthMiddleware,saveMessages);
router.post("/messages/:folderId/delete-bulk", AuthMiddleware, deleteSelectedMessages);
router.post("/polls/:folderId", AuthMiddleware, createPoll);
router.post("/polls/vote/:pollId", AuthMiddleware, votePoll);
router.get("/polls/:folderId", AuthMiddleware, getPollsByFolder);
router.delete("/polls/:pollId", AuthMiddleware, deletePoll);
router.post("/polls/unvote/:pollId", AuthMiddleware, unvotePoll);


export default router;
