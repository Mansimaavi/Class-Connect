import { Server } from "socket.io";
import env from "../config/env.js";
import { PERMISSIONS, roleHasPermission } from "../config/permissions.js";
import { resolveUserFromAccessToken } from "../middleware/authMiddleware.js";
import logger from "../utils/logger.js";
import { rooms, setIO } from "./emitter.js";
import { registerClassroomHandlers } from "./handlers/classroomHandlers.js";
import { registerWhiteboardHandlers } from "./handlers/whiteboardHandlers.js";

const handshakeToken = (socket) => {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === "string" && fromAuth) return fromAuth;
  const header = socket.handshake.headers?.authorization || "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
};

/**
 * Starts Socket.IO on the HTTP server. Every connection must present a valid
 * access token, the same as the REST API; the client reconnects with a fresh
 * token after it refreshes.
 */
export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
    maxHttpBufferSize: 1e6,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.use(async (socket, next) => {
    const token = handshakeToken(socket);
    if (!token) {
      const error = new Error("Authentication required");
      error.data = { code: "NO_TOKEN" };
      return next(error);
    }
    try {
      const { user } = await resolveUserFromAccessToken(token);
      socket.data.user = { _id: user._id.toString(), name: user.name, username: user.username, role: user.role };
      return next();
    } catch (err) {
      const error = new Error(err.message || "Authentication failed");
      error.data = { code: err.code || "INVALID_TOKEN" };
      return next(error);
    }
  });

  io.on("connection", (socket) => {
    const { user } = socket.data;
    socket.join(rooms.user(user._id));
    if (roleHasPermission(user.role, PERMISSIONS.STATS_READ)) socket.join(rooms.admins);

    registerClassroomHandlers(io, socket);
    registerWhiteboardHandlers(io, socket);

    logger.debug({ userId: user._id, socketId: socket.id }, "socket connected");
    socket.on("disconnect", (reason) => logger.debug({ userId: user._id, reason }, "socket disconnected"));
  });

  setIO(io);
  return io;
};

export default initSocket;
