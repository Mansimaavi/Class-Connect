import multer from "multer";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";

export const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const buildUpload = (allowed, label) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxUploadBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (allowed.has(file.mimetype)) return cb(null, true);
      return cb(ApiError.badRequest(`Unsupported file type. Allowed: ${label}.`, undefined, "UNSUPPORTED_FILE_TYPE"));
    },
  });

/** Single file in the `file` field (the old frontend used `pdf`; both work). */
export const uploadDocument = buildUpload(DOCUMENT_MIME_TYPES, "PDF, Word, PowerPoint and images").fields([
  { name: "file", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
]);

/** Normalises the `.fields()` result to `req.file`. */
export const pickUploadedFile = (req, _res, next) => {
  req.file = req.files?.file?.[0] || req.files?.pdf?.[0] || req.file;
  next();
};
