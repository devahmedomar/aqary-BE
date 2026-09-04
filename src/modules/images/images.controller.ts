import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/response';
import { findListingById, getListingImages } from '../listings/listings.service';
import * as service from './images.service';

export const addImageSchema = z.object({
  image_url: z.string().url(),
  sort_order: z.number().int().min(0).default(0),
});

export const reorderSchema = z.object({
  image_ids: z.array(z.number().int().positive()).min(1),
});

/**
 * Validates the image URL is a well-formed https:// URL.
 * (A server-side HEAD check to confirm an image/* Content-Type is optional
 *  and left for a background/job phase to avoid blocking writes.)
 */
export function assertHttpsUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('image_url must be a valid URL', 400, 'VALIDATION_ERROR');
  }
  if (parsed.protocol !== 'https:') {
    throw new AppError('image_url must use https://', 400, 'VALIDATION_ERROR');
  }
}

async function loadListing(req: Request): Promise<void> {
  const id = Number(req.params.id);
  const listing = await findListingById(id);
  if (!listing) throw new AppError('Listing not found', 404, 'NOT_FOUND');
}

export async function addImage(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await loadListing(req);
    const { image_url, sort_order } = addImageSchema.parse(req.body);
    assertHttpsUrl(image_url);

    const count = await service.countImages(id);
    if (count >= service.MAX_IMAGES_PER_LISTING) {
      throw new AppError(
        `A listing can have at most ${service.MAX_IMAGES_PER_LISTING} images`,
        400,
        'LIMIT_EXCEEDED'
      );
    }

    const first = count === 0; // first image becomes primary automatically
    const image = await service.addImage(id, image_url, sort_order, first);
    sendSuccess(res, image, undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function setPrimary(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const imageId = Number(req.params.imageId);
    await loadListing(req);
    const image = await service.setPrimary(id, imageId);
    if (!image) throw new AppError('Image not found', 404, 'NOT_FOUND');
    sendSuccess(res, image);
  } catch (err) {
    next(err);
  }
}

export async function reorder(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await loadListing(req);
    const { image_ids } = reorderSchema.parse(req.body);
    await service.reorderImages(id, image_ids);
    const images = await getListingImages(id);
    sendSuccess(res, images);
  } catch (err) {
    next(err);
  }
}

export async function removeImage(req: Request, res: Response, next: NextFunction) {
  try {
    const imageId = Number(req.params.imageId);
    const deleted = await service.deleteImage(imageId);
    if (!deleted) throw new AppError('Image not found', 404, 'NOT_FOUND');
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
