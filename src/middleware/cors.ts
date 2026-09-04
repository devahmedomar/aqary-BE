import cors from 'cors';
import { env } from '../config/env';

const allowedOrigins =
  env.NODE_ENV === 'production'
    ? env.FRONTEND_ORIGIN.split(',').map(o => o.trim())
    : true;

export const corsMiddleware = cors({
  origin: allowedOrigins,
  credentials: true,
});
