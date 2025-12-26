import multer from 'multer';

const storage = multer.memoryStorage();

const uploadPdf = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, and PPT files are allowed.'));
    }
  }
}).single('pdf');
export default uploadPdf;



