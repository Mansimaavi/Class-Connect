import { PERMISSIONS, roleHasPermission } from "../../config/permissions.js";
import Classroom from "../../models/classroom.js";
import { isObjectId } from "../../validators/common.js";
import { rooms } from "../emitter.js";
import { getOnlineUserIds, markOffline, markOnline } from "../presence.js";

const respond = (ack, payload) => {
  if (typeof ack === "function") ack(payload);
};

const canJoin = async (user, classroomId) => {
  const classroom = await Classroom.findById(classroomId).select("owner members.user").lean();
  if (!classroom) return false;
  const userId = user._id.toString();
  return (
    classroom.owner.toString() === userId ||
    classroom.members.some((member) => member.user.toString() === userId) ||
    roleHasPermission(user.role, PERMISSIONS.CLASSROOM_MODERATE)
  );
};

/**
 * Classroom rooms carry chat messages, polls, announcements, resource updates,
 * typing indicators and presence. Only members (or moderators) may join.
 */
export const registerClassroomHandlers = (io, socket) => {
  const { user } = socket.data;
  const userId = user._id.toString();
  socket.data.classrooms = new Set();

  const leave = (classroomId) => {
    if (!socket.data.classrooms.has(classroomId)) return;
    socket.data.classrooms.delete(classroomId);
    socket.leave(rooms.classroom(classroomId));
    if (markOffline(classroomId, userId)) {
      io.to(rooms.classroom(classroomId)).emit("presence:offline", { classroomId, userId });
    }
  };

  socket.on("classroom:join", async (classroomId, ack) => {
    try {
      if (!isObjectId(classroomId)) return respond(ack, { ok: false, error: "Invalid classroom id" });
      if (!(await canJoin(user, classroomId))) {
        return respond(ack, { ok: false, error: "You are not a member of this classroom" });
      }
      if (!socket.data.classrooms.has(classroomId)) {
        socket.data.classrooms.add(classroomId);
        socket.join(rooms.classroom(classroomId));
        if (markOnline(classroomId, userId)) {
          socket.to(rooms.classroom(classroomId)).emit("presence:online", { classroomId, userId, name: user.name });
        }
      }
      return respond(ack, { ok: true, onlineUserIds: getOnlineUserIds(classroomId) });
    } catch {
      return respond(ack, { ok: false, error: "Could not join the classroom" });
    }
  });

  socket.on("classroom:leave", (classroomId) => {
    if (typeof classroomId === "string") leave(classroomId);
  });

  const typing = (isTyping) => (payload) => {
    const classroomId = payload?.classroomId;
    if (!socket.data.classrooms.has(classroomId)) return;
    socket.to(rooms.classroom(classroomId)).emit("typing", {
      classroomId,
      userId,
      name: user.name,
      isTyping,
    });
  };
  socket.on("typing:start", typing(true));
  socket.on("typing:stop", typing(false));

  socket.on("disconnecting", () => {
    for (const classroomId of [...socket.data.classrooms]) leave(classroomId);
  });
};
