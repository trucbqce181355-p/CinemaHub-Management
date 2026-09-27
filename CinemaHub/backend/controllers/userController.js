import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            phoneNumber: user.phoneNumber,
            dateOfBirth: user.dateOfBirth,
            role: user.role,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
        user.username = req.body.username || user.username;
        user.email = req.body.email || user.email;
        if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
        if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            phoneNumber: updatedUser.phoneNumber,
            dateOfBirth: updatedUser.dateOfBirth,
            role: updatedUser.role,
        });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
export const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (currentPassword === newPassword) {
        return res.status(400).json({ message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 8 ký tự, 1 chữ hoa, 1 chữ thường và 1 số.' });
    }
    
    // Find user with password included
    const user = await User.findById(req.user._id).select('+password');

    if (user && (await user.matchPassword(currentPassword))) {
        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } else {
        res.status(401).json({ message: 'Mật khẩu hiện tại không đúng' });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
    try {
        const filter = {};
        if (req.query.role) {
            filter.role = req.query.role;
        }
        const users = await User.find(filter).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new user (Admin)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req, res) => {
    try {
        const { username, email, password, role, status, isVerified } = req.body;
        
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            password,
            role: role || 'Customer',
            status: status || 'Active',
            isVerified: isVerified !== undefined ? isVerified : true
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            status: user.status
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (user) {
            // Protect default admin from role or status changes
            if (user.email === 'admin@cinemahub.com') {
                if (req.body.role && req.body.role !== 'Admin') {
                    return res.status(403).json({ message: 'Không thể hạ quyền của Admin mặc định' });
                }
                if (req.body.status && req.body.status !== 'Active') {
                    return res.status(403).json({ message: 'Không thể khóa tài khoản Admin mặc định' });
                }
            }

            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            user.role = req.body.role || user.role;
            user.status = req.body.status || user.status;
            
            if (req.body.permissions !== undefined) {
                user.permissions = req.body.permissions;
            }
            
            if (req.body.phoneNumber !== undefined) user.phoneNumber = req.body.phoneNumber;
            if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();
            res.json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                role: updatedUser.role,
                permissions: updatedUser.permissions,
                status: updatedUser.status
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (user) {
            if (user.email === 'admin@cinemahub.com') {
                return res.status(403).json({ message: 'Không thể xóa tài khoản Admin mặc định' });
            }
            await User.deleteOne({ _id: user._id });
            res.json({ message: 'User removed' });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
