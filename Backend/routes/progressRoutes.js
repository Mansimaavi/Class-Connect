import express from "express";
import AuthMiddleware from "../middleware/authMiddleware.js";
import {
  getFolderWithUserProgress,
  updateUserProgress
} from "../Controllers/Pdf&FolderController/progressController.js";

const router = express.Router();

router.get("/:folderId/user-progress", AuthMiddleware, getFolderWithUserProgress);
router.patch("/:folderId/:pdfId/progress", AuthMiddleware, updateUserProgress);

export default router;



