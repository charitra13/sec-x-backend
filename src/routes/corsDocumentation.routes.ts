import { Router } from 'express';
import { getCORSDocumentation, getCORSSchema } from '../controllers/corsDocumentation.controller';

const router = Router();

// Public documentation endpoints
router.get('/docs', getCORSDocumentation);
router.get('/schema', getCORSSchema);

export default router; 