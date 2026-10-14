import {
  MODERATOR_CLASSROOM_PERMISSIONS,
  PERMISSIONS,
  classroomRoleHasPermission,
  roleHasPermission,
} from "../config/permissions.js";
import Classroom from "../models/classroom.js";
import ApiError from "../utils/ApiError.js";
import { isObjectId } from "../validators/common.js";

/** Allows the request only for the listed platform roles. */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    return next();
  };

/** Requires every listed platform permission (see config/permissions.js). */
export const requirePermission =
  (...permissions) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const missing = permissions.filter((permission) => !roleHasPermission(req.user.role, permission));
    if (missing.length) return next(ApiError.forbidden());
    return next();
  };

/**
 * Loads `req.params[param]` as a classroom and works out the caller's role in
 * it (owner / teacher / student / null). Later middleware and controllers read
 * `req.classroom` and `req.classroomRole`.
 */
export const loadClassroom =
  (param = "classroomId") =>
  async (req, _res, next) => {
    const id = req.params[param];
    if (!isObjectId(id)) throw ApiError.badRequest("Invalid classroom id", undefined, "INVALID_ID");

    const classroom = await Classroom.findById(id);
    if (!classroom) throw ApiError.notFound("Classroom");

    req.classroom = classroom;
    req.classroomRole = classroom.roleOf(req.user._id);
    next();
  };

export const hasClassroomPermission = (req, permission) => {
  if (req.classroomRole && classroomRoleHasPermission(req.classroomRole, permission)) return true;
  // Platform admins can moderate classrooms they don't belong to.
  return (
    roleHasPermission(req.user?.role, PERMISSIONS.CLASSROOM_MODERATE) &&
    MODERATOR_CLASSROOM_PERMISSIONS.has(permission)
  );
};

/** Requires every listed classroom permission for the loaded classroom. */
export const requireClassroomPermission =
  (...permissions) =>
  (req, _res, next) => {
    if (!req.classroom) return next(new Error("loadClassroom() must run before requireClassroomPermission()"));
    if (permissions.every((permission) => hasClassroomPermission(req, permission))) return next();
    if (!req.classroomRole) {
      return next(ApiError.forbidden("You are not a member of this classroom", "NOT_A_MEMBER"));
    }
    return next(ApiError.forbidden("Your role in this classroom doesn't allow that", "INSUFFICIENT_CLASSROOM_ROLE"));
  };

/** Shorthand: load the classroom from the route and check permissions. */
export const classroomAccess = (...permissions) => [loadClassroom(), requireClassroomPermission(...permissions)];
