import { ROLES, ROLE_RANK } from "../../config/permissions.js";
import Classroom from "../../models/classroom.js";
import Notification from "../../models/notification.js";
import Progress from "../../models/progress.js";
import User from "../../models/user.js";
import { revokeAllSessions } from "../../services/authService.js";
import { deleteClassroomCascade } from "../../services/classroomService.js";
import {
  broadcastStats,
  getOverviewStats,
  getRangeStats,
  uploadAndDownloadCounts,
} from "../../services/statsService.js";
import { getIO, rooms } from "../../socket/emitter.js";
import ApiError from "../../utils/ApiError.js";
import { paginationMeta } from "../../validators/common.js";

const SORTS = {
  lastLogin: { lastLogin: -1, createdAt: -1 },
  createdAt: { createdAt: -1 },
  name: { name: 1 },
};

/** Loads the target user and makes sure the caller outranks them. */
const loadTargetUser = async (req) => {
  const target = await User.findById(req.params.userId);
  if (!target) throw ApiError.notFound("User");
  if (target._id.equals(req.user._id)) {
    throw ApiError.badRequest("You can't do that to your own account", undefined, "CANNOT_TARGET_SELF");
  }
  if (ROLE_RANK[target.role] >= ROLE_RANK[req.user.role]) {
    throw ApiError.forbidden("You can't manage a user with the same or a higher role", "INSUFFICIENT_ROLE");
  }
  return target;
};

const disconnectUser = (userId) => {
  getIO()?.in(rooms.user(userId.toString())).disconnectSockets(true);
};

/** GET /api/admin/users?search=&role=&status=&sort=&page=&limit= */
export const listUsers = async (req, res) => {
  const { search, role, status, sort, page, limit } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (status) filter.isBlocked = status === "blocked";
  if (search) {
    const pattern = new RegExp(search, "i");
    filter.$or = [{ name: pattern }, { username: pattern }, { email: pattern }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select("-activityLog -location")
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const counts = await uploadAndDownloadCounts(users.map((user) => user._id));
  res.json({
    success: true,
    users: users.map((user) => ({
      ...user.toJSON(),
      uploadsCount: counts.uploads.get(user._id.toString()) ?? 0,
      downloadsCount: counts.downloads.get(user._id.toString()) ?? 0,
    })),
    pagination: paginationMeta({ page, limit }, total),
  });
};

/** PATCH /api/admin/users/:userId/role — superadmin only (promote to admin / demote). */
export const updateUserRole = async (req, res) => {
  const target = await loadTargetUser(req);
  const { role } = req.body;
  if (target.role === role) {
    return res.json({ success: true, message: `User is already ${role === ROLES.ADMIN ? "an admin" : "a user"}`, user: target });
  }

  target.role = role;
  await target.save();
  // Old access tokens carry the old role; make the user pick up the new one.
  await revokeAllSessions(target._id);
  disconnectUser(target._id);
  broadcastStats();

  return res.json({
    success: true,
    message: role === ROLES.ADMIN ? "User promoted to admin" : "Admin demoted to user",
    user: target,
  });
};

/** PATCH /api/admin/users/:userId/status — block or unblock. */
export const updateUserStatus = async (req, res) => {
  const target = await loadTargetUser(req);
  const { blocked } = req.body;

  target.isBlocked = blocked;
  await target.save();
  if (blocked) {
    await revokeAllSessions(target._id);
    disconnectUser(target._id);
  }
  broadcastStats();

  res.json({ success: true, message: blocked ? "User blocked" : "User unblocked", user: target });
};

/** DELETE /api/admin/users/:userId — removes the account and the classrooms it owns. */
export const deleteUser = async (req, res) => {
  const target = await loadTargetUser(req);

  const owned = await Classroom.find({ owner: target._id }).select("_id").lean();
  for (const classroom of owned) {
    await deleteClassroomCascade(classroom._id);
  }
  await Promise.all([
    Classroom.updateMany({ "members.user": target._id }, { $pull: { members: { user: target._id } } }),
    Progress.deleteMany({ user: target._id }),
    Notification.deleteMany({ user: target._id }),
  ]);
  await target.deleteOne();
  disconnectUser(target._id);
  broadcastStats();

  res.json({ success: true, message: "User deleted", deletedClassrooms: owned.length });
};

/** GET /api/admin/stats/overview */
export const overviewStats = async (_req, res) => {
  res.json({ success: true, stats: await getOverviewStats() });
};

/** GET /api/admin/stats?range=last7days */
export const rangeStats = async (req, res) => {
  res.json({ success: true, stats: await getRangeStats(req.query.range) });
};

/**
 * GET /api/admin/activity?scope=today|overall&tzOffset=330
 * Logins and time spent per user, either for "today" in the admin's timezone or all time.
 */
export const userActivity = async (req, res) => {
  const { scope, tzOffset } = req.query;
  const pipeline = [{ $unwind: "$activityLog" }];

  if (scope === "today") {
    const offsetMs = tzOffset * 60 * 1000;
    const localNow = new Date(Date.now() + offsetMs);
    localNow.setUTCHours(0, 0, 0, 0);
    const start = new Date(localNow.getTime() - offsetMs);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    pipeline.push({ $match: { "activityLog.date": { $gte: start, $lt: end } } });
  }

  pipeline.push(
    {
      $group: {
        _id: "$_id",
        name: { $first: "$name" },
        username: { $first: "$username" },
        totalLogins: { $sum: "$activityLog.logins" },
        totalTimeSpent: { $sum: "$activityLog.totalTimeSpent" },
      },
    },
    { $sort: { totalTimeSpent: -1, totalLogins: -1 } },
    { $limit: 50 }
  );

  res.json({ success: true, activity: await User.aggregate(pipeline) });
};

/** GET /api/admin/locations — where users signed up from (only those who shared it). */
export const userLocations = async (_req, res) => {
  const users = await User.find({ "location.latitude": { $ne: null }, "location.longitude": { $ne: null } })
    .select("name username location")
    .lean();
  res.json({
    success: true,
    locations: users.map((user) => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      latitude: user.location.latitude,
      longitude: user.location.longitude,
    })),
  });
};

/** GET /api/admin/notifications — the live activity feed. */
export const activityFeed = async (_req, res) => {
  const feed = await Notification.find({ audience: "admin" }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ success: true, notifications: feed.reverse() });
};
