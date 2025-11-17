import { Router } from 'express';
import { createReview, listReviews } from '../controllers/reviewController.js';
import { protect, isReviewer } from '../middleware/authMiddleware.js';
import { uploadReview } from '../middleware/uploadMiddleware.js';
const router = Router();

// POST /api/reviews/:id -> submit a review for a paper (Reviewer)
router.post('/:id', protect, isReviewer, uploadReview.array('reviewFiles', 10), createReview);

// GET /api/reviews/:id -> list reviews for a paper
router.get('/:id', protect, listReviews);

export default router;
