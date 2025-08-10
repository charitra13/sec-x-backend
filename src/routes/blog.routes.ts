import { Router } from 'express';
import {
  createBlog,
  getAllBlogs,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  likeBlog,
  getMyBlogs,
  searchBlogs,
  validateAndFixBlogs
} from '../controllers/blog.controller';
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createBlogSchema, updateBlogSchema } from '../validators/blog.validator';
import commentRouter from './comment.routes';

const router = Router();

router.use('/:blogId/comments', commentRouter);

// Public routes with optional authentication
// This allows both public access AND admin context when authenticated
router.get('/', optionalAuth, getAllBlogs);
router.get('/search', optionalAuth, searchBlogs);
router.get('/slug/:slug', optionalAuth, getBlogBySlug);

// Protected routes – user must be authenticated
router.get('/my-blogs', protect, getMyBlogs);
router.post('/:id/like', protect, likeBlog);

// Admin/Author routes – user must be admin
router.post('/', protect, authorize('admin'), validate(createBlogSchema), createBlog);
router.put('/:id', protect, authorize('admin'), validate(updateBlogSchema), updateBlog);
router.delete('/:id', protect, authorize('admin'), deleteBlog);
router.post('/validate-and-fix', protect, authorize('admin'), validateAndFixBlogs);

export default router; 