import mongoose from "mongoose";
import { ROLES } from "../config/permissions.js";
import ClassNote from "../models/classNote.js";
import Classroom from "../models/classroom.js";
import Resource from "../models/resource.js";
import User from "../models/user.js";
import logger from "../utils/logger.js";
import { emitToAdmins } from "../socket/emitter.js";

const sumDownloads = async (match = {}) => {
  const [row] = await Resource.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$downloadCount" } } },
  ]);
  return row?.total ?? 0;
};

export const getOverviewStats = async () => {
  const [totalUsers, totalAdmins, blockedUsers, totalClassrooms, resources, notes, totalDownloads] =
    await Promise.all([
      User.countDocuments({ role: ROLES.USER }),
      User.countDocuments({ role: { $in: [ROLES.ADMIN, ROLES.SUPERADMIN] } }),
      User.countDocuments({ isBlocked: true }),
      Classroom.countDocuments(),
      Resource.countDocuments(),
      ClassNote.countDocuments(),
      sumDownloads(),
    ]);

  return {
    totalUsers,
    totalAdmins,
    blockedUsers,
    totalClassrooms,
    totalUploads: resources + notes,
    totalDownloads,
  };
};

const RANGES = {
  last24hours: () => new Date(Date.now() - 24 * 60 * 60 * 1000),
  last7days: () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  lastMonth: () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  },
  lastYear: () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date;
  },
  overall: () => null,
};

export const STAT_RANGES = Object.keys(RANGES);

export const getRangeStats = async (range = "last7days") => {
  const since = (RANGES[range] || RANGES.last7days)();
  const createdFilter = since ? { createdAt: { $gte: since } } : {};

  const [activeUsersCount, resourceUploads, noteUploads, downloads, mostActiveUsers] = await Promise.all([
    User.countDocuments(since ? { lastLogin: { $gte: since } } : {}),
    Resource.countDocuments(createdFilter),
    ClassNote.countDocuments(createdFilter),
    Resource.aggregate([
      { $unwind: "$downloadedBy" },
      ...(since ? [{ $match: { "downloadedBy.at": { $gte: since } } }] : []),
      { $count: "total" },
    ]),
    Resource.aggregate([
      { $match: createdFilter },
      { $group: { _id: "$uploadedBy", totalUploads: { $sum: 1 } } },
      { $sort: { totalUploads: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { _id: 1, totalUploads: 1, name: "$user.name", username: "$user.username" } },
    ]),
  ]);

  return {
    range,
    activeUsersCount,
    totalUploads: resourceUploads + noteUploads,
    totalDownloads: downloads[0]?.total ?? 0,
    mostActiveUsers,
  };
};

/** Pushes fresh numbers to every admin dashboard that's open. */
export const broadcastStats = async () => {
  try {
    emitToAdmins("stats:updated", await getOverviewStats());
  } catch (error) {
    logger.warn({ err: error }, "could not broadcast stats");
  }
};

/** Upload and download counts for a set of users (used by the admin user table). */
export const uploadAndDownloadCounts = async (userIds) => {
  const ids = userIds.map((id) => new mongoose.Types.ObjectId(id));
  const [uploads, downloads] = await Promise.all([
    Resource.aggregate([{ $match: { uploadedBy: { $in: ids } } }, { $group: { _id: "$uploadedBy", count: { $sum: 1 } } }]),
    Resource.aggregate([
      { $unwind: "$downloadedBy" },
      { $match: { "downloadedBy.user": { $in: ids } } },
      { $group: { _id: "$downloadedBy.user", count: { $sum: 1 } } },
    ]),
  ]);
  const toMap = (rows) => new Map(rows.map((row) => [row._id.toString(), row.count]));
  return { uploads: toMap(uploads), downloads: toMap(downloads) };
};
