import path from "node:path";
import { Readable } from "node:stream";
import { v2 as cloudinary } from "cloudinary";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

const { cloudName, apiKey, apiSecret } = env.cloudinary;
const configured = Boolean(cloudName && apiKey && apiSecret);

if (configured) {
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
}

export const isStorageConfigured = () => configured;

const safeBaseName = (originalName) =>
  path
    .parse(originalName || "file")
    .name.replace(/[^a-zA-Z0-9-_]+/g, "_")
    .slice(0, 80) || "file";

/**
 * Uploads an in-memory file (from multer) to Cloudinary.
 * Images go up as `image`; PDFs, slides etc. as `raw`, which Cloudinary always
 * delivers as-is (free accounts block PDF delivery for the `image` type).
 */
export const uploadFile = (file, folder) => {
  if (!configured) {
    throw ApiError.unavailable("File storage is not configured on the server", "STORAGE_NOT_CONFIGURED");
  }

  const isImage = file.mimetype?.startsWith("image/");
  const extension = path.extname(file.originalname || "").toLowerCase();
  const resourceType = isImage ? "image" : "raw";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `classconnect/${folder}`,
        resource_type: resourceType,
        // raw files keep their extension in the public id so they're served with the right type
        public_id: `${safeBaseName(file.originalname)}_${Date.now()}${isImage ? "" : extension}`,
        timeout: 60_000,
      },
      (error, result) => {
        if (error) {
          logger.error({ err: error }, "cloudinary upload failed");
          reject(ApiError.unavailable("Could not store the file, please try again", "UPLOAD_FAILED"));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType,
          size: result.bytes ?? file.size,
        });
      }
    );
    Readable.from(file.buffer).pipe(stream);
  });
};

export const deleteFile = async (publicId, resourceType = "raw") => {
  if (!configured || !publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
  } catch (error) {
    // The database record is already gone; a leftover file is not worth failing the request for.
    logger.warn({ err: error, publicId }, "cloudinary delete failed");
  }
};

/** Streams a stored file back to the client as a download. */
export const streamFileToResponse = async (url, res, { filename, mimeType }) => {
  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    throw ApiError.unavailable("The file could not be retrieved from storage", "STORAGE_FETCH_FAILED");
  }
  res.setHeader("Content-Type", mimeType || upstream.headers.get("content-type") || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeURIComponent(filename || "download")}`
  );
  const length = upstream.headers.get("content-length");
  if (length) res.setHeader("Content-Length", length);
  Readable.fromWeb(upstream.body).pipe(res);
};
