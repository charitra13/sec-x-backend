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

  // Check for token in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
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