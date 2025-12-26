import express from "express";
import { ratePdf, getClassNotes, uploadClassNote, submitReview } from "../Controllers/ClassNotesController/classNoteController.js";
import AuthMiddleware from "../middleware/authMiddleware.js";
import uploadPdf from "../middleware/multerMiddleware.js";

const router = express.Router();

router.get("/", getClassNotes);
router.post("/upload", AuthMiddleware, uploadPdf, uploadClassNote);
router.post("/rate", AuthMiddleware, ratePdf);
router.post("/reviews/submit-review", AuthMiddleware, submitReview);

export default router;
