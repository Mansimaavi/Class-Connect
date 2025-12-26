import express from "express";
import { AuthMiddleware, isSuperAdmin , isAdmin} from "../middleware/authMiddleware.js";
import { getAllUsers, deleteUser, promoteToAdmin, demoteAdmin ,unblockUser, blockUser,getUserLocation,getUserUploadsAndDownloads} from "../Controllers/AdminController/adminController.js";

const router = express.Router();

// Get all users (Admin Only)
router.get("/users", AuthMiddleware,isAdmin, getAllUsers);

// Delete user (Admin Only)
router.delete("/user/:userId", AuthMiddleware,isAdmin, deleteUser);

// Promote user to admin (Only Super Admin)
router.put("/promote", AuthMiddleware, isSuperAdmin, promoteToAdmin);

// Demote admin to user (Only Super Admin)
router.put("/demote", AuthMiddleware, isSuperAdmin, demoteAdmin);

router.put("/block", AuthMiddleware, blockUser);

router.put("/unblock", AuthMiddleware, unblockUser);

router.get('/locations', getUserLocation);

router.get('/user/:userId/stats', getUserUploadsAndDownloads);



export default router;
