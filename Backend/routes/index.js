import express from "express";
import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import classNotesRoutes from "./classNotesRoutes.js";
import classroomRoutes from "./classroomRoutes.js";
import { answerRouter, questionRouter } from "./discussionRoutes.js";
import healthRoutes from "./healthRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import userRoutes from "./userRoutes.js";
import whiteboardRoutes from "./whiteboardRoutes.js";

const router = express.Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/classrooms", classroomRoutes);
router.use("/class-notes", classNotesRoutes);
router.use("/questions", questionRouter);
router.use("/answers", answerRouter);
router.use("/notifications", notificationRoutes);
router.use("/whiteboards", whiteboardRoutes);
router.use("/admin", adminRoutes);

export default router;
