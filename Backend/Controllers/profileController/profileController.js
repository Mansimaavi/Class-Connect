import User from '../../models/User.js';
import Folder from '../../models/Folder.js';
import mongoose from 'mongoose';

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Folders created by the user
    const foldersCreated = await Folder.find({ createdBy: userId }).select('name subject uniqueKey');

    // Folders joined by the user (member)
    const foldersJoined = await Folder.find({ members: userId }).select('name subject uniqueKey pdfs');

    // Prepare progress info for joined folders
    const progressInfo = foldersJoined.map(folder => {
      const pdfProgress = folder.pdfs.map(pdf => {
        const isCompleted = pdf.updatedBy?.toString() === userId && pdf.completed;
        return {
          pdfName: pdf.name,
          completed: isCompleted,
          lastUpdated: pdf.progressUpdatedAt,
        };
      });

      return {
        folderName: folder.name,
        subject: folder.subject,
        uniqueKey: folder.uniqueKey,
        pdfProgress
      };
    });

    // Final response
    return res.status(200).json({
      userDetails: {
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        course:user.course,
        college:user.college,
        location: user.location,
      },
      foldersCreated,
      progressInJoinedFolders: progressInfo,
    });

  } catch (error) {
    console.error("Error fetching user details with folders:", error);
    res.status(500).json({ message: 'Server error' });
  }
};
