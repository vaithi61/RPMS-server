import { Router } from 'express';
import { searchUsers, assignEditor, reassignEditor, addNewEditor, manageUser } from '../controllers/adminController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/users', protect, isAdmin, searchUsers);
router.post('/assign-editor', protect, isAdmin, assignEditor);
router.post('/reassign-editor', protect, isAdmin, reassignEditor);
router.post('/add-editor', protect, isAdmin, addNewEditor);
router.post('/manage-user', protect, isAdmin, manageUser);

export default router;
