import express from "express";
import { listMyNotifications, markAllRead, markRead } from "../Controllers/notificationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import validate from "../middleware/validate.js";
import { listNotificationsQuery, notificationParams } from "../validators/contentValidators.js";

const router = express.Router();

router.use(authenticate);

router.get("/", validate({ query: listNotificationsQuery }), listMyNotifications);
router.patch("/read-all", markAllRead);
router.patch("/:notificationId/read", validate({ params: notificationParams }), markRead);

export default router;
