import mongoose from "mongoose";
import Announcement from "../models/announcement.js";
import Classroom from "../models/classroom.js";
import Message from "../models/message.js";
import Notification from "../models/notification.js";
import Poll from "../models/poll.js";
import Progress from "../models/progress.js";
import Resource from "../models/resource.js";
import Whiteboard from "../models/whiteboard.js";
import { deleteFile } from "./storageService.js";

const MAX_JOIN_CODE_ATTEMPTS = 5;

/** Picks a join code nobody is using yet. */
export const generateUniqueJoinCode = async () => {
  for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS; attempt += 1) {
    const code = Classroom.generateJoinCode();
    if (!(await Classroom.exists({ joinCode: code }))) return code;
  }
  throw new Error("Could not generate a unique join code");
};

/** Deletes a classroom and everything that belongs to it, including stored files. */
export const deleteClassroomCascade = async (classroomId) => {
  const id = new mongoose.Types.ObjectId(classroomId);
  const resources = await Resource.find({ classroom: id }).select("publicId resourceType").lean();

  await Promise.all([
    Resource.deleteMany({ classroom: id }),
    Progress.deleteMany({ classroom: id }),
    Announcement.deleteMany({ classroom: id }),
    Message.deleteMany({ classroom: id }),
    Poll.deleteMany({ classroom: id }),
    Notification.deleteMany({ classroom: id }),
    Whiteboard.deleteOne({ roomId: id.toString() }),
    Classroom.deleteOne({ _id: id }),
  ]);

  await Promise.all(resources.map((resource) => deleteFile(resource.publicId, resource.resourceType)));
};

/**
 * Completion summary for one user across a set of classrooms:
 * `{ [classroomId]: { total, completed, percentage } }`
 */
export const progressByClassroom = async (userId, classroomIds) => {
  if (!classroomIds.length) return {};
  const ids = classroomIds.map((id) => new mongoose.Types.ObjectId(id));

  const [totals, completed] = await Promise.all([
    Resource.aggregate([{ $match: { classroom: { $in: ids } } }, { $group: { _id: "$classroom", total: { $sum: 1 } } }]),
    Progress.aggregate([
      { $match: { classroom: { $in: ids }, user: new mongoose.Types.ObjectId(userId), completed: true } },
      { $group: { _id: "$classroom", completed: { $sum: 1 } } },
    ]),
  ]);

  const completedMap = new Map(completed.map((row) => [row._id.toString(), row.completed]));
  return Object.fromEntries(
    ids.map((id) => {
      const key = id.toString();
      const total = totals.find((row) => row._id.toString() === key)?.total ?? 0;
      const done = Math.min(completedMap.get(key) ?? 0, total);
      return [key, { total, completed: done, percentage: total ? Math.round((done / total) * 100) : 0 }];
    })
  );
};
