import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { authGuard, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { listRegions, createRegion } from './regions.service';
import { Region } from '../../types';

const router = Router();

const createRegionSchema = z.object({
  name: z.string().min(1).max(100),
  name_ar: z.string().max(100).optional(),
});

// ---- Simple in-memory cache, short TTL (Phase 4.5) ----
let cache: Region[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

async function getCachedRegions(): Promise<Region[]> {
  if (!cache || Date.now() > cacheExpiresAt) {
    cache = await listRegions();
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  }
  return cache;
}

/**
 * @swagger
 * /regions:
 *   get:
 *     summary: List all regions (public, for filter dropdowns)
 *     tags: [Lookups]
 *     responses:
 *       '200': { description: Array of regions }
 *   post:
 *     summary: Add a region (owner only)
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
 *       '201': { description: Created region }
 *       '409': { description: Duplicate region }
 */
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const regions = await getCachedRegions();
    sendSuccess(res, regions);
  })
);

router.post(
  '/',
  authGuard,
  requireRole('owner'),
  validate({ body: createRegionSchema }),
  asyncHandler(async (req, res, next) => {
    const { name, name_ar } = req.body as z.infer<typeof createRegionSchema>;
    try {
      const region = await createRegion(name, name_ar);
      cache = null; // invalidate cache
      sendSuccess(res, region, undefined, 201);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        next(new AppError('Region already exists', 409, 'CONFLICT'));
        return;
      }
      throw err;
    }
  })
);

export default router;
