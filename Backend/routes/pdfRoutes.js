import express from 'express';
import { 
    getPdfs , 
    uploadPdfToFolder, 
    updatePdfProgress, 
    downloadPDF 
} from '../Controllers/Pdf&FolderController/pdfController.js';
import {AuthMiddleware} from '../middleware/authMiddleware.js'
import uploadPdf from '../middleware/multerMiddleware.js';
import { getMostDownloadedPdf } from '../Controllers/Pdf&FolderController/pdfController.js';

const router = express.Router();

router.get('/:folderId/pdfs',getPdfs);
router.post('/:folderId/upload', AuthMiddleware ,uploadPdf,uploadPdfToFolder);
router.patch('/:folderId/:pdfId/progress', AuthMiddleware, updatePdfProgress);
router.get('/download', AuthMiddleware, downloadPDF);

router.get('/most-downloaded', getMostDownloadedPdf);


export default router;




