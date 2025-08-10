import jwt from 'jsonwebtoken';

const secretFromEnv = process.env.JWT_SECRET;
if (!secretFromEnv) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET: string = secretFromEnv;

const expiresInFromEnv = process.env.JWT_EXPIRES_IN;
if (!expiresInFromEnv) {
  throw new Error('JWT_EXPIRES_IN environment variable is required');
}
const JWT_EXPIRES_IN: string = expiresInFromEnv;

export type JwtRole = 'admin' | 'reader';

export interface JwtPayload {
  id: string;
  role: JwtRole;
  email?: string;
  username: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload & { iat: number; exp: number } => {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { iat: number; exp: number };
  return decoded;
};