import Progress from "../../models/progress.js";
import Resource from "../../models/resource.js";
import { progressByClassroom } from "../../services/classroomService.js";
import { notifyUsers } from "../../services/notificationService.js";
import { broadcastStats } from "../../services/statsService.js";
import { deleteFile, streamFileToResponse, uploadFile } from "../../services/storageService.js";
import { summarizePdf } from "../../services/summarizeService.js";
import { emitToClassroom, emitToUser } from "../../socket/emitter.js";
import { hasClassroomPermission } from "../../middleware/rbac.js";
import { PERMISSIONS } from "../../config/permissions.js";
import ApiError from "../../utils/ApiError.js";

const MAX_DOWNLOAD_LOG = 1000;

const findResource = async (req, { withDownloads = false } = {}) => {
  const query = Resource.findOne({ _id: req.params.resourceId, classroom: req.classroom._id });
  if (withDownloads) query.select("+downloadedBy");
  const resource = await query;
  if (!resource) throw ApiError.notFound("Resource");
  return resource;
};

/** GET /api/classrooms/:classroomId/resources — includes the caller's completion state. */
export const listResources = async (req, res) => {
  const classroomId = req.classroom._id;
  const [resources, myProgress] = await Promise.all([
    Resource.find({ classroom: classroomId }).sort({ createdAt: -1 }).populate("uploadedBy", "name username").lean(),
    Progress.find({ classroom: classroomId, user: req.user._id, completed: true }).select("resource completedAt").lean(),
  ]);

  const completed = new Map(myProgress.map((entry) => [entry.resource.toString(), entry.completedAt]));
  const items = resources.map((resource) => ({
    ...resource,
    completed: completed.has(resource._id.toString()),
    completedAt: completed.get(resource._id.toString()) ?? null,
  }));
  const done = items.filter((item) => item.completed).length;

  res.json({
    success: true,
    resources: items,
    progress: {
      total: items.length,
      completed: done,
      percentage: items.length ? Math.round((done / items.length) * 100) : 0,
    },
  });
};

/** POST /api/classrooms/:classroomId/resources (multipart, field `file`) */
export const uploadResource = async (req, res) => {
  if (!req.file) throw ApiError.badRequest("Choose a file to upload", undefined, "NO_FILE");
  const { classroom } = req;

  const stored = await uploadFile(req.file, `classrooms/${classroom._id}`);
  const resource = await Resource.create({
    classroom: classroom._id,
    name: req.file.originalname,
    url: stored.url,
    publicId: stored.publicId,
    resourceType: stored.resourceType,
    mimeType: req.file.mimetype,
    size: stored.size,
    uploadedBy: req.user._id,
  });
  await resource.populate("uploadedBy", "name username");

  const payload = { ...resource.toJSON(), completed: false };
  emitToClassroom(classroom._id, "resource:created", { classroomId: classroom._id, resource: payload });
  notifyUsers(classroom.memberIds(), {
    type: "resource",
    title: classroom.name,
    message: `${req.user.name} shared "${resource.name}"`,
    link: `/classroom/${classroom._id}`,
    classroom: classroom._id,
    actor: req.user._id,
  });
  broadcastStats();

  res.status(201).json({ success: true, message: "File uploaded", resource: payload });
};

/** DELETE /api/classrooms/:classroomId/resources/:resourceId — uploader or a teacher. */
export const deleteResource = async (req, res) => {
  const resource = await findResource(req);
  const isUploader = resource.uploadedBy.equals(req.user._id);
  if (!isUploader && !hasClassroomPermission(req, PERMISSIONS.RESOURCE_DELETE_ANY)) {
    throw ApiError.forbidden("Only the uploader or a teacher can delete this file");
  }

  await Promise.all([resource.deleteOne(), Progress.deleteMany({ resource: resource._id })]);
  await deleteFile(resource.publicId, resource.resourceType);

  emitToClassroom(req.classroom._id, "resource:deleted", { classroomId: req.classroom._id, resourceId: resource._id });
  broadcastStats();
  res.json({ success: true, message: "File deleted" });
};

/** GET /api/classrooms/:classroomId/resources/:resourceId/download */
export const downloadResource = async (req, res) => {
  const resource = await findResource(req);
  await Resource.updateOne(
    { _id: resource._id },
    {
      $inc: { downloadCount: 1 },
      $push: { downloadedBy: { $each: [{ user: req.user._id, at: new Date() }], $slice: -MAX_DOWNLOAD_LOG } },
    }
  );
  await streamFileToResponse(resource.url, res, { filename: resource.name, mimeType: resource.mimeType });
};

/** PUT /api/classrooms/:classroomId/resources/:resourceId/progress — mark (in)complete. */
export const updateProgress = async (req, res) => {
  const resource = await findResource(req);
  const { completed } = req.body;

  await Progress.findOneAndUpdate(
    { user: req.user._id, resource: resource._id },
    {
      $set: { completed, completedAt: completed ? new Date() : null },
      $setOnInsert: { classroom: req.classroom._id },
    },
    { upsert: true }
  );

  const [summary] = Object.values(await progressByClassroom(req.user._id, [req.classroom._id]));
  emitToUser(req.user._id, "progress:updated", { classroomId: req.classroom._id, resourceId: resource._id, completed, progress: summary });
  res.json({ success: true, resourceId: resource._id, completed, progress: summary });
};

/** POST /api/classrooms/:classroomId/resources/:resourceId/summary — AI summary of a PDF. */
export const summarizeResource = async (req, res) => {
  const resource = await findResource(req);
  const isPdf = resource.mimeType === "application/pdf" || /\.pdf($|\?)/i.test(resource.url);
  if (!isPdf) throw ApiError.badRequest("Only PDF files can be summarized", undefined, "NOT_A_PDF");

  const summary = await summarizePdf(resource.url, req.body.maxWords);
  res.json({ success: true, resourceId: resource._id, summary });
};
