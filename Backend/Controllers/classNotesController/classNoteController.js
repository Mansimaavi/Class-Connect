import mongoose from "mongoose";
import Pdf from "../../models/Pdf.js";
import User from "../../models/User.js";
import { Readable } from 'stream';
import cloudinary from '../../utils/Cloudinary.js';


export const getClassNotes = async (req, res) => {
  try {
   const notes = await Pdf.find({})
  .populate({ path: "uploadedBy", select: "name email" })
  .populate({ path: "reviews.user", select: "name email", strictPopulate: false }) // 🔧 FIXED
  .exec();
    const enhancedNotes = notes.map((note) => {
      const ratingCount = note.ratings?.length || 0;
      const avgRating = ratingCount
        ? note.ratings.reduce((acc, r) => acc + r.rating, 0) / ratingCount
        : null;

      return {
        ...note.toObject(),
        averageRating: avgRating?.toFixed(1),
        ratingCount,
        reviews: note.reviews?.map((r) => ({
          user: r.user,
          review: r.review,
          createdAt: r.createdAt,
        })),
      };
    });

    res.status(200).json(enhancedNotes);
  } catch (error) {
    console.error("❌ Error in getClassNotes:", error.message);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);
  return readable;
};

export const uploadClassNote = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const { topic, uploadedBy } = req.body;
    if (!topic || !uploadedBy) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!mongoose.Types.ObjectId.isValid(uploadedBy)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }
    const objectIdUserId = new mongoose.Types.ObjectId(uploadedBy);
    const user = await User.findById(objectIdUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `class_notes`,
          timeout: 60000,
          type: "upload",
        },
        (error, result) => {
          if (error) {
            reject(error);
          }
          else {
            resolve(result);
          }
        }
      );
      bufferToStream(req.file.buffer).pipe(stream);
    });
    const newNote = new Pdf({
      name: req.file.originalname,
      path: result.secure_url,
      publicId: result.public_id,
      uploadedBy: objectIdUserId,
      topic,
      ratings: [],
    });
    await newNote.save();

    res.status(201).json({
      message: "Class note uploaded successfully",
      note: newNote,
      uploadedBy: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error uploading class note:", error);
    res.status(500).json({ 
      message: "Server error",
      error: error.message 
    });
  }
};

export const ratePdf = async (req, res) => {
  try {
    const { pdfId, rating } = req.body;
    const userId = req.user._id; 
    if (!pdfId || !rating) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    const objectIdPdfId = new mongoose.Types.ObjectId(pdfId);
    const objectIdUserId = new mongoose.Types.ObjectId(userId);
    const pdf = await Pdf.findById(objectIdPdfId);
    if (!pdf) {
      return res.status(404).json({ message: "PDF not found" });
    }
    const existingRating = pdf.ratings.find((r) => r.userId.toString() === userId.toString());
    if (existingRating) {
      existingRating.rating = rating;
    } else {
      pdf.ratings.push({ userId: objectIdUserId, rating });
    }
    pdf.averageRating =
      pdf.ratings.reduce((acc, curr) => acc + curr.rating, 0) / pdf.ratings.length;

    await pdf.save();

    res.status(200).json({ message: "Rating added successfully", averageRating: pdf.averageRating });
  } catch (error) {
    console.error("❌ Error rating PDF:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
export const submitReview = async (req, res) => {
  try {
    const { pdfId, rating, review } = req.body;
    const userId = req.user._id;
    if (!pdfId || !rating || !review) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const note = await Pdf.findById(pdfId);
    if (!note) return res.status(404).json({ message: "PDF not found" });
    if (!Array.isArray(note.reviews)) note.reviews = [];
    if (!Array.isArray(note.ratings)) note.ratings = [];
    const existingRating = note.ratings.find(r => r.userId.toString() === userId.toString());
    if (existingRating) {
      existingRating.rating = rating;
    } else {
      note.ratings.push({ userId, rating });
    }
    note.reviews.push({
      user: userId,
      review,
      createdAt: new Date(),
    });
    note.averageRating =
      note.ratings.reduce((acc, r) => acc + r.rating, 0) / note.ratings.length;

    await note.save();
    res.status(200).json({ message: "Review submitted successfully" });
  } 
  catch (error) {
    console.error("❌ Error submitting review:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
