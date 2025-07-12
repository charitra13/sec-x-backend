import { Router } from 'express';
import { getProfile, getAllUsers, updateUser, deleteUser } from '../controllers/user.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

router.get('/profile', protect, getProfile);

// Admin routes
router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:userId', protect, authorize('admin'), updateUser);
router.delete('/:userId', protect, authorize('admin'), deleteUser);


export default router;