// Thin wrapper around the Socket.IO server so controllers can broadcast events
// without importing the HTTP server (and without caring whether sockets are
// running at all, e.g. in tests).

let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;

export const rooms = {
  classroom: (classroomId) => `classroom:${classroomId}`,
  user: (userId) => `user:${userId}`,
  admins: "admins",
  whiteboard: (roomId) => `whiteboard:${roomId}`,
};

export const emitToClassroom = (classroomId, event, payload) => {
  io?.to(rooms.classroom(classroomId.toString())).emit(event, payload);
};

export const emitToUser = (userId, event, payload) => {
  io?.to(rooms.user(userId.toString())).emit(event, payload);
};

export const emitToUsers = (userIds, event, payload) => {
  if (!io || !userIds.length) return;
  io.to(userIds.map((id) => rooms.user(id.toString()))).emit(event, payload);
};

export const emitToWhiteboard = (roomId, event, payload) => {
  io?.to(rooms.whiteboard(roomId)).emit(event, payload);
};

export const emitToAdmins = (event, payload) => {
  io?.to(rooms.admins).emit(event, payload);
};

/** Removes a user's sockets from a classroom room, e.g. after they're removed. */
export const removeUserFromClassroomRoom = (userId, classroomId) => {
  io?.in(rooms.user(userId.toString())).socketsLeave(rooms.classroom(classroomId.toString()));
};
