import express from "express";
import {
  changeMyEmail,
  changeMyPassword,
  getProfile,
  updateMyProfile,
} from "../Controllers/userController/userController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { authLimiter } from "../middleware/rateLimiters.js";
import validate from "../middleware/validate.js";
import {
  changeEmailSchema,
  changePasswordSchema,
  updateProfileSchema,
  userIdParams,
} from "../validators/userValidators.js";

const router = express.Router();

router.use(authenticate);

router.patch("/me", validate({ body: updateProfileSchema }), updateMyProfile);
router.patch("/me/email", authLimiter, validate({ body: changeEmailSchema }), changeMyEmail);
router.patch("/me/password", authLimiter, validate({ body: changePasswordSchema }), changeMyPassword);
router.get("/:userId", validate({ params: userIdParams }), getProfile);

export default router;
