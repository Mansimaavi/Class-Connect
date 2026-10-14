import {
  CLASSROOM_ROLES,
  MODERATOR_CLASSROOM_PERMISSIONS,
  PERMISSIONS,
  permissionsForClassroomRole,
  roleHasPermission,
} from "../../config/permissions.js";
import Classroom from "../../models/classroom.js";
import Progress from "../../models/progress.js";
import {
  deleteClassroomCascade,
  generateUniqueJoinCode,
  progressByClassroom,
} from "../../services/classroomService.js";
import { notifyUsers } from "../../services/notificationService.js";
import { emitToClassroom, removeUserFromClassroomRoom } from "../../socket/emitter.js";
import { getOnlineUserIds } from "../../socket/presence.js";
import ApiError from "../../utils/ApiError.js";

const USER_FIELDS = "name username avatarUrl";
const MEMBER_PREVIEW = 5;

const canManage = (role) => role === CLASSROOM_ROLES.OWNER || role === CLASSROOM_ROLES.TEACHER;

const serializeMember = (classroom, member) => {
  const user = member.user;
  const id = (user?._id ?? user)?.toString();
  return {
    _id: id,
    name: user?.name,
    username: user?.username,
    avatarUrl: user?.avatarUrl,
    role: classroom.owner && (classroom.owner._id ?? classroom.owner).toString() === id ? CLASSROOM_ROLES.OWNER : member.role,
    joinedAt: member.joinedAt,
  };
};

export const serializeClassroom = (classroom, myRole, { fullMembers = false, progress } = {}) => {
  const members = classroom.members.map((member) => serializeMember(classroom, member));
  return {
    _id: classroom._id,
    name: classroom.name,
    subject: classroom.subject,
    description: classroom.description,
    owner: classroom.owner,
    isArchived: classroom.isArchived,
    myRole,
    memberCount: members.length,
    members: fullMembers ? members : members.slice(0, MEMBER_PREVIEW),
    // Only people who can invite others get to see the code.
    joinCode: canManage(myRole) ? classroom.joinCode : undefined,
    progress,
    createdAt: classroom.createdAt,
    updatedAt: classroom.updatedAt,
  };
};

// Works on both a query and a loaded document.
const populateClassroom = (target) =>
  target.populate([
    { path: "owner", select: USER_FIELDS },
    { path: "members.user", select: USER_FIELDS },
  ]);

/** GET /api/classrooms?scope=all|owned|joined */
export const listMyClassrooms = async (req, res) => {
  const userId = req.user._id;
  const filter = { "members.user": userId };
  if (req.query.scope === "owned") filter.owner = userId;
  if (req.query.scope === "joined") filter.owner = { $ne: userId };

  const classrooms = await populateClassroom(Classroom.find(filter).sort({ updatedAt: -1 }));
  const progress = await progressByClassroom(userId, classrooms.map((classroom) => classroom._id));

  res.json({
    success: true,
    classrooms: classrooms.map((classroom) =>
      serializeClassroom(classroom, classroom.roleOf(userId), { progress: progress[classroom._id.toString()] })
    ),
  });
};

/** POST /api/classrooms */
export const createClassroom = async (req, res) => {
  const { name, subject, description, joinCode } = req.body;
  if (joinCode && (await Classroom.exists({ joinCode }))) {
    throw ApiError.conflict("That join code is already taken, try another one", "JOIN_CODE_TAKEN");
  }

  const classroom = await Classroom.create({
    name,
    subject,
    description,
    joinCode: joinCode || (await generateUniqueJoinCode()),
    owner: req.user._id,
    members: [{ user: req.user._id, role: CLASSROOM_ROLES.TEACHER }],
  });
  await populateClassroom(classroom);

  res.status(201).json({
    success: true,
    message: "Classroom created",
    classroom: serializeClassroom(classroom, CLASSROOM_ROLES.OWNER, {
      fullMembers: true,
      progress: { total: 0, completed: 0, percentage: 0 },
    }),
  });
};

