import express from 'express';
import { registerUser, loginUser, forgotPassword, resetPassword, verifyOTP, verifyResetOtp } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-otp', verifyOTP);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOtp);
router.post('/reset-password', resetPassword);

export default router;
