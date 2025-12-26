import express from "express";
import AuthMiddleware from "../middleware/authMiddleware.js";
import {
  createFolder,
  joinFolder,
  myfolders,
  deleteFolder,
  leaveFolder,
  getFolderById,
  getFolderMembers
} from "../Controllers/Pdf&FolderController/folderController.js"; 

const router = express.Router();

router.post("/create", AuthMiddleware, createFolder);      
router.post("/join", AuthMiddleware, joinFolder);              
router.get("/myfolders", AuthMiddleware, myfolders);            
router.delete("/deleteFolder/:folderId", AuthMiddleware, deleteFolder); 
router.post("/leaveFolder/:folderId", AuthMiddleware, leaveFolder);    
router.get("/:folderId", AuthMiddleware, getFolderById);       
router.get("/:folderId/members", AuthMiddleware, getFolderMembers);

export default router;



