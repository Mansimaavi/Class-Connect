import Whiteboard from "../../models/whiteboard.js";
import { canAccessWhiteboard } from "../../services/whiteboardService.js";
import logger from "../../utils/logger.js";
import { rooms } from "../emitter.js";

const ELEMENT_TYPES = new Set(["draw", "text", "rectangle", "circle", "line", "fill"]);
const MAX_ELEMENT_BYTES = 4_000;
const FLUSH_DELAY_MS = 1_000;

// Freehand drawing produces many tiny segments, so writes are batched per room
// instead of hitting MongoDB once per mouse move.
const pending = new Map();

const flush = async (roomId) => {
  const batch = pending.get(roomId);
  pending.delete(roomId);
  if (!batch?.elements.length) return;
  try {
    await Whiteboard.updateOne(
      { roomId },
      { $push: { elements: { $each: batch.elements, $slice: -Whiteboard.MAX_ELEMENTS } }, $set: { updatedBy: batch.userId } },
      { upsert: true }
    );
  } catch (error) {
    logger.error({ err: error, roomId }, "failed to save whiteboard elements");
  }
};

const queue = (roomId, element, userId) => {
  const batch = pending.get(roomId) ?? { elements: [], userId, timer: null };
  batch.elements.push(element);
  batch.userId = userId;
  if (!batch.timer) batch.timer = setTimeout(() => flush(roomId), FLUSH_DELAY_MS);
  pending.set(roomId, batch);
};

const discardPending = (roomId) => {
  const batch = pending.get(roomId);
  if (batch?.timer) clearTimeout(batch.timer);
  pending.delete(roomId);
};

/** Flushes everything (called on shutdown). */
export const flushAllWhiteboards = async () => {
  const roomIds = [...pending.keys()];
  for (const roomId of roomIds) clearTimeout(pending.get(roomId)?.timer);
  await Promise.all(roomIds.map(flush));
};

const isValidElement = (element) =>
  element &&
  typeof element === "object" &&
  ELEMENT_TYPES.has(element.type) &&
  JSON.stringify(element).length <= MAX_ELEMENT_BYTES;

export const registerWhiteboardHandlers = (_io, socket) => {
  const { user } = socket.data;
  const joined = new Set();

  socket.on("whiteboard:join", async (roomId, ack) => {
    const reply = typeof ack === "function" ? ack : () => {};
    try {
      if (!(await canAccessWhiteboard(user, roomId))) return reply({ ok: false, error: "No access to this whiteboard" });
      joined.add(roomId);
      socket.join(rooms.whiteboard(roomId));
      return reply({ ok: true });
    } catch {
      return reply({ ok: false, error: "Could not open the whiteboard" });
    }
  });

  socket.on("whiteboard:leave", (roomId) => {
    joined.delete(roomId);
    socket.leave(rooms.whiteboard(roomId));
  });

  socket.on("whiteboard:element", (payload) => {
    const roomId = payload?.roomId;
    const element = payload?.element;
    if (!joined.has(roomId) || !isValidElement(element)) return;
    socket.to(rooms.whiteboard(roomId)).emit("whiteboard:element", { roomId, element, userId: user._id });
    queue(roomId, element, user._id);
  });

  socket.on("whiteboard:clear", async (payload) => {
    const roomId = payload?.roomId;
    if (!joined.has(roomId)) return;
    discardPending(roomId);
    socket.to(rooms.whiteboard(roomId)).emit("whiteboard:cleared", { roomId, userId: user._id });
    try {
      await Whiteboard.updateOne({ roomId }, { $set: { elements: [], updatedBy: user._id } }, { upsert: true });
    } catch (error) {
      logger.error({ err: error, roomId }, "failed to clear whiteboard");
    }
  });
};
