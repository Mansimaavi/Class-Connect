import Folder from '../../models/Folder.js';
import cloudinary from '../../utils/Cloudinary.js'; 
import { io } from '../../index.js'; 
import { Readable } from 'stream';
import https from 'https';
import { emitFileDownloaded } from '../../index.js'; 

export const getPdfs = async (req, res) => {
  const { folderId } = req.params;
  try {
    const folder = await Folder.findById(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found." });
    }
    res.status(200).json(folder); 
  } 
  catch (error) {
    console.error("Error fetching PDFs:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper to convert buffer to stream
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

export const uploadPdfToFolder = async (req, res) => {
  const { folderId } = req.params;
  if (!folderId) {
    return res.status(400).json({ message: "Folder ID is required for this route" });
  }
  try {
    const folder = await Folder.findById(folderId).populate('members');
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    // Wrap stream upload inside a Promise to await it
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `pdfs/${folderId}`,
          timeout: 60000,
          type: 'upload',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      bufferToStream(file.buffer).pipe(uploadStream);
    });
    if (!folder.pdfs) {
      folder.pdfs = [];
    }
    const pdf = {
      name: file.originalname,
      path: result.secure_url,
      publicId: result.public_id,
      folderId: folder._id,
      createdAt: new Date(),
    };
    folder.pdfs.push(pdf);
    await folder.save();
    io.emit('notification', {
      type: 'PDF_UPLOADED',
      message: `A new PDF "${file.originalname}" has been uploaded to the folder "${folder.name}".`,
      folderId: folder._id,
    });
    res.status(200).json({ message: "PDF uploaded successfully", pdf });
  } 
  catch (error) {
    console.error("Error uploading PDF:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePdfProgress = async (req, res) => {
  const { folderId, pdfId } = req.params;
  const { completed } = req.body;
  const userId = req.user._id;
  try {
    const folder = await Folder.findById(folderId);
    if (!folder) { 
      return res.status(404).json({ message: 'Folder not found' }); 
    }
    const pdf = folder.pdfs.id(pdfId);
    if (!pdf) {
      return res.status(404).json({ message: 'PDF not found in folder' });
    }
    let userProgress = pdf.progressByUser.find(
      (entry) => entry.user.toString() === userId.toString()
    );
    if (userProgress) {
      userProgress.completed = completed;
      userProgress.updatedAt = new Date();
    } else {
      pdf.progressByUser.push({
        user: userId,
        completed,
        updatedAt: new Date(),
      });
    }
    await folder.save();
    res.status(200).json({ 
      message: 'PDF progress updated successfully',
      progress: {
        completed,
        updatedAt: new Date()
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const downloadPDF = async (req, res) => {
    try {
        const fileUrl = decodeURIComponent(req.query.url);
        const userId = req.user?._id; 
        const pdfId = req.query.pdfId; 
        if (!fileUrl || !pdfId ) {
            return res.status(400).json({ message: 'File URL and PDF ID are required' });
        }
        const folder = await Folder.findOne({ "pdfs._id": pdfId });
        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }
        const pdf = folder.pdfs.id(pdfId);
        if (!pdf) {
            return res.status(404).json({ message: 'PDF not found' });
        }
        if (userId && !pdf.downloadedBy.includes(userId)) {
            pdf.downloadedBy.push(userId);
            await folder.save(); 
        }
        emitFileDownloaded( userId); 
        res.setHeader('Content-Disposition', `attachment; filename="${pdf.name}"`);
        res.setHeader('Content-Type', 'application/pdf');
        // Stream the file from Cloudinary
        https.get(fileUrl, (fileStream) => {
            fileStream.pipe(res);
        }).on('error', (err) => {
            console.error('Error fetching file:', err);
            res.status(500).json({ message: 'Error downloading file' });
        });
    } 
    catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
// Get the most downloaded PDF across all folders
export const getMostDownloadedPdf = async (req, res) => {
  try {
    const folders = await Folder.find({});
    let mostDownloaded = null;
    let maxDownloads = 0;

    folders.forEach(folder => {
      folder.pdfs.forEach(pdf => {
        const downloads = pdf.downloadedBy?.length || 0;
        if (downloads > maxDownloads) {
          maxDownloads = downloads;
          mostDownloaded = {
            ...pdf.toObject(),
            folderId: folder._id,
            folderName: folder.name,
          };
        }
      });
    });

    if (!mostDownloaded) {
      return res.status(404).json({ message: "No PDFs found" });
    }

    res.status(200).json({ pdf: mostDownloaded });
  } catch (err) {
    console.error("Error fetching most downloaded PDF:", err);
    res.status(500).json({ message: "Server error" });
  }
};

