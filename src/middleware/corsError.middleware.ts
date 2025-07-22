import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

interface CORSErrorDetails {
  origin: string | undefined;
  method: string;
  path: string;
  userAgent: string | undefined;
  referer: string | undefined;
  timestamp: string;
  ip: string;
}

export class CORSViolationError extends AppError {
  public details: CORSErrorDetails;

  constructor(message: string, req: Request) {
    super(message, 403);
    this.name = 'CORSViolationError';
    
    this.details = {
      origin: req.headers.origin,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress || 'unknown'
    };
  }
}

export const corsErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Handle CORS-specific errors
  if (err.name === 'CORSError' || err.message.includes('CORS policy violation')) {
    const corsError = new CORSViolationError(err.message, req);
    
    // Log detailed CORS violation information
    console.error('🚨 CORS VIOLATION DETECTED:', {
      error: corsError.message,
      details: corsError.details,
      stack: err.stack
    });

    // In production, you might want to send this to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: send to monitoring service
      // monitoringService.logCORSViolation(corsError);
    }

    res.status(403).json({
      success: false,
      error: 'CORS_VIOLATION',
      message: 'Cross-Origin Request Blocked',
      ...(process.env.NODE_ENV === 'development' && {
        details: {
          origin: corsError.details.origin,
          allowedOrigins: process.env.FRONTEND_URL || 'http://localhost:3000'
        }
      })
    });
    return;
  }

  // Pass non-CORS errors to the next error handler
  next(err);
};