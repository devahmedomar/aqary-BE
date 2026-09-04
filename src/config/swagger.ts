export const swaggerSpec = {
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
    { name: 'Auth', description: 'Authentication & admin users' },
    { name: 'Lookups', description: 'Regions & property types' },
    { name: 'Listings (public)', description: 'Public listing endpoints' },
    { name: 'Listings (admin)', description: 'Admin listing management' },
    { name: 'Images', description: 'Listing image management' },
    { name: 'Inquiries', description: 'Visitor inquiries & admin view' },
    { name: 'Stats', description: 'Dashboard statistics' },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'Log in as an admin user (owner or staff)',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'JWT token + user profile' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Return the logged-in admin user\'s profile',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'User profile (no password hash)' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/auth/admin-users': {
      post: {
        summary: 'Create a staff account (owner only)',
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password', 'name'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['owner', 'staff'], default: 'staff' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created admin user' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { description: 'Owner access required' },
        },
      },
    },
    '/regions': {
      get: {
        summary: 'List all regions (public, for filter dropdowns)',
        tags: ['Lookups'],
        responses: {
          '200': { description: 'Array of regions' },
        },
      },
      post: {
        summary: 'Add a region (owner only)',
        tags: ['Lookups'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  name_ar: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created region' },
          '409': { description: 'Duplicate region' },
        },
      },
    },
    '/property-types': {
      get: {
        summary: 'List all property types (public, for filter dropdowns)',
        tags: ['Lookups'],
        responses: {
          '200': { description: 'Array of property types' },
        },
      },
      post: {
        summary: 'Add a property type (owner only)',
        tags: ['Lookups'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  name_ar: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created property type' },
          '409': { description: 'Duplicate property type' },
        },
      },
    },
    '/listings': {
      get: {
        summary: 'List active listings with filters & pagination',
        tags: ['Listings (public)'],
        parameters: [
          { in: 'query', name: 'operation_type', schema: { type: 'string', enum: ['sale', 'rent'] } },
          { in: 'query', name: 'property_type_id', schema: { type: 'integer' } },
          { in: 'query', name: 'region_id', schema: { type: 'integer' } },
          { in: 'query', name: 'min_price', schema: { type: 'number' } },
          { in: 'query', name: 'max_price', schema: { type: 'number' } },
          { in: 'query', name: 'min_area', schema: { type: 'number' } },
          { in: 'query', name: 'max_area', schema: { type: 'number' } },
          { in: 'query', name: 'rooms', schema: { type: 'integer' } },
          { in: 'query', name: 'q', description: 'free-text search', schema: { type: 'string' } },
          { in: 'query', name: 'sort', schema: { type: 'string', enum: ['newest', 'price_asc', 'price_desc'] } },
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'List of active listings with meta (pagination)' },
        },
      },
    },
    '/listings/featured': {
      get: {
        summary: 'Featured (is_featured) active listings for the homepage',
        tags: ['Listings (public)'],
        parameters: [
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'List of featured listings' },
        },
      },
    },
    '/listings/{id}': {
      get: {
        summary: 'Full detail of a single active listing (increments views_count)',
        tags: ['Listings (public)'],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Listing detail with images' },
          '404': { description: 'Listing not found' },
        },
      },
    },
    '/admin/listings': {
      get: {
        summary: 'List all listings (incl. drafts/archived) for the dashboard',
        tags: ['Listings (admin)'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Paginated listings' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        summary: 'Create a listing (auth required). Default status = draft.',
        tags: ['Listings (admin)'],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Listing' },
            },
          },
        },
        responses: {
          '201': { description: 'Created listing' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/admin/listings/{id}': {
      patch: {
        summary: 'Partially update a listing (creator or owner only)',
        tags: ['Listings (admin)'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Updated listing' },
          '403': { description: 'Only the creator or owner may edit' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        summary: 'Soft-delete a listing (sets status to archived)',
        tags: ['Listings (admin)'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'No content' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/admin/listings/{id}/status': {
      patch: {
        summary: 'One-click status update (active/sold/rented/reserved/archived)',
        tags: ['Listings (admin)'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: { type: 'string', enum: ['active', 'sold', 'rented', 'reserved', 'archived'] },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated listing' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/admin/listings/{id}/images': {
      post: {
        summary: 'Add an image URL to a listing (max 15; first becomes primary)',
        tags: ['Images'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['image_url'],
                properties: {
                  image_url: { type: 'string', format: 'uri' },
                  sort_order: { type: 'integer', default: 0 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created image row' },
          '400': { description: 'Invalid https URL or limit exceeded' },
          '404': { description: 'Listing not found' },
        },
      },
    },
    '/admin/listings/{id}/images/reorder': {
      patch: {
        summary: 'Bulk reorder all images of a listing by their ids',
        tags: ['Images'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['image_ids'],
                properties: {
                  image_ids: { type: 'array', items: { type: 'integer' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated image list' },
        },
      },
    },
    '/admin/listings/{id}/images/{imageId}/primary': {
      patch: {
        summary: 'Set an image as the primary one (unsets others)',
        tags: ['Images'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
          { in: 'path', name: 'imageId', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'The new primary image' },
          '404': { description: 'Image not found' },
        },
      },
    },
    '/admin/listings/{id}/images/{imageId}': {
      delete: {
        summary: 'Remove an image row (URL-only; nothing deleted on external host)',
        tags: ['Images'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
          { in: 'path', name: 'imageId', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '204': { description: 'No content' },
          '404': { description: 'Image not found' },
        },
      },
    },
    '/inquiries': {
      post: {
        summary: 'Visitor requests a viewing (public; rate-limited)',
        tags: ['Inquiries'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Inquiry' },
            },
          },
        },
        responses: {
          '201': { description: 'Created inquiry log entry' },
          '404': { description: 'Listing not found or not active' },
          '429': { description: 'Too many requests' },
        },
      },
    },
    '/admin/inquiries': {
      get: {
        summary: 'List inquiries (auth required), newest first',
        tags: ['Inquiries'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'listing_id', schema: { type: 'integer' } },
          { in: 'query', name: 'page', schema: { type: 'integer' } },
          { in: 'query', name: 'limit', schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'Paginated inquiries' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/admin/stats/overview': {
      get: {
        summary: 'Dashboard counts (active listings, sold/rented this month, inquiries this week)',
        tags: ['Stats'],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Overview aggregate counts' },
        },
      },
    },
    '/admin/stats/top-listings': {
      get: {
        summary: 'Top 5 listings by views',
        tags: ['Stats'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 5 } },
        ],
        responses: {
          '200': { description: 'Top listings by views_count' },
        },
      },
    },
    '/admin/stats/listings/{id}/views': {
      get: {
        summary: 'Views + inquiry count for a single listing',
        tags: ['Stats'],
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'integer' } },
        ],
        responses: {
          '200': { description: 'views_count and inquiries_count' },
          '404': { description: 'Listing not found' },
        },
      },
    },
  },
};
