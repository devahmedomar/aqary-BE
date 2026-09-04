import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authGuard } from '../../middleware/auth';
import { strictLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import * as controller from './inquiries.controller';

const router = Router();

/**
 * @swagger
 * /inquiries:
 *   post:
 *     summary: Visitor requests a viewing (public; rate-limited)
 *     tags: [Inquiries]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/Inquiry' }
 *     responses:
 *       '201': { description: Created inquiry log entry }
 *       '404': { description: Listing not found or not active }
 *       '429': { description: Too many requests }
 */
router.post(
  '/',
  strictLimiter,
  validate({ body: controller.createInquirySchema }),
  asyncHandler(controller.createInquiry)
);

/**
 * @swagger
 * /admin/inquiries:
 *   get:
 *     summary: List inquiries (auth required), newest first
 *     tags: [Inquiries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: listing_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       '200': { description: Paginated inquiries }
 *       '401': { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/', authGuard, asyncHandler(controller.listInquiries));

export default router;
