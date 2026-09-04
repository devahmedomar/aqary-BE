import { query, queryOne } from '../../utils/db';
import { Listing, ListingImage } from '../../types';

// ---- Create / Update payloads ----

export interface ListingCreateInput {
  operation_type: 'sale' | 'rent';
  property_type_id: number;
  title: string;
  description?: string | null;
  price: number;
  area_sqm: number;
  rooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  finishing_level?: string | null;
  region_id?: number | null;
  address_details?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type ListingUpdateInput = Partial<ListingCreateInput>;

// ---- Query filters for the public endpoint ----

export interface ListingFilters {
  operation_type?: string;
  property_type_id?: number;
  region_id?: number;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  rooms?: number;
  q?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}

export interface PaginatedListings {
  items: Listing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ---- Listing images ----

export async function getListingImages(listingId: number): Promise<ListingImage[]> {
  return query<ListingImage>(
    'SELECT * FROM listing_images WHERE listing_id = $1 ORDER BY sort_order, id',
    [listingId]
  );
}

// ---- Create ----

export async function createListing(
  input: ListingCreateInput,
  createdBy: number
): Promise<Listing> {
  const rows = await query<Listing>(
    `INSERT INTO listings (
       operation_type, property_type_id, title, description, price, area_sqm,
       rooms, bathrooms, floor, finishing_level, region_id, address_details,
       latitude, longitude, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      input.operation_type,
      input.property_type_id,
      input.title,
      input.description ?? null,
      input.price,
      input.area_sqm,
      input.rooms ?? null,
      input.bathrooms ?? null,
      input.floor ?? null,
      input.finishing_level ?? null,
      input.region_id ?? null,
      input.address_details ?? null,
      input.latitude ?? null,
      input.longitude ?? null,
      createdBy,
    ]
  );
  return rows[0];
}

// ---- Read (admin: includes all statuses) ----

export async function listAdminListings(opts: {
  page?: number;
  limit?: number;
}): Promise<PaginatedListings> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const countRows = await query<{ count: string }>(
    'SELECT count(*)::text AS count FROM listings'
  );
  const total = Number(countRows[0]?.count ?? 0);

  const items = await query<Listing>(
    `SELECT * FROM listings ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ---- Read (public: active only, with filters) ----

export async function listPublicListings(
  filters: ListingFilters
): Promise<PaginatedListings> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 12));
  const offset = (page - 1) * limit;

  const where: string[] = ["status = 'active'"];
  const params: unknown[] = [];

  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause);
  };

  if (filters.operation_type) {
    params.push(filters.operation_type);
    where.push(`operation_type = $${params.length}::operation_type`);
  }
  if (filters.property_type_id) {
    add('property_type_id = $' + (params.length + 1), filters.property_type_id);
  }
  if (filters.region_id) {
    add('region_id = $' + (params.length + 1), filters.region_id);
  }
  if (filters.min_price !== undefined && filters.min_price !== null) {
    add('price >= $' + (params.length + 1), filters.min_price);
  }
  if (filters.max_price !== undefined && filters.max_price !== null) {
    add('price <= $' + (params.length + 1), filters.max_price);
  }
  if (filters.min_area !== undefined && filters.min_area !== null) {
    add('area_sqm >= $' + (params.length + 1), filters.min_area);
  }
  if (filters.max_area !== undefined && filters.max_area !== null) {
    add('area_sqm <= $' + (params.length + 1), filters.max_area);
  }
  if (filters.rooms !== undefined && filters.rooms !== null) {
    add('rooms = $' + (params.length + 1), filters.rooms);
  }
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(l.title ILIKE $${params.length} OR l.description ILIKE $${params.length})`);
  }

  // join lookups for region/property-type names
  const from =
    'FROM listings l ' +
    'LEFT JOIN regions r ON r.id = l.region_id ' +
    'LEFT JOIN property_types pt ON pt.id = l.property_type_id';

  const countSql =
    `SELECT count(*)::text AS count ${from} WHERE ` + where.join(' AND ');
  const countRows = await query<{ count: string }>(countSql, params);
  const total = Number(countRows[0]?.count ?? 0);

  let orderBy = 'l.created_at DESC';
  if (filters.sort === 'price_asc') orderBy = 'l.price ASC, l.created_at DESC';
  else if (filters.sort === 'price_desc') orderBy = 'l.price DESC, l.created_at DESC';

  const dataSql =
    `SELECT l.*, r.name AS region_name, r.name_ar AS region_name_ar, ` +
    `pt.name AS property_type_name, pt.name_ar AS property_type_name_ar ` +
    `${from} WHERE ` +
    where.join(' AND ') +
    ` ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const items = await query<Listing & Record<string, unknown>>(
    dataSql,
    [...params, limit, offset]
  );

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

// ---- Detail (public) ----

export async function findActiveListingById(
  id: number
): Promise<(Listing & Record<string, unknown>) | null> {
  return queryOne<Listing & Record<string, unknown>>(
    `SELECT l.*, r.name AS region_name, r.name_ar AS region_name_ar,
            pt.name AS property_type_name, pt.name_ar AS property_type_name_ar
     FROM listings l
     LEFT JOIN regions r ON r.id = l.region_id
     LEFT JOIN property_types pt ON pt.id = l.property_type_id
     WHERE l.id = $1 AND l.status = 'active'`,
    [id]
  );
}

export async function findListingById(id: number): Promise<Listing | null> {
  return queryOne<Listing>('SELECT * FROM listings WHERE id = $1', [id]);
}

export async function incrementViews(id: number): Promise<void> {
  await query('UPDATE listings SET views_count = views_count + 1 WHERE id = $1', [id]);
}

export async function listFeaturedListings(limit = 6): Promise<Listing[]> {
  return query<Listing>(
    `SELECT * FROM listings
     WHERE is_featured = true AND status = 'active'
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
}

// ---- Update ----

export async function updateListing(
  id: number,
  input: ListingUpdateInput
): Promise<Listing | null> {
  const fields = Object.entries(input).filter(
    ([, v]) => v !== undefined
  );
  if (fields.length === 0) return findListingById(id);

  const setClause = fields
    .map(([key], i) => `"${toSnake(key)}" = $${i + 1}`)
    .join(', ');
  const values = fields.map(([, v]) => (v === null || v === '' ? null : v));

  const rows = await query<Listing>(
    `UPDATE listings SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0] ?? null;
}

export async function updateListingStatus(
  id: number,
  status: Listing['status']
): Promise<Listing | null> {
  const rows = await query<Listing>(
    "UPDATE listings SET status = $1 WHERE id = $2 RETURNING *",
    [status, id]
  );
  return rows[0] ?? null;
}

export async function softDeleteListing(id: number): Promise<Listing | null> {
  const rows = await query<Listing>(
    "UPDATE listings SET status = 'archived' WHERE id = $1 RETURNING *",
    [id]
  );
  return rows[0] ?? null;
}

// ---- helpers ----

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
}