/** POST /api/classrooms/join */
export const joinClassroom = async (req, res) => {
  const { joinCode } = req.body;
  const userId = req.user._id;

  const classroom = await Classroom.findOne({ joinCode });
  if (!classroom) throw ApiError.notFound("Classroom with that join code");
  if (classroom.isArchived) throw ApiError.badRequest("This classroom is archived and not accepting members", undefined, "CLASSROOM_ARCHIVED");
  if (classroom.roleOf(userId)) throw ApiError.conflict("You're already a member of this classroom", "ALREADY_MEMBER");

  // Conditional update so two simultaneous joins can't add the user twice.
  const result = await Classroom.updateOne(
    { _id: classroom._id, "members.user": { $ne: userId } },
    { $push: { members: { user: userId, role: CLASSROOM_ROLES.STUDENT, joinedAt: new Date() } } }
  );
  if (!result.modifiedCount) throw ApiError.conflict("You're already a member of this classroom", "ALREADY_MEMBER");

  const updated = await populateClassroom(Classroom.findById(classroom._id));
  const member = serializeMember(updated, updated.findMember(userId));

  emitToClassroom(updated._id, "member:joined", { classroomId: updated._id, member });
  const teacherIds = updated.members.filter((m) => m.role === CLASSROOM_ROLES.TEACHER).map((m) => m.user._id);
  notifyUsers(teacherIds, {
    type: "member_joined",
    title: updated.name,
    message: `${req.user.name} joined ${updated.name}`,
    link: `/classroom/${updated._id}`,
    classroom: updated._id,
    actor: userId,
  });

  const [progress] = Object.values(await progressByClassroom(userId, [updated._id]));
  res.json({
    success: true,
    message: `You joined ${updated.name}`,
    classroom: serializeClassroom(updated, CLASSROOM_ROLES.STUDENT, { progress }),
  });
};

/** GET /api/classrooms/:classroomId */
export const getClassroom = async (req, res) => {
  const classroom = await populateClassroom(req.classroom);
  const myRole = req.classroomRole;
  const permissions = myRole
    ? permissionsForClassroomRole(myRole)
    : roleHasPermission(req.user.role, PERMISSIONS.CLASSROOM_MODERATE)
      ? [...MODERATOR_CLASSROOM_PERMISSIONS]
      : [];
  const [progress] = Object.values(await progressByClassroom(req.user._id, [classroom._id]));

  res.json({
    success: true,
    classroom: {
      ...serializeClassroom(classroom, myRole, { fullMembers: true, progress }),
      // moderators see the code too
      joinCode: permissions.includes(PERMISSIONS.MEMBER_MANAGE) ? classroom.joinCode : undefined,
    },
    permissions,
    onlineUserIds: getOnlineUserIds(classroom._id),
  });
};

/** PATCH /api/classrooms/:classroomId */
export const updateClassroom = async (req, res) => {
  const classroom = req.classroom;
  Object.assign(classroom, req.body);
  await classroom.save();
  await populateClassroom(classroom);

  const payload = serializeClassroom(classroom, req.classroomRole, { fullMembers: true });
  emitToClassroom(classroom._id, "classroom:updated", {
    classroomId: classroom._id,
    changes: { name: classroom.name, subject: classroom.subject, description: classroom.description, isArchived: classroom.isArchived },
  });
  res.json({ success: true, message: "Classroom updated", classroom: payload });
};

/** POST /api/classrooms/:classroomId/join-code — issues a new code; the old one stops working. */
export const regenerateJoinCode = async (req, res) => {
  req.classroom.joinCode = await generateUniqueJoinCode();
  await req.classroom.save();
  res.json({ success: true, joinCode: req.classroom.joinCode });
};

/** DELETE /api/classrooms/:classroomId */
export const deleteClassroom = async (req, res) => {
  const classroomId = req.classroom._id;
  emitToClassroom(classroomId, "classroom:deleted", { classroomId });
  await deleteClassroomCascade(classroomId);
  res.json({ success: true, message: "Classroom deleted" });
};

/** POST /api/classrooms/:classroomId/leave */
export const leaveClassroom = async (req, res) => {
  const { classroom } = req;
  const userId = req.user._id;

  await Classroom.updateOne({ _id: classroom._id }, { $pull: { members: { user: userId } } });
  await Progress.deleteMany({ classroom: classroom._id, user: userId });

  removeUserFromClassroomRoom(userId, classroom._id);
  emitToClassroom(classroom._id, "member:left", { classroomId: classroom._id, userId });
  res.json({ success: true, message: `You left ${classroom.name}` });
};
