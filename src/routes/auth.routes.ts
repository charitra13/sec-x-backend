import { Router } from 'express';
import { register, login, checkUsernameAvailability } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post('/login', validate(loginSchema), login);

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check if a username is available
 * @access  Public
 */
router.get('/check-username/:username', checkUsernameAvailability);

export default router;