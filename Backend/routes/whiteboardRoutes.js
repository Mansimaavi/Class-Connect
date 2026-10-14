import express from "express";
import { getWhiteboard, saveWhiteboard } from "../Controllers/whiteboardController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { saveWhiteboardSchema, whiteboardParams } from "../validators/contentValidators.js";

const router = express.Router();

router.use(authenticate);

router.get("/:roomId", validate({ params: whiteboardParams }), getWhiteboard);
router.put("/:roomId", validate({ params: whiteboardParams, body: saveWhiteboardSchema }), saveWhiteboard);

export default router;
