import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { verifyToken } from '../modules/auth/jwt';
import { findAdminById, toPublicAdminUser } from '../modules/auth/auth.service';

/**
 * Verifies the Authorization: Bearer <token> header, loads the admin user,
 * and attaches it to req.adminUser. Rejects with 401 when missing/invalid.
 */
export const authGuard: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    }
    const token = header.slice('Bearer '.length);

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    const admin = await findAdminById(payload.admin_user_id);
    if (!admin) {
      throw new AppError('Account no longer exists', 401, 'UNAUTHORIZED');
    }

    req.adminUser = toPublicAdminUser(admin);
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Creates a guard that only allows a specific role (or above).
 * Used for owner-only endpoints.
 */
export function requireRole(role: 'owner' | 'staff'): RequestHandler {
  return (req, _res, next) => {
    const user = req.adminUser;
    if (!user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }
    if (role === 'owner' && user.role !== 'owner') {
      return next(
        new AppError('Insufficient permissions; owner access required', 403, 'FORBIDDEN')
      );
    }
    next();
  };
}
