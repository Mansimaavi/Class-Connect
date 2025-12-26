import User from "../../models/User.js";
import Folder from "../../models/Folder.js";
import mongoose from 'mongoose';
import { emitUpdatedStats } from "../../utils/Stat.js";

export const getAllUsers = async (req, res) => {
  try {

    const { filterType, role } = req.query;
    let filter = {};
    let sortOptions = {};

    // ✅ Filter by role
    if (filterType === "role" && role) {
      filter.role = role; // Filter users by role
    }

    // ✅ Sorting Logic
    if (filterType === "lastLogin") {
      sortOptions.lastLogin = -1;  // Most recent logins first
    } else if (filterType === "uploads") {
      sortOptions.uploadsCount = -1;  // Most uploads first
    } else if (filterType === "downloads") {
      sortOptions.downloadsCount = -1;  // Most downloads first
    } else {
      sortOptions = { lastLogin: -1, createdAt: -1 }; // Default: Most recent login first
    }

    // ✅ Fetch users with filters and sorting
    
      const users = await User.find(filter, "-password").sort(sortOptions);
      res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", error });
  }
};


// Delete a user by ID (Admin Only)
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete folders created by the user
    await Folder.deleteMany({ creator: userId });

    // Remove user from any folders they have joined
    await Folder.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    // Delete the user
    await User.deleteOne({ _id: userId });
    await emitUpdatedStats(req.app.get("io"));

    res.status(200).json({ message: "User and their folders deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// 🚀 Promote User to Admin (Only Super Admin Can Do This)
export const promoteToAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if the logged-in user is a superadmin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Only superadmin can promote users." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(400).json({ message: "User is already an admin" });
    }

    // Check if the user is a superadmin
    if (user.role === "superadmin") {
      return res.status(400).json({ message: "Cannot promote superadmin to admin" });
    }

    user.role = "admin";
    await user.save();
    await emitUpdatedStats(req.app.get("io"));

    res.status(200).json({ message: "User promoted to admin successfully" });
  } catch (error) {
    console.error("Error promoting user to admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//  Demote Admin to Regular User (Only Super Admin Can Do This)
export const demoteAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    // Check if the logged-in user is a superadmin
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Access denied. Only superadmin can demote users." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res.status(400).json({ message: "User is not an admin" });
    }

    // Check if the user is a superadmin
    if (user.role === "superadmin") {
      return res.status(400).json({ message: "Cannot demote superadmin" });
    }

    user.role = "user";
    await user.save();
    await emitUpdatedStats(req.app.get("io"));

    res.status(200).json({ message: "Admin demoted to regular user successfully" });
  } catch (error) {
    console.error("Error demoting admin:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


// Admin blocks a user
export const blockUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = true;
    await user.save();
    await emitUpdatedStats(req.app.get("io"));

    res.status(200).json({ message: "User has been blocked." });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin unblocks a user
export const unblockUser = async (req, res) => {
  try {
    // console.log("user",req.user._id )
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = false;
    user.warnings = 0; // Reset warnings
    await user.save();
    await emitUpdatedStats(req.app.get("io"));

    res.status(200).json({ message: "User has been unblocked." });
  } catch (error) {
    console.error("Error unblocking user:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getUserLocation = async (req, res) => {
  try {
    // Fetch all users and select only name, latitude, and longitude
    const users = await User.find({}).select('name location'); 

    // If no users found
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Map over the users and return their name and location (latitude, longitude)
    const userLocations = users.map((user) => ({
      name: user.name,
      latitude: user.location.latitude,
      longitude: user.location.longitude,
    }));

    // Return all users' locations
    return res.json(userLocations);
  } catch (error) {
    // Log and return the error if something goes wrong
    console.error('Error fetching users location:', error);
    return res.status(500).json({ message: 'Error fetching users locations' });
  }
};
export const getUserUploadsAndDownloads = async (req, res) => {
  const { userId } = req.params;

  try {
    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Aggregate to get the total uploads by the user
    const totalUploads = await Folder.aggregate([
      { $unwind: { path: "$pdfs", preserveNullAndEmptyArrays: true } },
      {
        $match: {
          "pdfs.uploadedBy": new mongoose.Types.ObjectId(userId),
        },
      },
      { $count: "totalUploads" },
    ]);

    // Aggregate to get the total downloads by the user
    const totalDownloads = await Folder.aggregate([
      { $unwind: { path: "$pdfs", preserveNullAndEmptyArrays: true } },
      { $unwind: "$pdfs.downloadedBy" },
      {
        $match: {
          "pdfs.downloadedBy.user": new mongoose.Types.ObjectId(userId),
        },
      },
      { $count: "totalDownloads" },
    ]);

    // Aggregate to get the total folders created by the user
    const totalCreatedFolders = await Folder.aggregate([
      { $match: { "createdBy": new mongoose.Types.ObjectId(userId) } },
      { $count: "totalCreatedFolders" },
    ]);

    // Aggregate to get the total folders joined by the user
    const totalJoinedFolders = await Folder.aggregate([
      { $match: { "joinedUsers": new mongoose.Types.ObjectId(userId) } },
      { $count: "totalJoinedFolders" },
    ]);

    // Send the response
    return res.status(200).json({
      totalUploads: totalUploads[0] ? totalUploads[0].totalUploads : 0,
      totalDownloads: totalDownloads[0] ? totalDownloads[0].totalDownloads : 0,
      totalCreatedFolders: totalCreatedFolders[0] ? totalCreatedFolders[0].totalCreatedFolders : 0,
      totalJoinedFolders: totalJoinedFolders[0] ? totalJoinedFolders[0].totalJoinedFolders : 0,
    });
  } catch (error) {
    console.error("Error fetching uploads, downloads, and folder counts:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
};
