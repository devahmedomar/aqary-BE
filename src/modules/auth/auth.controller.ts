import { Request, Response, NextFunction } from 'express';
import { z } from '../../middleware/validate';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { comparePassword } from './password';
import { signToken } from './jwt';
import {
  findAdminByUsername,
  findAdminById,
  createAdminUser,
  touchLastLogin,
  toPublicAdminUser,
} from './auth.service';

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const createAdminUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100),
  role: z.enum(['owner', 'staff']).default('staff'),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const admin = await findAdminByUsername(username);
    if (!admin) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const match = await comparePassword(password, admin.password_hash);
    if (!match) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    await touchLastLogin(admin.id);

    const token = signToken({
      admin_user_id: admin.id,
      username: admin.username,
      role: admin.role,
    });

    sendSuccess(res, { token, user: toPublicAdminUser(admin) });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.adminUser!;
    const admin = await findAdminById(user.id);
    if (!admin) {
      throw new AppError('Account not found', 404, 'NOT_FOUND');
    }
    sendSuccess(res, { user: toPublicAdminUser(admin) });
  } catch (err) {
    next(err);
  }
}

export async function createAdminUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = createAdminUserSchema.parse(req.body);
    const admin = await createAdminUser(input);
    sendSuccess(res, { user: toPublicAdminUser(admin) }, undefined, 201);
  } catch (err) {
    next(err);
  }
}
