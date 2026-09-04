import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authGuard } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './listings.controller';

export const adminListingsRouter = Router();
export const publicListingsRouter = Router();

// ---- Public routes ----

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: List active listings with filters & pagination
 *     tags: [Listings (public)]
 *     parameters:
 *       - in: query
 *         name: operation_type
 *         schema:
 *           type: string
 *           enum: [sale, rent]
 *       - in: query
 *         name: property_type_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: region_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *       - in: query
 *         name: min_area
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_area
 *         schema:
 *           type: number
 *       - in: query
 *         name: rooms
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         description: free-text search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, price_asc, price_desc]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: List of active listings with meta (pagination)
 */
publicListingsRouter.get('/', asyncHandler(controller.listPublic));

/**
 * @swagger
 * /listings/featured:
 *   get:
 *     summary: Featured (is_featured) active listings for the homepage
 *     tags: [Listings (public)]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: List of featured listings
 */
publicListingsRouter.get('/featured', asyncHandler(controller.getFeatured));

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: Full detail of a single active listing (increments views_count)
 *     tags: [Listings (public)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200': { description: Listing detail with images }
 *       '404': { description: Listing not found }
 */
publicListingsRouter.get('/:id', asyncHandler(controller.getListingDetail));

// ---- Admin routes (auth required) ----
adminListingsRouter.use(authGuard);

/**
 * @swagger
 * /admin/listings:
 *   get:
 *     summary: List all listings (incl. drafts/archived) for the dashboard
 *     tags: [Listings (admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200': { description: Paginated listings }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 */
adminListingsRouter.get('/', asyncHandler(controller.listAdmin));

/**
 * @swagger
 * /admin/listings:
 *   post:
 *     summary: Create a listing (auth required). Default status = draft.
 *     tags: [Listings (admin)]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Listing' }
 *     responses:
 *       '201': { description: Created listing }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 */
adminListingsRouter.post(
  '/',
  validate({ body: controller.createListingSchema }),
  asyncHandler(controller.createListing)
);

/**
 * @swagger
 * /admin/listings/{id}:
 *   get:
 *     summary: Get a single listing by ID (admin, any status)
 *     tags: [Listings (admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200': { description: Listing detail with images }
 *       '404': { description: Not found }
 */
adminListingsRouter.get('/:id', asyncHandler(controller.getAdminListing));

/**
 * @swagger
 * /admin/listings/{id}:
 *   patch:
 *     summary: Partially update a listing (creator or owner only)
 *     tags: [Listings (admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200': { description: Updated listing }
 *       '403': { description: Only the creator or owner may edit }
 *       '404': { description: Not found }
 */
adminListingsRouter.patch(
  '/:id',
  validate({ body: controller.updateListingSchema }),
  asyncHandler(controller.updateListing)
);

/**
 * @swagger
 * /admin/listings/{id}/status:
 *   patch:
 *     summary: One-click status update (active/sold/rented/reserved/archived)
 *     tags: [Listings (admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string, enum: [active, sold, rented, reserved, archived] }
 *     responses:
 *       '200': { description: Updated listing }
 *       '404': { description: Not found }
 */
adminListingsRouter.patch(
  '/:id/status',
  validate({ body: controller.statusSchema }),
  asyncHandler(controller.updateListingStatus)
);

/**
 * @swagger
 * /admin/listings/{id}:
 *   delete:
 *     summary: Soft-delete a listing (sets status to archived)
 *     tags: [Listings (admin)]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '204': { description: No content }
 *       '404': { description: Not found }
 */
adminListingsRouter.delete('/:id', asyncHandler(controller.deleteListing));
