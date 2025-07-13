import { Router } from 'express';
import {
  createComment,
  getCommentsForBlog,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';
import { protect } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createCommentSchema, getCommentsSchema, updateCommentSchema, deleteCommentSchema } from '../validators/comment.validator';

const router = Router({ mergeParams: true });

// Public route: anyone can view comments for a blog
router.get('/', validate(getCommentsSchema), getCommentsForBlog);

// Protected route: only authenticated users can create comments
router.post('/', protect, validate(createCommentSchema), createComment);

// Protected routes for updating / deleting own comment
router.put('/:commentId', protect, validate(updateCommentSchema), updateComment);
router.delete('/:commentId', protect, validate(deleteCommentSchema), deleteComment);

export default router; 