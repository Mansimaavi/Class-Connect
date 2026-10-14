import express from "express";
import {
  activityFeed,
  deleteUser,
  listUsers,
  overviewStats,
  rangeStats,
  updateUserRole,
  updateUserStatus,
  userActivity,
  userLocations,
} from "../Controllers/adminController/adminController.js";
import { PERMISSIONS as P } from "../config/permissions.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/rbac.js";
import validate from "../middleware/validate.js";
import {
  activityQuery,
  listUsersQuery,
  statsQuery,
  updateRoleSchema,
  updateStatusSchema,
  userIdParams,
} from "../validators/userValidators.js";

const router = express.Router();

router.use(authenticate);

router.get("/users", requirePermission(P.USER_READ), validate({ query: listUsersQuery }), listUsers);
router.patch(
  "/users/:userId/role",
  requirePermission(P.USER_ROLE_UPDATE),
  validate({ params: userIdParams, body: updateRoleSchema }),
  updateUserRole
);
router.patch(
  "/users/:userId/status",
  requirePermission(P.USER_BLOCK),
  validate({ params: userIdParams, body: updateStatusSchema }),
  updateUserStatus
);
router.delete("/users/:userId", requirePermission(P.USER_DELETE), validate({ params: userIdParams }), deleteUser);

router.get("/stats/overview", requirePermission(P.STATS_READ), overviewStats);
router.get("/stats", requirePermission(P.STATS_READ), validate({ query: statsQuery }), rangeStats);
router.get("/activity", requirePermission(P.STATS_READ), validate({ query: activityQuery }), userActivity);
router.get("/locations", requirePermission(P.USER_READ), userLocations);
router.get("/notifications", requirePermission(P.STATS_READ), activityFeed);

export default router;
