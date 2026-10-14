import { PERMISSIONS } from "../../config/permissions.js";
import { hasClassroomPermission } from "../../middleware/rbac.js";
import Announcement from "../../models/announcement.js";
import { notifyUsers } from "../../services/notificationService.js";
import { emitToClassroom } from "../../socket/emitter.js";
import ApiError from "../../utils/ApiError.js";
import { paginationMeta } from "../../validators/common.js";

const USER_FIELDS = "name username avatarUrl";
const POPULATE = [
  { path: "author", select: USER_FIELDS },
  { path: "comments.author", select: USER_FIELDS },
];

const findAnnouncement = async (req) => {
  const announcement = await Announcement.findOne({
    _id: req.params.announcementId,
    classroom: req.classroom._id,
  });
  if (!announcement) throw ApiError.notFound("Announcement");
  return announcement;
};

/** GET /api/classrooms/:classroomId/announcements — pinned first, then newest. */
export const listAnnouncements = async (req, res) => {
  const { page, limit } = req.query;
  const filter = { classroom: req.classroom._id };

  const [announcements, total] = await Promise.all([
    Announcement.find(filter)
      .sort({ pinned: -1, createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(POPULATE),
    Announcement.countDocuments(filter),
  ]);

  res.json({ success: true, announcements, pagination: paginationMeta({ page, limit }, total) });
};

/** GET /api/classrooms/:classroomId/announcements/:announcementId */
export const getAnnouncement = async (req, res) => {
  const announcement = await findAnnouncement(req);
  await announcement.populate(POPULATE);
  res.json({ success: true, announcement });
};

/** POST /api/classrooms/:classroomId/announcements — teachers only. */
export const createAnnouncement = async (req, res) => {
  const { classroom } = req;
  const announcement = await Announcement.create({
    ...req.body,
    classroom: classroom._id,
    author: req.user._id,
  });
  await announcement.populate(POPULATE);

  emitToClassroom(classroom._id, "announcement:created", { classroomId: classroom._id, announcement });
  notifyUsers(classroom.memberIds(), {
    type: "announcement",
    title: `New announcement in ${classroom.name}`,
    message: announcement.title,
    link: `/classroom/${classroom._id}?tab=stream`,
    classroom: classroom._id,
    actor: req.user._id,
  });

  res.status(201).json({ success: true, message: "Announcement posted", announcement });
};

/** PATCH /api/classrooms/:classroomId/announcements/:announcementId */
export const updateAnnouncement = async (req, res) => {
  const announcement = await findAnnouncement(req);
  Object.assign(announcement, req.body);
  if (req.body.title !== undefined || req.body.body !== undefined) announcement.editedAt = new Date();
  await announcement.save();
  await announcement.populate(POPULATE);

  emitToClassroom(req.classroom._id, "announcement:updated", { classroomId: req.classroom._id, announcement });
  res.json({ success: true, message: "Announcement updated", announcement });
};

/** DELETE /api/classrooms/:classroomId/announcements/:announcementId */
export const deleteAnnouncement = async (req, res) => {
  const announcement = await findAnnouncement(req);
  await announcement.deleteOne();

  emitToClassroom(req.classroom._id, "announcement:deleted", {
    classroomId: req.classroom._id,
    announcementId: announcement._id,
  });
  res.json({ success: true, message: "Announcement deleted" });
};

/** POST /api/classrooms/:classroomId/announcements/:announcementId/comments */
export const addComment = async (req, res) => {
  const announcement = await findAnnouncement(req);
  announcement.comments.push({ author: req.user._id, text: req.body.text });
  await announcement.save();
  await announcement.populate(POPULATE);

  const comment = announcement.comments[announcement.comments.length - 1];
  emitToClassroom(req.classroom._id, "announcement:comment-added", {
    classroomId: req.classroom._id,
    announcementId: announcement._id,
    comment,
  });
  res.status(201).json({ success: true, comment });
};

/** DELETE .../comments/:commentId — the comment's author or a teacher. */
export const deleteComment = async (req, res) => {
  const announcement = await findAnnouncement(req);
  const comment = announcement.comments.id(req.params.commentId);
  if (!comment) throw ApiError.notFound("Comment");

  const isAuthor = comment.author.equals(req.user._id);
  if (!isAuthor && !hasClassroomPermission(req, PERMISSIONS.ANNOUNCEMENT_MANAGE)) {
    throw ApiError.forbidden("You can only delete your own comments");
  }

  comment.deleteOne();
  await announcement.save();

  emitToClassroom(req.classroom._id, "announcement:comment-deleted", {
    classroomId: req.classroom._id,
    announcementId: announcement._id,
    commentId: req.params.commentId,
  });
  res.json({ success: true, message: "Comment deleted" });
};
