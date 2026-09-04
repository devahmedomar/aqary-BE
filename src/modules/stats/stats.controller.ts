import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';
import { sendSuccess } from '../../utils/response';
import * as service from './stats.service';

export async function getOverview(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await service.getOverviewStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function getListingViews(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Number(req.params.id);
    const stats = await service.getListingViewsStats(id);
    if (!stats) throw new AppError('Listing not found', 404, 'NOT_FOUND');
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function getTopListings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const limit = Number(req.query.limit ?? 5);
    const top = await service.getTopListings(limit);
    sendSuccess(res, top);
  } catch (err) {
    next(err);
  }
}