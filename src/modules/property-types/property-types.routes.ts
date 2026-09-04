import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { authGuard, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { listPropertyTypes, createPropertyType } from './property-types.service';
import { PropertyType } from '../../types';

const router = Router();

const createPropertyTypeSchema = z.object({
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional(),
});

let cache: PropertyType[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

async function getCached(): Promise<PropertyType[]> {
  if (!cache || Date.now() > cacheExpiresAt) {
    cache = await listPropertyTypes();
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  }
  return cache;
}

/**
 * @swagger
 * /property-types:
 *   get:
 *     summary: List all property types (public, for filter dropdowns)
 *     tags: [Lookups]
 *     responses:
 *       '200': { description: Array of property types }
 *   post:
 *     summary: Add a property type (owner only)
 *     tags: [Lookups]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               name_ar: { type: string }
 *     responses:
 *       '201': { description: Created property type }
 *       '409': { description: Duplicate property type }
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await getCached());
  })
);

router.post(
  '/',
  authGuard,
  requireRole('owner'),
  validate({ body: createPropertyTypeSchema }),
  asyncHandler(async (req, res, next) => {
    const { name, name_ar } = req.body as z.infer<typeof createPropertyTypeSchema>;
    try {
      const pt = await createPropertyType(name, name_ar);
      cache = null;
      sendSuccess(res, pt, undefined, 201);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        next(new AppError('Property type already exists', 409, 'CONFLICT'));
        return;
      }
      throw err;
    }
  })
);

export default router;
