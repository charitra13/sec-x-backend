import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Name is required',
      })
      .min(1, 'Name is required')
      .max(50, 'Name cannot exceed 50 characters'),
    username: z
      .string({
        required_error: 'Username is required',
      })
      .min(3, 'Username must be at least 3 characters long')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-z0-9._]+$/, 'Username can only contain letters, numbers, dots, and underscores'),
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    emailOrUsername: z
      .string({
        required_error: 'Email or username is required',
      })
      .min(1, 'Email or username is required'),
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long'),
  }),
});