import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import Comment from '../models/Comment.model';
import Blog from '../models/Blog.model';
import { AppError } from '../utils/errors';
import { IUser } from '../models/User.model';
import { IAuthRequest } from '../middleware/auth.middleware';

// @desc    Create a new comment
// @route   POST /api/blogs/:blogId/comments
// @access  Private
export const createComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { blogId } = req.params;
  const { text } = req.body;
  const author = req.user?.id;

  const blog = await Blog.findById(blogId);

  if (!blog) {
    throw new AppError('Blog not found', 404);
  }

  const comment = await Comment.create({
    text,
    author,
    blog: blogId,
  });

  res.status(201).json({
    success: true,
    data: comment,
  });
});

// @desc    Get all comments for a blog
// @route   GET /api/blogs/:blogId/comments
// @access  Public
export const getCommentsForBlog = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { blogId } = req.params;

  const comments = await Comment.find({ blog: blogId }).populate('author', 'name avatar');

  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments,
  });
});

// @desc    Update a comment
// @route   PUT /api/comments/:commentId
// @access  Private
export const updateComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { commentId } = req.params;
  const { text } = req.body;
  const userId = req.user?.id;

  let comment = await Comment.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.author.toString() !== userId?.toString() && req.user?.role !== 'admin') {
    throw new AppError('Not authorized to update this comment', 403);
  }

  comment.text = text;
  comment = await comment.save();

  res.status(200).json({
    success: true,
    data: comment,
  });
});

// @desc    Delete a comment
// @route   DELETE /api/comments/:commentId
// @access  Private
export const deleteComment = asyncHandler(async (req: IAuthRequest, res: Response) => {
  const { commentId } = req.params;
  const userId = req.user?.id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  if (comment.author.toString() !== userId?.toString() && req.user?.role !== 'admin') {
    throw new AppError('Not authorized to delete this comment', 403);
  }

  await Comment.deleteOne({ _id: commentId });

  res.status(200).json({
    success: true,
    data: {},
  });
}); 