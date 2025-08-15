import rateLimit from 'express-rate-limit';
import { IAuthRequest } from './auth.middleware';

// Rate limiter specifically for contact form submissions
export const contactSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 contact submissions per windowMs
  message: {
    success: false,
    message: 'Too many contact submissions from this IP. Please try again after 15 minutes.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for admin users
  skip: (req: IAuthRequest) => {
    return req.user?.role === 'admin';
  }
});

// More lenient rate limiter for contact data retrieval
export const contactApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
