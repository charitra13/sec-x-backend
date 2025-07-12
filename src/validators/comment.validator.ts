import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Comment text is required').max(1000, 'Comment cannot exceed 1000 characters'),
  }),
  params: z.object({
    blogId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid blog ID'),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Comment text is required').max(1000, 'Comment cannot exceed 1000 characters'),
  }),
  params: z.object({
    commentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid comment ID'),
  }),
}); 