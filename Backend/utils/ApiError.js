/**
 * Error type that carries an HTTP status and a stable, machine-readable code.
 * Controllers throw these; the central error handler turns them into the
 * standard `{ success: false, message, code, details }` response body.
 */
export default class ApiError extends Error {
  constructor(status, message, code = "ERROR", details = undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = "Bad request", details, code = "BAD_REQUEST") {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
    return new ApiError(401, message, code);
  }

  static forbidden(message = "You do not have permission to perform this action", code = "FORBIDDEN") {
    return new ApiError(403, message, code);
  }

  static notFound(resource = "Resource") {
    return new ApiError(404, `${resource} not found`, "NOT_FOUND");
  }

  static conflict(message, code = "CONFLICT") {
    return new ApiError(409, message, code);
  }

  static tooMany(message = "Too many requests, please try again later") {
    return new ApiError(429, message, "RATE_LIMITED");
  }

  static unavailable(message = "Service unavailable", code = "SERVICE_UNAVAILABLE") {
    return new ApiError(503, message, code);
  }
}
