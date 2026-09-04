import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authGuard } from '../../middleware/auth';
import * as controller from './stats.controller';

const router = Router();

router.use(authGuard);

/**
 * @swagger
 * /admin/stats/overview:
 *   get:
 *     summary: Dashboard counts (active listings, sold/rented this month, inquiries this week)
 *     tags: [Stats]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       '200': { description: Overview aggregate counts }
 */
router.get('/overview', asyncHandler(controller.getOverview));

/**
 * @swagger
 * /admin/stats/top-listings:
 *   get:
 *     summary: Top 5 listings by views
 *     tags: [Stats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *     responses:
 *       '200': { description: Top listings by views_count }
 */
router.get('/top-listings', asyncHandler(controller.getTopListings));

/**
 * @swagger
 * /admin/stats/listings/{id}/views:
 *   get:
 *     summary: Views + inquiry count for a single listing
 *     tags: [Stats]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200': { description: views_count and inquiries_count }
 *       '404': { description: Listing not found }
 */
router.get('/listings/:id/views', asyncHandler(controller.getListingViews));

export default router;