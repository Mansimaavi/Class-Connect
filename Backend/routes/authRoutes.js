import express from "express";
import { register, login, logout,sendotp } from "../Controllers/AuthController/authController.js";
import { AuthMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout",AuthMiddleware, logout);
router.post("/sendotp",sendotp);

export default router;
