import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Global error handler. Produces consistent JSON shape:
 *   { error: { message, code } }
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Something went wrong';
  let code = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
  } else if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    statusCode = 400;
    message = 'Invalid JSON payload';
    code = 'BAD_REQUEST';
  } else {
    console.error('Unhandled error:', err);
  }

  res.status(statusCode).json({ error: { message, code } });
}
