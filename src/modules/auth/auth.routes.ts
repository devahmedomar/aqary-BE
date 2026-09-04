import { Router } from 'express';
import { authGuard, requireRole } from '../../middleware/auth';
import { strictLimiter } from '../../middleware/rateLimit';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  login,
  me,
  createAdminUserHandler,
} from './auth.controller';

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in as an admin user (owner or staff)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       '200':
 *         description: JWT token + user profile
 *       '401': { description: Invalid credentials }
 */
router.post('/login', strictLimiter, asyncHandler(login));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Return the logged-in admin user's profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200': { description: User profile (no password hash) }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', authGuard, asyncHandler(me));

/**
 * @swagger
 * /auth/admin-users:
 *   post:
 *     summary: Create a staff account (owner only)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, name]
 *             properties:
 *               username: { type: string }
 *               password: { type: string, minLength: 8 }
 *               name: { type: string }
 *               role: { type: string, enum: [owner, staff], default: staff }
 *     responses:
 *       '201': { description: Created admin user }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 *       '403': { description: Owner access required }
 */
router.post(
  '/admin-users',
  authGuard,
  requireRole('owner'),
  asyncHandler(createAdminUserHandler)
);

export default router;
