import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import User from '../models/User.model';

// Extend Express Request type to include user
export interface IAuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

/**
 * Middleware to protect routes that require authentication.
 * Verifies the JWT from the Authorization header.
 */
export const protect = async (req: IAuthRequest, _res: Response, next: NextFunction) => {
  let token;

  // Check for token in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new UnauthorizedError('Not authorized to access this route'));
  }

  try {
    // Verify the token
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new UnauthorizedError('User not found'));
    }

    if (!user.isActive) {
      return next(new UnauthorizedError('User account is deactivated'));
    }

    // Attach user to the request object
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    };

    next();
  } catch (error) {
    return next(new UnauthorizedError('Not authorized, token failed'));
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