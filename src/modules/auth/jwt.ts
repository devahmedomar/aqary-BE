import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

export interface JwtPayload {
  admin_user_id: number;
  username: string;
  role: 'owner' | 'staff';
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  return decoded as unknown as JwtPayload;
}
