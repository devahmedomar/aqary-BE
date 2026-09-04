import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Beni Suef Real Estate Platform API',
      version: '1.0.0',
      description:
        'Backend for the single-broker real estate platform. Public endpoints for visitors; ' +
        'admin endpoints (auth-required) for the broker dashboard.',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Listing: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            operation_type: { type: 'string', enum: ['sale', 'rent'] },
            property_type_id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            area_sqm: { type: 'number' },
            rooms: { type: 'integer' },
            bathrooms: { type: 'integer' },
            floor: { type: 'integer' },
            finishing_level: {
              type: 'string',
              enum: ['unfinished', 'shell', 'semi', 'full', 'luxury'],
            },
            region_id: { type: 'integer' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            status: {
              type: 'string',
              enum: ['active', 'sold', 'rented', 'reserved', 'archived'],
            },
            is_featured: { type: 'boolean' },
            views_count: { type: 'integer' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        Inquiry: {
          type: 'object',
          required: ['listing_id', 'visitor_name', 'visitor_phone'],
          properties: {
            listing_id: { type: 'integer' },
            visitor_name: { type: 'string' },
            visitor_phone: { type: 'string' },
            preferred_time: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid authentication token.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Lookups' },
      { name: 'Listings (public)' },
      { name: 'Listings (admin)' },
      { name: 'Images' },
      { name: 'Inquiries' },
      { name: 'Stats' },
    ],
  },
  apis: [path.join(__dirname, '..', '..', 'src', '**', '*.routes.ts')],
};

export const swaggerSpec = swaggerJsdoc(options);
