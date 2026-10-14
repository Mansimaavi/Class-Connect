import Whiteboard from "../models/whiteboard.js";
import { canAccessWhiteboard } from "../services/whiteboardService.js";
import { emitToWhiteboard } from "../socket/emitter.js";
import ApiError from "../utils/ApiError.js";

const assertAccess = async (req) => {
  if (!(await canAccessWhiteboard(req.user, req.params.roomId))) {
    throw ApiError.forbidden("You don't have access to this whiteboard");
  }
};

/** GET /api/whiteboards/:roomId */
export const getWhiteboard = async (req, res) => {
  await assertAccess(req);
  const board = await Whiteboard.findOne({ roomId: req.params.roomId }).lean();
  res.json({ success: true, roomId: req.params.roomId, elements: board?.elements ?? [], updatedAt: board?.updatedAt ?? null });
};

/** PUT /api/whiteboards/:roomId — replaces the saved drawing (used for undo/redo and clear). */
export const saveWhiteboard = async (req, res) => {
  await assertAccess(req);
  const board = await Whiteboard.findOneAndUpdate(
    { roomId: req.params.roomId },
    { $set: { elements: req.body.elements, updatedBy: req.user._id } },
    { upsert: true, new: true }
  );
  emitToWhiteboard(req.params.roomId, "whiteboard:replaced", { roomId: req.params.roomId, elements: board.elements });
  res.json({ success: true, roomId: board.roomId, elements: board.elements, updatedAt: board.updatedAt });
};
