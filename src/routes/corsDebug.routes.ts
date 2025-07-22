import { Router } from 'express';
import { getCORSStatus, getCORSAlerts, testCORSOrigin } from '../controllers/corsDebug.controller';
import { protect, authorize } from '../middleware/auth.middleware';

const router = Router();

// Public CORS status endpoint (for debugging)
router.get('/status', getCORSStatus);

// Protected admin endpoints
router.use(protect);
router.use(authorize('admin'));

router.get('/alerts', getCORSAlerts);
router.post('/test-origin', testCORSOrigin);

export default router; 