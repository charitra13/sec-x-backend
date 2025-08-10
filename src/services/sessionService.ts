import TokenBlacklist from '../models/TokenBlacklist.model';
import { verifyToken } from '../utils/jwt.utils';
import User from '../models/User.model';

export class SessionService {
  /**
   * Blacklist a token to invalidate the session
   */
  static async blacklistToken(token: string, userId: string): Promise<void> {
    try {
      const decoded = verifyToken(token);
      const expiresAt = new Date(decoded.exp * 1000);

      await TokenBlacklist.create({
        token,
        userId,
        expiresAt
      });
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  /**
   * Check if a token is blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await TokenBlacklist.findOne({ token });
      return !!blacklistedToken;
    } catch (error) {
      console.error('Error checking token blacklist:', error);
      return false;
    }
  }

  /**
   * Invalidate all sessions for a user (foundation for multi-session control)
   */
  static async invalidateUserSessions(userId: string, _currentToken?: string): Promise<void> {
    try {
      console.log(`Invalidating sessions for user: ${userId}`);
      await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
    } catch (error) {
      console.error('Error invalidating user sessions:', error);
    }
  }

  /**
   * Optional cleanup job for expired tokens
   */
  static async cleanupExpiredTokens(): Promise<void> {
    try {
      const now = new Date();
      await TokenBlacklist.deleteMany({ expiresAt: { $lt: now } });
      console.log('Cleaned up expired blacklisted tokens');
    } catch (error) {
      console.error('Error cleaning up expired tokens:', error);
    }
  }
}

