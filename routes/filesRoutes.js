import { Router } from 'express';
import { downloadFile } from '../controllers/filesController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/files/:id/download -> secure download (auth + role check)
router.get('/:id/download', protect, downloadFile);

export default router;
