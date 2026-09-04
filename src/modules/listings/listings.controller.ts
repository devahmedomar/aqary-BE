import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/response';
import * as service from './listings.service';

const toNumber = (v: unknown) =>
  v === undefined || v === '' || v === null ? undefined : Number(v);

export const createListingSchema = z.object({
  operation_type: z.enum(['sale', 'rent']),
  property_type_id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  price: z.number().nonnegative(),
  area_sqm: z.number().positive(),
  rooms: z.number().int().nonnegative().optional().nullable(),
  bathrooms: z.number().int().nonnegative().optional().nullable(),
  floor: z.number().int().optional().nullable(),
  finishing_level: z
    .enum(['unfinished', 'shell', 'semi', 'full', 'luxury'])
    .optional()
    .nullable(),
  region_id: z.number().int().positive().optional().nullable(),
  address_details: z.string().max(1000).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

// createListingSchema minus the required fields, all optional for PATCH
export const updateListingSchema = createListingSchema.partial();

export const statusSchema = z.object({
  status: z.enum(['active', 'sold', 'rented', 'reserved', 'archived']),
});

export async function createListing(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const input = createListingSchema.parse(req.body);
    const listing = await service.createListing(input, req.adminUser!.id);
    const images = await service.getListingImages(listing.id);
    sendSuccess(res, { ...listing, images }, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateListing(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    const input = updateListingSchema.parse(req.body);

    const existing = await service.findListingById(id);
    if (!existing) throw new AppError('Listing not found', 404, 'NOT_FOUND');

    // Only the creating admin or an owner can edit (Phase 5.3)
    const caller = req.adminUser!;
    if (caller.role !== 'owner' && existing.created_by !== caller.id) {
      throw new AppError('You can only edit listings you created', 403, 'FORBIDDEN');
    }

    const updated = await service.updateListing(id, input);
    const images = await service.getListingImages(id);
    sendSuccess(res, { ...updated, images });
  } catch (err) {
    next(err);
  }
}

export async function updateListingStatus(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    const { status } = statusSchema.parse(req.body);

    const existing = await service.findListingById(id);
    if (!existing) throw new AppError('Listing not found', 404, 'NOT_FOUND');

    const updated = await service.updateListingStatus(id, status);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteListing(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    const existing = await service.findListingById(id);
    if (!existing) throw new AppError('Listing not found', 404, 'NOT_FOUND');

    await service.softDeleteListing(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const page = toNumber(req.query.page);
    const limit = toNumber(req.query.limit);
    const result = await service.listAdminListings({
      page: page === undefined ? undefined : Number(page),
      limit: limit === undefined ? undefined : Number(limit),
    });
    sendSuccess(res, result.items, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    next(err);
  }
}

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      operation_type,
      property_type_id,
      region_id,
      min_price,
      max_price,
      min_area,
      max_area,
      rooms,
      q,
      sort,
      page,
      limit,
    } = req.query as Record<string, string | undefined>;

    const input = {
      operation_type,
      property_type_id: toNumber(property_type_id),
      region_id: toNumber(region_id),
      min_price: toNumber(min_price),
      max_price: toNumber(max_price),
      min_area: toNumber(min_area),
      max_area: toNumber(max_area),
      rooms: toNumber(rooms),
      q: q?.trim() || undefined,
      sort: (sort as 'newest' | 'price_asc' | 'price_desc' | undefined) ?? 'newest',
      page: Number(toNumber(page) ?? 1),
      limit: Number(toNumber(limit) ?? 12),
    };

    const result = await service.listPublicListings(input);
    sendSuccess(res, result.items, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err) {
    next(err);
  }
}

export async function getListingDetail(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    const listing = await service.findActiveListingById(id);
    if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');

    // each detail view increments the counter (Phase 5.8)
    await service.incrementViews(id);

    const images = await service.getListingImages(id);
    // Re-read so views_count is current
    const fresh = await service.findActiveListingById(id);
    sendSuccess(res, { ...(fresh ?? listing), images });
  } catch (err) {
    next(err);
  }
}

export async function getFeatured(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const limit = Number(toNumber(req.query.limit) ?? 6);
    const listings = await service.listFeaturedListings(limit);
    sendSuccess(res, listings);
  } catch (err) {
    next(err);
  }
}
