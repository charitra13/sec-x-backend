import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

/**
 * Centralized error handling middleware.
 * Catches all errors and sends a structured JSON response.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Default to 500 Internal Server Error if status code is not defined
  let statusCode = err instanceof AppError ? err.statusCode : 500;
  let message = err.message || 'Something went wrong';

  // Log the error for debugging purposes, especially for unexpected errors
  if (process.env.NODE_ENV === 'development') {
    console.error('ERROR ', {
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      errorName: err.name,
      errorMessage: err.message,
      stack: err.stack,
    });
  }

  // Handle specific error types for more user-friendly messages
  if (err.name === 'ValidationError') {
    statusCode = 400; // Bad Request
    message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
  }

  if (err.name === 'CastError') {
    statusCode = 400; // Bad Request
    message = `Invalid ${(err as any).path}: ${(err as any).value}`;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401; // Unauthorized
    message = 'Invalid token. Please log in again.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401; // Unauthorized
    message = 'Your token has expired. Please log in again.';
  }

  // Send the final error response
  res.status(statusCode).json({
    success: false,
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
  });
};