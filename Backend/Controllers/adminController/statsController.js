import User from "../../models/User.js";
import Folder from "../../models/Folder.js"; // Assuming this is your File model
export const search = async (req, res)=>{
  try {
    const { query } = req.query;

    // Search for users by username, name, or email
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } }, // Case-insensitive search
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }); 

    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error', error });
  }
}
export const getUserStats = async (req, res) => {
  try {
    const { timeRange } = req.query;
    let startDate = new Date();

    switch (timeRange) {
      case 'last24hours':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case 'last7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'lastYear':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = null;
    }


    const activeUsersCount = await User.countDocuments(
      startDate ? { lastLogin: { $gte: startDate } } : {}
    );

    const totalUploads = await Folder.aggregate([
      { $unwind: { path: "$pdfs", preserveNullAndEmptyArrays: true } },
      { $match: startDate ? { "pdfs.createdAt": { $gte: startDate } } : {} },
      { $count: "totalUploads" },
    ]);
    
    const totalDownloads = await Folder.aggregate([
      { $unwind: "$pdfs" },
      { $unwind: "$pdfs.downloadedBy" },
      { $match: { "pdfs.downloadedBy.date": { $gte: startDate } } },
      { $count: "totalDownloads" }
    ]);
    

    // ✅ ACTUAL AGGREGATION to get most active users
    const topPerformers = await Folder.aggregate([
      { $unwind: "$pdfs" },
      {
        $match: {
          "pdfs.completed": true,
          "pdfs.updatedBy": { $ne: null }, // Ensure 'updatedBy' is not null
        },
      },
      {
        $group: {
          _id: "$pdfs.updatedBy",
          completedCount: { $sum: 1 },
        },
      },
      {
        $sort: { completedCount: -1 },
      },
      {
        $project: {
          _id: 0,
          completedCount: 1,
        },
      },
      { $limit: 5 }, // Get top 5 performers
    ]);
   
    res.status(200).json({
      activeUsersCount,
      totalUploads: totalUploads[0]?.totalUploads || 0,
      totalDownloads: totalDownloads[0]?.totalDownloads || 0,
      topPerformers,
    });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Fetch general statistics
export const getStats = async (req, res) => {
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
      totalUploads: totalUploads.length > 0 ? totalUploads[0].totalUploads : 0,
      totalDownloads: totalDownloads.length > 0 ? totalDownloads[0].totalDownloads : 0,
    };
    const io = req.app.get("io");
    // Emit the stats update to all connected clients
    io.emit('stats-updated', stats);

    res.status(200).json(stats);
  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


