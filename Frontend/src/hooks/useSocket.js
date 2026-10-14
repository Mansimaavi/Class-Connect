import { useEffect, useRef, useState } from "react";
import { getSocket } from "../lib/socket";

/** Subscribes to a socket event for the lifetime of the component. */
export const useSocketEvent = (event, handler) => {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const socket = getSocket();
    const listener = (...args) => handlerRef.current(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [event]);
};

/**
 * Joins a classroom's real-time room (and re-joins after reconnects).
 * Returns the ids of members who are online right now.
 */
export const useClassroomRoom = (classroomId) => {
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!classroomId) return undefined;
    const socket = getSocket();

    const join = () => {
      socket.timeout(5000).emit("classroom:join", classroomId, (err, reply) => {
        if (err || !reply?.ok) {
          setJoined(false);
          return;
        }
        setJoined(true);
        setOnlineUserIds(reply.onlineUserIds || []);
      });
    };

    const onOnline = ({ classroomId: id, userId }) => {
      if (id === classroomId) setOnlineUserIds((ids) => (ids.includes(userId) ? ids : [...ids, userId]));
    };
    const onOffline = ({ classroomId: id, userId }) => {
      if (id === classroomId) setOnlineUserIds((ids) => ids.filter((existing) => existing !== userId));
    };

    socket.on("connect", join);
    socket.on("presence:online", onOnline);
    socket.on("presence:offline", onOffline);
    if (socket.connected) join();

    return () => {
      socket.emit("classroom:leave", classroomId);
      socket.off("connect", join);
      socket.off("presence:online", onOnline);
      socket.off("presence:offline", onOffline);
    };
  }, [classroomId]);

  return { onlineUserIds, joined };
};
