import { io } from "socket.io-client";
import { SOCKET_URL, refreshAccessToken, tokenStore } from "./api";

let socket = null;

/**
 * One shared Socket.IO connection for the whole app. The handshake sends the
 * current access token; if the server says it has expired, we refresh and
 * reconnect.
 */
export const getSocket = () => {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    transports: ["websocket", "polling"],
    auth: (callback) => callback({ token: tokenStore.get() }),
  });

  socket.on("connect_error", async (error) => {
    if (error?.data?.code === "TOKEN_EXPIRED") {
      try {
        await refreshAccessToken();
        socket.connect();
      } catch {
        // the auth context will notice the session is gone
      }
    }
  });

  return socket;
};

export const connectSocket = () => {
  const instance = getSocket();
  if (!instance.connected) instance.connect();
  return instance;
};

export const disconnectSocket = () => {
  socket?.disconnect();
};
