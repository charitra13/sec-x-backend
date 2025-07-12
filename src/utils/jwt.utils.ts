import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your_default_secret';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1d';

if (process.env.JWT_SECRET === 'your_default_secret') {
  console.warn(
    'Warning: JWT_SECRET is set to the default value. Please configure it in your .env file.'
  );
}

/**
 * Generates a JWT for a given user ID.
 * @param userId The ID of the user to sign the token for.
 * @returns The generated JWT.
 */
export const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

/**
 * Verifies a JWT and returns its decoded payload.
 * @param token The JWT to verify.
 * @returns The decoded payload if the token is valid.
 * @throws An error if the token is invalid or expired.
 */
export const verifyToken = (token: string): { id: string; iat: number; exp: number } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; iat: number; exp: number };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};