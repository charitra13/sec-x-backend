import { z } from 'zod';

export const createBlogSchema = z.object({
  body: z.object({
    title: z
      .string({
        required_error: 'Title is required',
      })
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title cannot exceed 200 characters'),
    excerpt: z
      .string({
        required_error: 'Excerpt is required',
      })
      .min(10, 'Excerpt must be at least 10 characters')
      .max(300, 'Excerpt cannot exceed 300 characters'),
    content: z
      .string({
        required_error: 'Content is required',
      })
      .min(50, 'Content must be at least 50 characters'),
    category: z
      .enum(['AI Security', 'Red Teaming', 'Penetration Testing', 'Security Architecture', 'Cybersecurity'], {
        required_error: 'Category is required',
      }),
    tags: z
      .array(z.string())
      .min(1, 'At least one tag is required')
      .max(10, 'Maximum 10 tags allowed'),
    status: z
      .enum(['draft', 'published'])
      .optional()
      .default('draft'),
    coverImage: z
      .string({
        required_error: 'Cover image is required',
      })
      .url('Cover image must be a valid URL'),
    seo: z.object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      metaKeywords: z.array(z.string()).max(10).optional()
    }).optional()
  })
});

export const updateBlogSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(5, 'Title must be at least 5 characters')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),
    excerpt: z
      .string()
      .min(10, 'Excerpt must be at least 10 characters')
      .max(300, 'Excerpt cannot exceed 300 characters')
      .optional(),
    content: z
      .string()
      .min(50, 'Content must be at least 50 characters')
      .optional(),
    category: z
      .enum(['AI Security', 'Red Teaming', 'Penetration Testing', 'Security Architecture', 'Cybersecurity'])
      .optional(),
    tags: z
      .array(z.string())
      .min(1, 'At least one tag is required')
      .max(10, 'Maximum 10 tags allowed')
      .optional(),
    status: z
      .enum(['draft', 'published'])
      .optional(),
    coverImage: z
      .string()
      .url('Cover image must be a valid URL')
      .optional(),
    seo: z.object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      metaKeywords: z.array(z.string()).max(10).optional()
    }).optional()
  })
}); 