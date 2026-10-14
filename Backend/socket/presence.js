// Tracks who is currently viewing each classroom: classroomId -> userId -> open socket count.
// This lives in memory, which is fine for a single API instance; running several
// instances would need the Socket.IO Redis adapter and a shared store.

const online = new Map();

export const markOnline = (classroomId, userId) => {
  const users = online.get(classroomId) ?? new Map();
  users.set(userId, (users.get(userId) ?? 0) + 1);
  online.set(classroomId, users);
  return users.get(userId) === 1; // true when this is the user's first socket in the room
};

export const markOffline = (classroomId, userId) => {
  const users = online.get(classroomId);
  if (!users?.has(userId)) return false;
  const remaining = users.get(userId) - 1;
  if (remaining > 0) {
    users.set(userId, remaining);
    return false;
  }
  users.delete(userId);
  if (!users.size) online.delete(classroomId);
  return true; // user has no sockets left in the room
};

export const getOnlineUserIds = (classroomId) => [...(online.get(classroomId.toString())?.keys() ?? [])];

export const resetPresence = () => online.clear();
