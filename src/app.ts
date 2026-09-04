import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { corsMiddleware } from './middleware/cors';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './config/swagger';

import authRoutes from './modules/auth/auth.routes';
import regionsRoutes from './modules/regions/regions.routes';
import propertyTypesRoutes from './modules/property-types/property-types.routes';
import { adminListingsRouter, publicListingsRouter } from './modules/listings/listings.routes';
import imagesRoutes from './modules/images/images.routes';
import inquiriesRoutes from './modules/inquiries/inquiries.routes';
import statsRoutes from './modules/stats/stats.routes';

export const app = express();

app.use(express.json());
app.use(corsMiddleware);
app.use(requestLogger);

// Health check (Phase 0.8)
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Generic API rate limiting
app.use('/api', apiLimiter);

// API documentation (Swagger UI + JSON spec)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/regions', regionsRoutes);
app.use('/api/property-types', propertyTypesRoutes);
app.use('/api/listings', publicListingsRouter);
app.use('/api/admin/listings', adminListingsRouter);
app.use('/api/admin/listings/:id/images', imagesRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/admin/inquiries', inquiriesRoutes);
app.use('/api/admin/stats', statsRoutes);

// 404 handler for unknown routes
app.use((_req, res) => {
  res.status(404).json({
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// Global error handler (last)
app.use(errorHandler);