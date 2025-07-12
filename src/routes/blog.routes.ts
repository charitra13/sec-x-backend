import { Router } from 'express';
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  likeBlog,
  getMyBlogs,
  searchBlogs
} from '../controllers/blog.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createBlogSchema, updateBlogSchema } from '../validators/blog.validator';
import commentRouter from './comment.routes';

const router = Router();

router.use('/:blogId/comments', commentRouter);

// Public routes
router.get('/', getAllBlogs);
router.get('/search', searchBlogs);
router.get('/slug/:slug', getBlogBySlug);

// Protected routes – user must be authenticated
router.get('/my-blogs', protect, getMyBlogs);
router.post('/:id/like', protect, likeBlog);

// Admin/Author routes – user must be admin
router.post('/', protect, authorize('admin'), validate(createBlogSchema), createBlog);
router.put('/:id', protect, authorize('admin'), validate(updateBlogSchema), updateBlog);
router.delete('/:id', protect, authorize('admin'), deleteBlog);

export default router; 