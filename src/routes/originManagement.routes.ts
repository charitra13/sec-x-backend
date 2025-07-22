import { Router } from 'express';
import { getAllOrigins, addOrigin, updateOrigin, removeOrigin } from '../controllers/originManagement.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

router.get('/', getAllOrigins);
router.post('/', addOrigin);
router.put('/:originId', updateOrigin);
router.delete('/:originId', removeOrigin);

export default router; 