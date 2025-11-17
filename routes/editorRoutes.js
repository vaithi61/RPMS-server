import { Router } from 'express';
import { assignReviewers, makeFinalDecision, addNewReviewer, searchReviewers } from '../controllers/editorController.js';
import { protect, isEditor } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/search-reviewers', protect, isEditor, searchReviewers); // New route for searching reviewers
router.post('/assign-reviewers', protect, isEditor, assignReviewers);
router.post('/make-final-decision', protect, isEditor, makeFinalDecision); // Corrected route name
router.post('/add-reviewer', protect, isEditor, addNewReviewer); // New route for adding reviewer

export default router;
