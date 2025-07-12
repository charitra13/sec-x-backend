import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import Analytics from '../models/Analytics.model';
import Blog from '../models/Blog.model';
import { AppError } from '../utils/errors';

// @desc    Track a view for a blog post
// @route   POST /api/analytics/view/:blogId
// @access  Public
export const trackView = asyncHandler(async (req: Request, res: Response) => {
  const { blogId } = req.params;

  if (!blogId) {
    throw new AppError('Blog ID is required', 400);
  }

  const blog = await Blog.findById(blogId);
  if (!blog) {
    throw new AppError('Blog not found', 404);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Analytics.findOneAndUpdate(
    { post: blogId, date: today },
    { $inc: { views: 1 } },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, message: 'View tracked successfully' });
});

// @desc    Track a share for a blog post
// @route   POST /api/analytics/share/:blogId
// @access  Public
export const trackShare = asyncHandler(async (req: Request, res: Response) => {
  const { blogId } = req.params;

  if (!blogId) {
    throw new AppError('Blog ID is required', 400);
  }

  const blog = await Blog.findById(blogId);
  if (!blog) {
    throw new AppError('Blog not found', 404);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await Analytics.findOneAndUpdate(
    { post: blogId, date: today },
    { $inc: { shares: 1 } },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, message: 'Share tracked successfully' });
});

// @desc    Get overall analytics summary
// @route   GET /api/analytics/summary
// @access  Admin
export const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const totalPosts = await Blog.countDocuments();

  const analyticsSummary = await Analytics.aggregate([
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$views' },
        totalShares: { $sum: '$shares' },
      },
    },
  ]);

  const summary = {
    totalPosts,
    totalViews: analyticsSummary[0]?.totalViews || 0,
    totalShares: analyticsSummary[0]?.totalShares || 0,
  };

  res.status(200).json({ success: true, data: summary });
});

// @desc    Get performance data for all posts
// @route   GET /api/analytics/posts
// @access  Admin
export const getPostPerformance = asyncHandler(async (_req: Request, res: Response) => {
  const postPerformance = await Analytics.aggregate([
    {
      $group: {
        _id: '$post',
        totalViews: { $sum: '$views' },
        totalShares: { $sum: '$shares' },
      },
    },
    {
      $lookup: {
        from: 'blogs',
        localField: '_id',
        foreignField: '_id',
        as: 'postDetails',
      },
    },
    {
      $unwind: '$postDetails',
    },
    {
      $project: {
        _id: 0,
        post: {
          _id: '$postDetails._id',
          title: '$postDetails.title',
          slug: '$postDetails.slug',
        },
        totalViews: 1,
        totalShares: 1,
      },
    },
  ]);

  res.status(200).json({ success: true, data: postPerformance });
});

// @desc    Get detailed daily stats for a single post
// @route   GET /api/analytics/posts/:blogId
// @access  Admin
export const getPostDetails = asyncHandler(async (req: Request, res: Response) => {
  const { blogId } = req.params;

  if (!blogId) {
    throw new AppError('Blog ID is required', 400);
  }

  const blog = await Blog.findById(blogId);
  if (!blog) {
    throw new AppError('Blog not found', 404);
  }

  const dailyStats = await Analytics.find({ post: blogId })
    .sort({ date: 'asc' })
    .select('date views shares');

  res.status(200).json({ success: true, data: dailyStats });
}); 