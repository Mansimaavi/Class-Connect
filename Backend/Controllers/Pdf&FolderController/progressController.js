import Folder from "../../models/Folder.js";

export const getFolderWithUserProgress = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId)
      .lean();
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    const userId = req.user._id;
    let completedCount = 0;
    const pdfsWithUserProgress = folder.pdfs.map(pdf => {
      const userProgress = pdf.progressByUser.find(
        progress => progress.user.toString() === userId.toString()
      );
      if (userProgress?.completed) {
        completedCount++;
      }
      return {
        ...pdf,
        userCompleted: userProgress?.completed || false,
        updatedAt: userProgress?.updatedAt || null
      };
    });
    const progressPercentage = folder.pdfs.length > 0 
      ? Math.round((completedCount / folder.pdfs.length) * 100): 0;
    res.json({
      folder: {
        ...folder,
        pdfs: pdfsWithUserProgress,
        userProgressPercentage: progressPercentage,
        totalPdfs: folder.pdfs.length,
        completedPdfs: completedCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserProgress = async (req, res) => {
  try {
    const { completed } = req.body;
    const userId = req.user._id;
    const folder = await Folder.findById(req.params.folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }
    const pdf = folder.pdfs.id(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found' });
    }
    let userProgress = pdf.progressByUser.find(
      p => p.user.toString() === userId.toString()
    );
    if (userProgress) {
      userProgress.completed = completed;
      userProgress.updatedAt = new Date();
    } else {
      pdf.progressByUser.push({
        user: userId,
        completed,
        updatedAt: new Date()
      });
    }
    await folder.save();
    res.json({
      success: true,
      pdfId: req.params.pdfId,
      completed
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
