import { CLASSROOM_ROLES } from "../../config/permissions.js";
import Classroom from "../../models/classroom.js";
import Progress from "../../models/progress.js";
import { notifyUsers } from "../../services/notificationService.js";
import { emitToClassroom, emitToUser, removeUserFromClassroomRoom } from "../../socket/emitter.js";
import { getOnlineUserIds } from "../../socket/presence.js";
import ApiError from "../../utils/ApiError.js";

const USER_FIELDS = "name username avatarUrl";

/** GET /api/classrooms/:classroomId/members */
export const listMembers = async (req, res) => {
  const classroom = await req.classroom.populate("members.user", USER_FIELDS);
  const online = new Set(getOnlineUserIds(classroom._id));
  const ownerId = classroom.owner.toString();

  const members = classroom.members
    .filter((member) => member.user) // skip users deleted out from under us
    .map((member) => {
      const id = member.user._id.toString();
      return {
        _id: id,
        name: member.user.name,
        username: member.user.username,
        avatarUrl: member.user.avatarUrl,
        role: id === ownerId ? CLASSROOM_ROLES.OWNER : member.role,
        joinedAt: member.joinedAt,
        online: online.has(id),
      };
    });

  res.json({ success: true, members });
};

/** PATCH /api/classrooms/:classroomId/members/:userId — owner promotes/demotes a member. */
export const updateMemberRole = async (req, res) => {
  const { classroom } = req;
  const { userId } = req.params;
  const { role } = req.body;

  if (classroom.owner.toString() === userId) {
    throw ApiError.badRequest("The owner's role can't be changed", undefined, "OWNER_ROLE_LOCKED");
  }
  const member = classroom.findMember(userId);
  if (!member) throw ApiError.notFound("Member");

  if (member.role !== role) {
    member.role = role;
    await classroom.save();
    emitToClassroom(classroom._id, "member:updated", { classroomId: classroom._id, userId, role });
    notifyUsers([userId], {
      type: "role_changed",
      title: classroom.name,
      message: `You are now a ${role} in ${classroom.name}`,
      link: `/classroom/${classroom._id}`,
      classroom: classroom._id,
      actor: req.user._id,
    });
  }

  res.json({ success: true, message: `Role updated to ${role}`, member: { _id: userId, role } });
};

/**
 * DELETE /api/classrooms/:classroomId/members/:userId — remove someone.
 * Teachers can remove students; only the owner can remove another teacher.
 */
export const removeMember = async (req, res) => {
  const { classroom } = req;
  const { userId } = req.params;

  if (classroom.owner.toString() === userId) {
    throw ApiError.badRequest("The owner can't be removed. Delete the classroom instead.", undefined, "OWNER_ROLE_LOCKED");
  }
  if (req.user._id.toString() === userId) {
    throw ApiError.badRequest("Use 'leave classroom' to remove yourself", undefined, "CANNOT_REMOVE_SELF");
  }
  const member = classroom.findMember(userId);
  if (!member) throw ApiError.notFound("Member");
  if (member.role === CLASSROOM_ROLES.TEACHER && req.classroomRole !== CLASSROOM_ROLES.OWNER) {
    throw ApiError.forbidden("Only the classroom owner can remove a teacher", "INSUFFICIENT_CLASSROOM_ROLE");
  }

  await Classroom.updateOne({ _id: classroom._id }, { $pull: { members: { user: userId } } });
  await Progress.deleteMany({ classroom: classroom._id, user: userId });

  removeUserFromClassroomRoom(userId, classroom._id);
  emitToClassroom(classroom._id, "member:removed", { classroomId: classroom._id, userId });
  emitToUser(userId, "classroom:removed", { classroomId: classroom._id, name: classroom.name });

  res.json({ success: true, message: "Member removed" });
};
