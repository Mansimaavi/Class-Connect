/**
 * Role-based access control.
 *
 * There are two layers of roles:
 *  1. Platform roles (stored on the user): user, admin, superadmin.
 *  2. Classroom roles (stored on each classroom membership): student, teacher,
 *     plus the implicit `owner` role for the person who created the classroom.
 *
 * Routes never check role names directly. They ask for a permission and the
 * maps below decide which roles grant it, so changing who can do what is a
 * one-line change here.
 */

export const ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
});

export const CLASSROOM_ROLES = Object.freeze({
  STUDENT: "student",
  TEACHER: "teacher",
  OWNER: "owner",
});

export const PERMISSIONS = Object.freeze({
  // platform
  CLASSROOM_CREATE: "classroom:create",
  NOTE_UPLOAD: "note:upload",
  DISCUSSION_POST: "discussion:post",
  USER_READ: "user:read",
  USER_BLOCK: "user:block",
  USER_DELETE: "user:delete",
  USER_ROLE_UPDATE: "user:role:update",
  STATS_READ: "stats:read",
  CONTENT_MODERATE: "content:moderate",
  CLASSROOM_MODERATE: "classroom:moderate",

  // classroom
  CLASSROOM_VIEW: "classroom:view",
  CLASSROOM_UPDATE: "classroom:update",
  CLASSROOM_DELETE: "classroom:delete",
  CLASSROOM_LEAVE: "classroom:leave",
  MEMBER_VIEW: "member:view",
  MEMBER_MANAGE: "member:manage",
  MEMBER_ROLE_UPDATE: "member:role:update",
  RESOURCE_VIEW: "resource:view",
  RESOURCE_UPLOAD: "resource:upload",
  RESOURCE_DELETE_ANY: "resource:delete:any",
  ANNOUNCEMENT_VIEW: "announcement:view",
  ANNOUNCEMENT_CREATE: "announcement:create",
  ANNOUNCEMENT_MANAGE: "announcement:manage",
  ANNOUNCEMENT_COMMENT: "announcement:comment",
  MESSAGE_SEND: "message:send",
  MESSAGE_MODERATE: "message:moderate",
  POLL_CREATE: "poll:create",
  POLL_VOTE: "poll:vote",
  POLL_MANAGE: "poll:manage",
});

const P = PERMISSIONS;

const userPermissions = [P.CLASSROOM_CREATE, P.NOTE_UPLOAD, P.DISCUSSION_POST];
const adminPermissions = [
  ...userPermissions,
  P.USER_READ,
  P.USER_BLOCK,
  P.USER_DELETE,
  P.STATS_READ,
  P.CONTENT_MODERATE,
  P.CLASSROOM_MODERATE,
];
const superadminPermissions = [...adminPermissions, P.USER_ROLE_UPDATE];

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.USER]: new Set(userPermissions),
  [ROLES.ADMIN]: new Set(adminPermissions),
  [ROLES.SUPERADMIN]: new Set(superadminPermissions),
});

const studentPermissions = [
  P.CLASSROOM_VIEW,
  P.CLASSROOM_LEAVE,
  P.MEMBER_VIEW,
  P.RESOURCE_VIEW,
  P.RESOURCE_UPLOAD,
  P.ANNOUNCEMENT_VIEW,
  P.ANNOUNCEMENT_COMMENT,
  P.MESSAGE_SEND,
  P.POLL_CREATE,
  P.POLL_VOTE,
];
const teacherPermissions = [
  ...studentPermissions,
  P.CLASSROOM_UPDATE,
  P.MEMBER_MANAGE,
  P.RESOURCE_DELETE_ANY,
  P.ANNOUNCEMENT_CREATE,
  P.ANNOUNCEMENT_MANAGE,
  P.MESSAGE_MODERATE,
  P.POLL_MANAGE,
];
// The owner can't leave their own classroom; they delete or hand it over instead.
const ownerPermissions = [
  ...teacherPermissions.filter((permission) => permission !== P.CLASSROOM_LEAVE),
  P.CLASSROOM_DELETE,
  P.MEMBER_ROLE_UPDATE,
];

export const CLASSROOM_ROLE_PERMISSIONS = Object.freeze({
  [CLASSROOM_ROLES.STUDENT]: new Set(studentPermissions),
  [CLASSROOM_ROLES.TEACHER]: new Set(teacherPermissions),
  [CLASSROOM_ROLES.OWNER]: new Set(ownerPermissions),
});

/**
 * Platform admins are not members of every classroom, but they can step in to
 * moderate. These are the only classroom permissions that moderation grants.
 */
export const MODERATOR_CLASSROOM_PERMISSIONS = new Set([
  P.CLASSROOM_VIEW,
  P.MEMBER_VIEW,
  P.RESOURCE_VIEW,
  P.ANNOUNCEMENT_VIEW,
  P.RESOURCE_DELETE_ANY,
  P.ANNOUNCEMENT_MANAGE,
  P.MESSAGE_MODERATE,
  P.POLL_MANAGE,
  P.CLASSROOM_DELETE,
]);

export const roleHasPermission = (role, permission) =>
  Boolean(ROLE_PERMISSIONS[role]?.has(permission));

export const classroomRoleHasPermission = (classroomRole, permission) =>
  Boolean(CLASSROOM_ROLE_PERMISSIONS[classroomRole]?.has(permission));

export const permissionsForRole = (role) => [...(ROLE_PERMISSIONS[role] || [])];

export const permissionsForClassroomRole = (classroomRole) => [
  ...(CLASSROOM_ROLE_PERMISSIONS[classroomRole] || []),
];

/** Role rank, used to stop admins from acting on peers or superiors. */
export const ROLE_RANK = Object.freeze({
  [ROLES.USER]: 0,
  [ROLES.ADMIN]: 1,
  [ROLES.SUPERADMIN]: 2,
});
