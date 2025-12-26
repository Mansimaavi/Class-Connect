const Note = require('../../models/Note');

// Handle file upload and save data in the database
const uploadNote = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const pdfUrl = req.file.path; // Path to the uploaded PDF file

    const newNote = new Note({
      pdfUrl,
      rating,
      review,
    });

    await newNote.save();
    res.status(200).json({ message: 'File uploaded successfully!' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error uploading file.' });
  }
};

module.exports = { uploadNote };
