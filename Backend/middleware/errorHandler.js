import mongoose from "mongoose";
import multer from "multer";
import env from "../config/env.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`, "ROUTE_NOT_FOUND"));
};

const normalize = (err) => {
  if (err instanceof ApiError) return err;

  if (err instanceof mongoose.Error.CastError) {
    return new ApiError(400, `Invalid value for ${err.path}`, "INVALID_ID");
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return new ApiError(400, "Some fields are invalid", "VALIDATION_ERROR", details);
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || "value";
    return new ApiError(409, `That ${field} is already in use`, "DUPLICATE_KEY", [{ field, message: "Already in use" }]);
  }
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new ApiError(413, `File is too large (max ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB)`, "FILE_TOO_LARGE");
    }
    return new ApiError(400, err.message, "UPLOAD_ERROR");
  }
  if (err?.type === "entity.parse.failed") return new ApiError(400, "Request body is not valid JSON", "INVALID_JSON");
  if (err?.type === "entity.too.large") return new ApiError(413, "Request body is too large", "PAYLOAD_TOO_LARGE");

  const status = Number(err?.status || err?.statusCode);
  if (status >= 400 && status < 500) return new ApiError(status, err.message, err.code || "ERROR");

  const internal = new ApiError(500, "Something went wrong on our side", "INTERNAL_ERROR");
  internal.cause = err;
  return internal;
};

// Express recognises error handlers by their 4-argument signature.
export const errorHandler = (err, req, res, _next) => {
  const error = normalize(err);
  const log = req.log || logger;

  if (error.status >= 500) log.error({ err: error.cause || err }, "unhandled error");
  else log.debug({ code: error.code, status: error.status }, error.message);

  if (res.headersSent) return res.end();

  const body = { success: false, message: error.message, code: error.code };
  if (error.details) body.details = error.details;
  if (req.id) body.requestId = req.id;
  if (!env.isProduction && error.status >= 500 && err?.message) body.debug = err.message;

  return res.status(error.status).json(body);
};
