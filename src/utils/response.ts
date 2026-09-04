import { Response } from 'express';

/**
 * Serializes success responses into the standard envelope: { data, meta }.
 * Use for collections with pagination or for singular resources.
 */
export function sendSuccess(
  res: Response,
  data: unknown,
  meta?: Record<string, unknown>,
  statusCode = 200
): void {
  const body: Record<string, unknown> = { data };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}
