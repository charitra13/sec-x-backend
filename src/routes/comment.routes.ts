import { Router } from 'express';
import {
  createComment,
  getCommentsForBlog,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';
import { protect, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createCommentSchema, updateCommentSchema } from '../validators/comment.validator';

const router = Router({ mergeParams: true });

// Public route: anyone can view comments for a blog
router.get('/', getCommentsForBlog);

// Protected route: only authenticated users can create comments
router.post('/', protect, validate(createCommentSchema), createComment);

// Protected routes for updating / deleting own comment
router.put('/:commentId', protect, validate(updateCommentSchema), updateComment);
router.delete('/:commentId', protect, deleteComment);

export default router; 