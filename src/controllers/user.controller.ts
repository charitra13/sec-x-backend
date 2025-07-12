import { Request, Response } from 'express';
import User from '../models/User.model';
import { AppError, NotFoundError } from '../utils/errors';
import asyncHandler from '../utils/asyncHandler';

// Extend Express Request type to include user
interface IRequest extends Request {
  user?: { id: string; role: string };
}

/**
 * Gets the authenticated user's profile.
 * @route GET /api/users/profile
 */
export const getProfile = asyncHandler(async (req: IRequest, res: Response) => {
  const user = await User.findById(req.user?.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.status(200).json({ success: true, data: user });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await User.find({});
  res.status(200).json({ success: true, data: users });
});

// @desc    Update user details
// @route   PUT /api/users/:userId
// @access  Admin
export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { name, email, role, bio, isActive } = req.body;

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.name = name ?? user.name;
  user.email = email ?? user.email;
  user.role = role ?? user.role;
  user.bio = bio ?? user.bio;
  user.isActive = isActive ?? user.isActive;

  const updatedUser = await user.save();

  res.status(200).json({ success: true, data: updatedUser });
});

// @desc    Delete a user
// @route   DELETE /api/users/:userId
// @access  Admin
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  await user.deleteOne();

  res.status(200).json({ success: true, data: {} });
});