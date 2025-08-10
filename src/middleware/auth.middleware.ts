import { Request, Response, NextFunction } from 'express';
import { verifyTokenWithBlacklist } from '../utils/jwt.utils';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import User from '../models/User.model';

// Extend Express Request type to include user
export interface IAuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
  token?: string;
}

/**
 * Middleware to protect routes that require authentication.
 * Verifies the JWT from the Authorization header.
 */
export const protect = async (req: IAuthRequest, _res: Response, next: NextFunction) => {
  let token;

  // PRIORITY 1: Check for httpOnly cookie (Primary auth method)
  if (req.cookies && (req.cookies as any).token) {
    token = (req.cookies as any).token;
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('🍪 Using token from httpOnly cookie');
    }
  }
  // PRIORITY 2: Check Authorization header (Fallback for API clients)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('📋 Using token from Authorization header');
    }
  }

  if (!token) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('❌ No token found in cookies or headers');
      // eslint-disable-next-line no-console
      console.log('Cookies:', (req as any).cookies);
      // eslint-disable-next-line no-console
      console.log('Auth Header:', req.headers.authorization);
    }
    return next(new UnauthorizedError('Not authorized to access this route'));
  }

  try {
    // Verify the token with blacklist check
    const decoded = await verifyTokenWithBlacklist(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new UnauthorizedError('User not found'));
    }

    if (!user.isActive) {
      return next(new UnauthorizedError('User account is deactivated'));
    }

    // Attach user and token to the request object
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    };
    req.token = token;

    next();
  } catch (error) {
    const message = (error as Error).message === 'Token has been invalidated'
      ? 'Session has been terminated'
      : 'Not authorized, token failed';
    return next(new UnauthorizedError(message));
  }
};

export const authorize = (...roles: string[]) => {
  return (req: IAuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('User not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('User role not authorized to access this route'));
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Attaches user info to request if valid token is present
 * Useful for endpoints that should work for both public and authenticated users
 */
export const optionalAuth = async (req: IAuthRequest, _res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Check for token in Authorization header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else {
    // Fallback: Check for token in cookies (for browser-based requests)
    const cookies = (req as any).cookies;
    if (cookies && cookies.token) {
      token = cookies.token as string;
    }
  }

  // If token exists, try to verify it
  if (token) {
    try {
      // Verify token with existing blacklist check
      const decoded = await verifyTokenWithBlacklist(token);
      const user = await User.findById(decoded.id);

      // Only attach user if valid and active
      if (user && user.isActive) {
        req.user = {
          id: user._id.toString(),
          role: user.role,
          email: user.email
        };
        req.token = token;
      }
    } catch (error) {
      // Log invalid token attempts for security monitoring; do not block request
      // eslint-disable-next-line no-console
      console.log('Invalid token in optional auth:', (error as Error).message);
    }
  }

  // Always continue to next middleware/controller (this is key!)
  next();
};

/**
 * Conditional auth middleware - dynamically requires auth based on request conditions
 * Useful for endpoints that need auth only in certain scenarios
 */
export const conditionalAuth = (condition: (req: IAuthRequest) => boolean) => {
  return async (req: IAuthRequest, res: Response, next: NextFunction) => {
    if (condition(req)) {
      // Use strict protect middleware if condition is met
      return protect(req, res, next);
    }
    // Use optional auth if condition is not met
    return optionalAuth(req, res, next);
  };
};