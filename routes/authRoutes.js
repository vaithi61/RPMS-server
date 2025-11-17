import { Router } from 'express';
import { register, verifyEmail, login, forgotPassword, resetPassword, refresh, resendVerification } from '../controllers/authController.js';
const router = Router();

router.post('/register', register);
router.get('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh', refresh);
router.post('/resend-verification', resendVerification);

export default router;
