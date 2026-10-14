import express from "express";
import {
  addReview,
  deleteNote,
  listNotes,
  rateNote,
  recordView,
  uploadNote,
} from "../Controllers/classNotesController/classNoteController.js";
import { PERMISSIONS as P } from "../config/permissions.js";
import { authenticate, optionalAuth } from "../middleware/authMiddleware.js";
import { pickUploadedFile, uploadDocument } from "../middleware/multerMiddleware.js";
import { uploadLimiter } from "../middleware/rateLimiters.js";
import { requirePermission } from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import {
  listNotesQuery,
  noteParams,
  rateNoteSchema,
  reviewNoteSchema,
  uploadNoteSchema,
} from "../validators/contentValidators.js";

const router = express.Router();

router.get("/", optionalAuth, validate({ query: listNotesQuery }), listNotes);
router.post(
  "/",
  authenticate,
  requirePermission(P.NOTE_UPLOAD),
  uploadLimiter,
  uploadDocument,
  pickUploadedFile,
  validate({ body: uploadNoteSchema }),
  uploadNote
);
router.post("/:noteId/view", validate({ params: noteParams }), recordView);
router.post("/:noteId/rating", authenticate, validate({ params: noteParams, body: rateNoteSchema }), rateNote);
router.post("/:noteId/reviews", authenticate, validate({ params: noteParams, body: reviewNoteSchema }), addReview);
router.delete("/:noteId", authenticate, validate({ params: noteParams }), deleteNote);

export default router;
