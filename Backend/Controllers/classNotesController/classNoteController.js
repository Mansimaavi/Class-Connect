import { PERMISSIONS, roleHasPermission } from "../../config/permissions.js";
import ClassNote from "../../models/classNote.js";
import { broadcastStats } from "../../services/statsService.js";
import { deleteFile, uploadFile } from "../../services/storageService.js";
import ApiError from "../../utils/ApiError.js";
import { paginationMeta } from "../../validators/common.js";

const SORTS = {
  recent: { createdAt: -1 },
  rating: { averageRating: -1, ratingCount: -1, createdAt: -1 },
  popular: { viewCount: -1, createdAt: -1 },
};

const serialize = (note, userId) => {
  const json = note.toJSON ? note.toJSON() : note;
  const myRating = userId ? json.ratings?.find((rating) => rating.user?.toString() === userId.toString())?.value ?? null : null;
  const { ratings: _ratings, ...rest } = json;
  return { ...rest, myRating };
};

const findNote = async (noteId) => {
  const note = await ClassNote.findById(noteId);
  if (!note) throw ApiError.notFound("Note");
  return note;
};

/** GET /api/class-notes?search=&subject=&sort=recent|rating|popular&page=&limit= (public) */
export const listNotes = async (req, res) => {
  const { search, subject, sort, page, limit } = req.query;
  const filter = {};
  if (subject && subject !== "All") filter.subject = subject;
  if (search) {
    const pattern = new RegExp(search, "i");
    filter.$or = [{ title: pattern }, { topic: pattern }, { subject: pattern }];
  }

  const [notes, total, subjects] = await Promise.all([
    ClassNote.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate([
        { path: "uploadedBy", select: "name username" },
        { path: "reviews.user", select: "name username" },
      ]),
    ClassNote.countDocuments(filter),
    ClassNote.distinct("subject"),
  ]);

  res.json({
    success: true,
    notes: notes.map((note) => serialize(note, req.user?._id)),
    subjects: subjects.filter(Boolean).sort(),
    pagination: paginationMeta({ page, limit }, total),
  });
};

/** POST /api/class-notes (multipart: file, topic, subject, title?) */
export const uploadNote = async (req, res) => {
  if (!req.file) throw ApiError.badRequest("Choose a file to upload", undefined, "NO_FILE");

  const stored = await uploadFile(req.file, "class-notes");
  const note = await ClassNote.create({
    title: req.body.title || req.file.originalname,
    topic: req.body.topic,
    subject: req.body.subject || "General",
    url: stored.url,
    publicId: stored.publicId,
    resourceType: stored.resourceType,
    mimeType: req.file.mimetype,
    size: stored.size,
    uploadedBy: req.user._id,
  });
  await note.populate("uploadedBy", "name username");
  broadcastStats();

  res.status(201).json({ success: true, message: "Note uploaded", note: serialize(note, req.user._id) });
};

/** POST /api/class-notes/:noteId/view — counts an open (public). */
export const recordView = async (req, res) => {
  const note = await ClassNote.findByIdAndUpdate(req.params.noteId, { $inc: { viewCount: 1 } }, { new: true }).select(
    "url viewCount"
  );
  if (!note) throw ApiError.notFound("Note");
  res.json({ success: true, url: note.url, viewCount: note.viewCount });
};

/** POST /api/class-notes/:noteId/rating */
export const rateNote = async (req, res) => {
  const note = await findNote(req.params.noteId);
  note.setRating(req.user._id, req.body.rating);
  await note.save();
  res.json({
    success: true,
    averageRating: note.averageRating,
    ratingCount: note.ratingCount,
    myRating: req.body.rating,
  });
};

/** POST /api/class-notes/:noteId/reviews */
export const addReview = async (req, res) => {
  const note = await findNote(req.params.noteId);
  const { text, rating } = req.body;
  if (rating) note.setRating(req.user._id, rating);
  note.reviews.push({ user: req.user._id, text, rating });
  await note.save();
  await note.populate("reviews.user", "name username");

  res.status(201).json({
    success: true,
    review: note.reviews[note.reviews.length - 1],
    averageRating: note.averageRating,
    ratingCount: note.ratingCount,
  });
};

/** DELETE /api/class-notes/:noteId — uploader or a moderator. */
export const deleteNote = async (req, res) => {
  const note = await findNote(req.params.noteId);
  const isOwner = note.uploadedBy.equals(req.user._id);
  if (!isOwner && !roleHasPermission(req.user.role, PERMISSIONS.CONTENT_MODERATE)) {
    throw ApiError.forbidden("Only the uploader or an admin can delete this note");
  }
  await note.deleteOne();
  await deleteFile(note.publicId, note.resourceType);
  broadcastStats();
  res.json({ success: true, message: "Note deleted" });
};
