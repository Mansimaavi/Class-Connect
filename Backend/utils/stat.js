import User from "../models/User.js";
import Folder from "../models/Folder.js";

export const emitUpdatedStats = async (io) => {
  try {
    const [totalUsers, totalAdmins, totalUploads, totalDownloads] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      Folder.aggregate([
        { $unwind: { path: "$pdfs", preserveNullAndEmptyArrays: true } },
        { $count: "totalUploads" },
      ]),
      Folder.aggregate([
        { $unwind: { path: "$pdfs", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$pdfs.downloadedBy", preserveNullAndEmptyArrays: true } },
        { $count: "totalDownloads" },
      ]),
    ]);

    const stats = {
      totalUsers,
      totalAdmins,
      totalUploads: totalUploads[0]?.totalUploads || 0,
      totalDownloads: totalDownloads[0]?.totalDownloads || 0,
    };

    io.emit("stats-updated", stats);
  } catch (error) {
    console.error("Failed to emit updated stats:", error);
  }
};
