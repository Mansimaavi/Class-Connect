import { PERMISSIONS, roleHasPermission } from "../config/permissions.js";
import Classroom from "../models/classroom.js";
import { isObjectId } from "../validators/common.js";

/**
 * Whiteboard rooms are either a classroom's shared board (roomId = classroom id,
 * open to its members) or someone's personal board (roomId = "personal-<userId>").
 */
export const canAccessWhiteboard = async (user, roomId) => {
  if (!user || typeof roomId !== "string") return false;
  if (roomId === `personal-${user._id}`) return true;
  if (!isObjectId(roomId)) return false;

  const classroom = await Classroom.findById(roomId).select("owner members.user").lean();
  if (!classroom) return false;
  const userId = user._id.toString();
  return (
    classroom.owner.toString() === userId ||
    classroom.members.some((member) => member.user.toString() === userId) ||
    roleHasPermission(user.role, PERMISSIONS.CLASSROOM_MODERATE)
  );
};
