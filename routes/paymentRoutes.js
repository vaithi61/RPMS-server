import express from 'express';
import multer from 'multer'; // Import multer
import { submitPayment, updatePaymentStatus, listAllPayments, listPaymentsByAuthor } from '../controllers/paymentController.js'; // Updated imports
import { protect, isAuthor, isAdmin } from '../middleware/authMiddleware.js';
import { uploadPaymentProof } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/submit', protect, isAuthor, (req, res, next) => {
  uploadPaymentProof.single('proof')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // An unknown error occurred when uploading.
      return res.status(500).json({ message: err.message });
    }
    next();
  });
}, submitPayment);

router.get('/', protect, isAdmin, listAllPayments); // Route to list all payments
router.get('/my-payments', protect, isAuthor, listPaymentsByAuthor); // New route to list payments for the current author
router.put('/update-status/:paymentId', protect, isAdmin, updatePaymentStatus); // Route to update payment status

export default router;
