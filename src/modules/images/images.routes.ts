import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authGuard } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as controller from './images.controller';

const router = Router();

router.use(authGuard);

/**
 * @swagger
 * /admin/listings/{id}/images:
 *   post:
 *     summary: Add an image URL to a listing (max 15; first becomes primary)
 *     tags: [Images]
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
 *             required: [image_url]
 *             properties:
 *               image_url: { type: string, format: uri }
 *               sort_order: { type: integer, default: 0 }
 *     responses:
 *       '201': { description: Created image row }
 *       '400': { description: Invalid https URL or limit exceeded }
 *       '404': { description: Listing not found }
 */
router.post(
  '/',
  validate({ body: controller.addImageSchema }),
  asyncHandler(controller.addImage)
);

/**
 * @swagger
 * /admin/listings/{id}/images/reorder:
 *   patch:
 *     summary: Bulk reorder all images of a listing by their ids
 *     tags: [Images]
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
 *             required: [image_ids]
 *             properties:
 *               image_ids: { type: array, items: { type: integer } }
 *     responses:
 *       '200': { description: Updated image list }
 */
router.patch(
  '/reorder',
  validate({ body: controller.reorderSchema }),
  asyncHandler(controller.reorder)
);

/**
 * @swagger
 * /admin/listings/{id}/images/{imageId}/primary:
 *   patch:
 *     summary: Set an image as the primary one (unsets others)
 *     tags: [Images]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200': { description: The new primary image }
 *       '404': { description: Image not found }
 */
router.patch(
  '/:imageId/primary',
  asyncHandler(controller.setPrimary)
);

/**
 * @swagger
 * /admin/listings/{id}/images/{imageId}:
 *   delete:
 *     summary: Remove an image row (URL-only; nothing deleted on external host)
 *     tags: [Images]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '204': { description: No content }
 *       '404': { description: Image not found }
 */
router.delete('/:imageId', asyncHandler(controller.removeImage));

export default router;
