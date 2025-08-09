import jwt from 'jsonwebtoken';

const JWT_SECRET: string = process.env.JWT_SECRET || 'your_default_secret';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1d';

export type JwtRole = 'admin' | 'reader';

export interface JwtPayload {
  id: string;
  role: JwtRole;
  email?: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload & { iat: number; exp: number } => {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { iat: number; exp: number };
  return decoded;
};