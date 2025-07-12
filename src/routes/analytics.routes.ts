import { Router } from 'express';
import {
  trackView,
  trackShare,
  getSummary,
  getPostPerformance,
  getPostDetails,
} from '../controllers/analytics.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/view/:blogId', trackView);
router.post('/share/:blogId', trackShare);

// Admin routes
router.get('/summary', protect, authorize('admin'), getSummary);
router.get('/posts', protect, authorize('admin'), getPostPerformance);
router.get('/posts/:blogId', protect, authorize('admin'), getPostDetails);

export default router; 