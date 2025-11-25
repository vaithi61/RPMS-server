import { Router } from 'express';
import { submitPaper, listPapers, resubmitPaper, getPaperHistory } from '../controllers/paperController.js';
import { protect, isAuthor, isAdmin } from '../middleware/authMiddleware.js';
import { uploadPaper, uploadRevision } from '../middleware/uploadMiddleware.js';
const router = Router();

// POST /api/papers -> submit paper (Author)
router.post('/', protect, isAuthor, uploadPaper.single('paper'), submitPaper);

// GET /api/papers -> list papers (role-based)
router.get('/', protect, listPapers);

// POST /api/papers/:id/resubmit -> author resubmits revised file
router.post('/:id/resubmit', protect, isAuthor, uploadRevision.single('file'), resubmitPaper);

// GET /api/papers/:id/history -> history (access enforced in controller)
router.get('/:id/history', protect, getPaperHistory);

export default router;
