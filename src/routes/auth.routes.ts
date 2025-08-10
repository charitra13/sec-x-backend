import { Router } from 'express';
import { 
  register, 
  login, 
  logout, 
  logoutAll, 
  checkUsernameAvailability 
} from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { protect } from '../middleware/auth.middleware';

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
 * @route   POST /api/auth/logout
 * @desc    Logout current session
 * @access  Private
 */
router.post('/logout', protect, logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', protect, logoutAll);

/**
 * @route   GET /api/auth/check-username/:username
 * @desc    Check if a username is available
 * @access  Public
 */
router.get('/check-username/:username', checkUsernameAvailability);

export default router;