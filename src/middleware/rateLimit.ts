import rateLimit from 'express-rate-limit';

/** Generic API rate limiter. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many requests, please try again later.', code: 'RATE_LIMITED' } },
});

/** Stricter limiter for auth + inquiry endpoints (spam / brute force protection). */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, please try again later.', code: 'RATE_LIMITED' } },
});
