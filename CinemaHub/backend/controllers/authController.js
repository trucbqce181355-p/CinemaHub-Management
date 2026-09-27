import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import sendEmail from '../utils/sendEmail.js';

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '10m',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường và 1 số.' });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create user
        const user = await User.create({
            username,
            email,
            password
        });

        if (user) {
            // Generate OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Hash OTP (optional for extra security, but plain text is okay for temp 6 digits, we'll store hashed)
            user.otp = crypto.createHash('sha256').update(otp).digest('hex');
            user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
            await user.save();

            // Send email
            const message = `Mã xác thực (OTP) của bạn là: ${otp}. Mã này có hiệu lực trong 10 phút.`;
            const htmlMessage = `
                <h3>Xác thực tài khoản</h3>
                <p>Mã xác thực (OTP) của bạn là: <strong>${otp}</strong></p>
                <p>Mã này có hiệu lực trong 10 phút.</p>
            `;

            try {
                await sendEmail({
                    email: user.email,
                    subject: 'CinemaHub - Xác thực tài khoản',
                    message: message,
                    html: htmlMessage
                });
                
                res.status(201).json({
                    message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.',
                    email: user.email
                });
            } catch (err) {
                console.error('Email OTP send error:', err);
                // Nếu gửi mail thất bại, phải xóa tài khoản vừa tạo để người dùng đăng ký lại
                await User.findByIdAndDelete(user._id);
                return res.status(500).json({ message: 'Không thể gửi email OTP. Vui lòng kiểm tra lại cấu hình Email của hệ thống.' });
            }
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await User.findOne({
            email,
            otp: hashedOtp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Xác thực tài khoản thành công' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email and include password for comparison
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            if (user.status === 'Locked') {
                return res.status(403).json({ message: 'User account is locked' });
            }
            if (user.isVerified === false) {
                return res.status(403).json({ message: 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email của bạn.' });
            }

            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này.' });
        }

        // Generate reset token (6 digit OTP)
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash token and set to resetPasswordToken field
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Set expire (10 minutes)
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save();
        
        const message = `Mã xác thực (OTP) khôi phục mật khẩu của bạn là: ${resetToken}. \n\nMã này có hiệu lực trong 10 phút.`;
        const htmlMessage = `
            <h3>Khôi phục mật khẩu</h3>
            <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu khôi phục mật khẩu.</p>
            <p>Mã xác thực (OTP) của bạn là: <strong style="font-size: 24px;">${resetToken}</strong></p>
            <p>Mã này có hiệu lực trong 10 phút. Nếu bạn không yêu cầu điều này, vui lòng bỏ qua email này.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'CinemaHub - Khôi phục mật khẩu',
                message: message,
                html: htmlMessage
            });

            res.status(200).json({ 
                message: 'Đã gửi liên kết khôi phục mật khẩu. Vui lòng kiểm tra email của bạn.',
            });
        } catch (error) {
            console.error('Email send error:', error);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();

            return res.status(500).json({ message: 'Không thể gửi email. Vui lòng thử lại sau.' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP for Password Reset
// @route   POST /api/auth/verify-reset-otp
// @access  Public
export const verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await User.findOne({
            email,
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn.' });
        }

        res.status(200).json({ message: 'Mã OTP hợp lệ.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        // Get hashed token
        const resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');

        const user = await User.findOne({
            email,
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() } // Must not be expired
        });

        if (!user) {
            return res.status(400).json({ message: 'Liên kết không hợp lệ hoặc đã hết hạn.' });
        }

        // Removed duplicate const { password } = req.body;
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường và 1 số.' });
        }

        // Set new password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({ message: 'Khôi phục mật khẩu thành công. Vui lòng đăng nhập lại.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
