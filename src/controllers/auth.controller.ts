import { Request, Response, NextFunction } from 'express';
import User from '../models/User.model';
import { generateToken } from '../utils/jwt.utils';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/errors';

/**
 * Registers a new user.
 * @route POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, username, email, password } = req.body;

    // Check if user already exists by email OR username
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictError('User with this email already exists');
      }
      if (existingUser.username === username) {
        throw new ConflictError('Username is already taken');
      }
    }

    // Create and save the new user
    const user = new User({ name, username, email, password });
    await user.save();

    // Generate a token
    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username
    });

    // Send response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logs in an existing user.
 * @route POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { emailOrUsername, password } = req.body;

    // Find user by email OR username
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername.toLowerCase() },
        { username: emailOrUsername.toLowerCase() }
      ]
    }).select('+password');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Check if the password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate a token
    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      username: user.username
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Checks if a username is available.
 * @route GET /api/auth/check-username/:username
 */
export const checkUsernameAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username } = req.params as { username: string };
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    res.status(200).json({ available: !existingUser });
  } catch (error) {
    next(error);
  }
};