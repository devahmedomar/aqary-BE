import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/response';
import { findActiveListingById } from '../listings/listings.service';
import * as service from './inquiries.service';

export const createInquirySchema = z.object({
  listing_id: z.number().int().positive(),
  visitor_name: z.string().min(1).max(100),
  visitor_phone: z.string().regex(/^[+]?[0-9\s\-()]{7,20}$/, 'Invalid phone number'),
  preferred_time: z.string().max(200).optional().nullable(),
});

const toNumber = (v: unknown) =>
  v === undefined || v === '' || v === null ? undefined : Number(v);

export async function createInquiry(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = createInquirySchema.parse(req.body);

    // Only allow inquiries on publicly visible (active) listings
    const listing = await findActiveListingById(input.listing_id);
    if (!listing) {
      throw new AppError('Listing not found or not available', 404, 'NOT_FOUND');
    }

    const inquiry = await service.createInquiry(input);
    sendSuccess(res, inquiry, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function listInquiries(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const listing_id = toNumber(req.query.listing_id);
    const page = Number(toNumber(req.query.page) ?? 1);
    const limit = Number(toNumber(req.query.limit) ?? 20);
    const result = await service.listInquiries({
      listing_id: listing_id === undefined ? undefined : Math.floor(listing_id),
      page,
      limit,
    });
    sendSuccess(res, result.items, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    next(err);
  }
}
