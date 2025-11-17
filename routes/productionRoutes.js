import express from 'express';
import { uploadFinalFile, updatePublicationStatus } from '../controllers/productionController.js';
import { protect, isProductionEditor } from '../middleware/authMiddleware.js';
import { uploadFinalFile as uploadFinalFileMiddleware } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/upload-final/:paperId', protect, isProductionEditor, uploadFinalFileMiddleware.single('finalFile'), uploadFinalFile);
router.put('/update-status', protect, isProductionEditor, updatePublicationStatus);

export default router;
