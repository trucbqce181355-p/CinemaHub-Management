import express from 'express';
import { 
    getUserProfile, 
    updateUserProfile, 
    changePassword,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

// Admin routes
router.route('/')
    .get(protect, admin, getUsers)
    .post(protect, admin, createUser);

router.route('/:id')
    .get(protect, admin, getUserById)
    .put(protect, admin, updateUser)
    .delete(protect, admin, deleteUser);

export default router;
