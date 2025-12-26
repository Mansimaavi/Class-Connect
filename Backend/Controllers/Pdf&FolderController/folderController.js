import Folder from "../../models/Folder.js";

export const createFolder = async (req, res) => {
  try {
    const { name, subject, uniqueKey } = req.body;
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }
    if (!name || !subject) {
      return res.status(400).json({ message: "Folder name and subject are required." });
    }
    const existingFolder = await Folder.findOne({ uniqueKey: { $regex: new RegExp(`^${uniqueKey}$`, "i") } });
    if (existingFolder) {
      return res.status(400).json({ message: "Unique key already in use. Try another key." });
    }
    const newFolder = new Folder({
      name,
      subject,
      uniqueKey,
      userId,
      createdBy: userId,
      members: [userId],
    });
    await newFolder.save();
    res.status(201).json({ folder: newFolder });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ message: "Error creating folder", error });
  }
};

export const joinFolder = async (req, res) => {
  try {
    const { key } = req.body;
    const userId = req.user._id;
    const folder = await Folder.findOne({ uniqueKey: key });
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    if (folder.members.includes(userId)) {
      return res.status(400).json({ message: "You have already joined this folder" });
    }
    folder.members.push(userId);
    await folder.save();
    res.status(200).json({ message: "Folder joined successfully", folder });
  } 
  catch (error) {
    console.error("Error joining folder:", error);
    res.status(500).json({ message: "Error joining folder", error });
  }
};

export const myfolders = async (req, res) => {
  try {
    const userId = req.user._id;
    const createdFolders = await Folder.find({ createdBy: userId }).populate("createdBy", "name email");
    const joinedFolders = await Folder.find({ members: userId }).populate("members", "name email");
    res.status(200).json({ createdFolders, joinedFolders });
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ message: "Error fetching folders", error });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const userId = req.user._id;
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    if (folder.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this folder" });
    }
    await Folder.findByIdAndDelete(folderId);
    res.status(200).json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ message: "Error deleting folder", error });
  }
};

export const leaveFolder = async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const userId = req.user._id;
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    if (!folder.members.includes(userId)) {
      return res.status(400).json({ message: "You are not a member of this folder" });
    }
    // Remove the user from folder members
    folder.members = folder.members.filter((member) => member.toString() !== userId.toString());
    await folder.save();
    res.status(200).json({ message: "You have left the folder successfully" });
  } catch (error) {
    console.error("Error leaving folder:", error);
    res.status(500).json({ message: "Error leaving folder", error });
  }
};

export const getFolderById = async (req, res) => {
  try {
    const folderId = req.params.folderId;
    const folder = await Folder.findById(folderId)
      .populate('createdBy', 'name email') 
      .populate('members', 'name email')  
      .exec();

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    res.json(folder);
  } catch (error) {
    console.error("Error fetching folder details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getFolderMembers = async (req, res) => {
  try {
    const { folderId } = req.params;
    const folder = await Folder.findById(folderId).populate("members", "name email");
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    res.status(200).json(folder.members);
  } catch (err) {
    console.error("Error fetching folder members:", err);
    res.status(500).json({ message: "Error fetching folder members" });
  }
};

