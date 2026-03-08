import express from 'express';
import { login, logout, verifyToken, changePassword, updateMe, sendOTP, verifyOTP, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/verify', protect, verifyToken);
router.post('/change-password', protect, changePassword);
router.put('/me', protect, updateMe);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

export default router;
