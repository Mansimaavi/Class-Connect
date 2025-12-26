import express from 'express';
import { getWhiteboard, saveWhiteboard } from '../Controllers/whiteboardController.js';

const router = express.Router();

router.get('/:roomId', getWhiteboard);
router.post('/:roomId', saveWhiteboard);

export default router;