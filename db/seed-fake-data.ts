/**
 * Seed fake/realistic test data for local development + Swagger testing.
 *
 * Idempotent: can be run safely more than once. It reuses the existing
 * "owner" admin account if present (created by db/setup-owner.ts) or creates
 * a default one, then inserts a fresh batch of listings (new titles each run).
 *
 * Usage:
 *   npm run db:seed
 *
 * Default admin login (when none exists):
 *   username: owner
 *   password: ownerpass123
 */
import { pool } from '../src/config/db';
import { query, queryOne } from '../src/utils/db';
import { hashPassword } from '../src/modules/auth/password';
import { AdminUser, AdminRole } from '../src/types';

interface IdRow {
  id: number;
}

// --- Config ---
const OWNER_USERNAME = process.env.SEED_USERNAME || 'owner';
const OWNER_PASSWORD = process.env.SEED_PASSWORD || 'ownerpass123';
const OWNER_NAME = process.env.SEED_OWNER_NAME || 'Main Broker';

// Realistic-ish fake data
const REGION_NAMES = ['Bani Suef City', 'Beba', 'Al Fashn', 'Ehnasia', 'Al Wasta'];

const TITLES = [
  'Modern 3BR Apartment - Nile View',
  'Luxury Villa with Private Garden',
  'Furnished Duplex - City Center',
  'Ground Floor Office - Commercial District',
  'Corner Shop - High Traffic Street',
  'Family House with Large Yard',
  'Investment Land Plot - 200 sqm',
  'Cozy 2BR Apartment - Near University',
  'Penthouse with Roof Terrace',
  'Building for Sale - Prime Location',
  'Semi-Finished Apartment - Installments',
  'Retail Showroom - Main Road',
];

const DESCRIPTIONS = [
  'Well maintained property in a prime location, close to all amenities and public transport.',
  'Great investment opportunity with high rental demand in the area.',
  'Bright spacious unit with modern finishing and a great layout.',
  'Quiet neighborhood, ideal for families. Walking distance to schools and markets.',
  'Recently renovated, ready to move in. Utilities connected.',
];

const FINISHING = ['unfinished', 'shell', 'semi', 'full', 'luxury'] as const;
const STATUSES = ['draft', 'active', 'sold', 'rented', 'reserved', 'archived'] as const;
const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb',
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function ensureOwner(): Promise<number> {
  let owner = await queryOne<AdminUser>(
    'SELECT * FROM admin_users WHERE username = $1',
    [OWNER_USERNAME]
  );
  if (!owner) {
    const password_hash = await hashPassword(OWNER_PASSWORD);
    const rows = await pool.query<AdminUser>(
      `INSERT INTO admin_users (username, password_hash, name, role)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [OWNER_USERNAME, password_hash, OWNER_NAME, 'owner' as AdminRole]
    );
    owner = rows.rows[0];
    console.log(`Created admin '${OWNER_USERNAME}' (owner).`);
  } else {
    console.log(`Using existing admin '${OWNER_USERNAME}' (id=${owner.id}, role=${owner.role}).`);
  }
  return owner.id;
}

async function seed() {
  const ownerId = await ensureOwner();

  const regions = await query<IdRow>('SELECT id FROM regions WHERE name = ANY($1)', [
    REGION_NAMES,
  ]);
  const propertyTypes = await query<IdRow>('SELECT id FROM property_types ORDER BY id');
  if (regions.length === 0 || propertyTypes.length === 0) {
    throw new Error(
      'Lookup tables are empty. Apply db/schema.sql first (npm run db:schema or recreate the Docker volume).'
    );
  }

  let created = 0;
  for (let i = 0; i < TITLES.length; i++) {
    const isRent = i % 2 === 0; // alternate sale/rent
    const title = `${TITLES[i]} ${Date.now().toString().slice(-4)}`;

    const listing = await queryOne<IdRow>(
      `INSERT INTO listings (
         operation_type, property_type_id, title, description,
         price, area_sqm, rooms, bathrooms, floor, finishing_level,
         region_id, address_details, latitude, longitude, status,
         is_featured, views_count, created_by
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
       ) RETURNING id`,
      [
        isRent ? 'rent' : 'sale',
        pick(propertyTypes).id,
        title,
        pick(DESCRIPTIONS),
        isRent ? randomInt(5000, 20000) : randomInt(500000, 5000000),
        randomInt(60, 500),
        randomInt(1, 6),
        randomInt(1, 4),
        randomInt(0, 10),
        pick(FINISHING),
        pick(regions).id,
        `Detailed address for ${title}`,
        Number((29.0661 + (Math.random() - 0.5) * 0.1).toFixed(6)),
        Number((31.0994 + (Math.random() - 0.5) * 0.1).toFixed(6)),
        pick(STATUSES),
        Math.random() > 0.7,
        randomInt(0, 500),
        ownerId,
      ]
    );
    if (!listing) continue;

    const numImages = randomInt(1, 3);
    for (let j = 0; j < numImages; j++) {
      await pool.query(
        `INSERT INTO listing_images (listing_id, image_url, is_primary, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [listing.id, `${pick(IMAGE_URLS)}?sig=${listing.id}-${j}`, j === 0, j]
      );
    }

    if (Math.random() > 0.5) {
      await pool.query(
        `INSERT INTO inquiry_logs (listing_id, visitor_name, visitor_phone, preferred_time)
         VALUES ($1, $2, $3, $4)`,
        [
          listing.id,
          pick(['Ahmed Hassan', 'Mona Ali', 'Khaled Omar', 'Sara Ibrahim', 'Youssef Samir']),
          `01${randomInt(0, 9)}${randomInt(10000000, 99999999)}`,
          pick(['Morning', 'Afternoon', 'Evening', null]),
        ]
      );
    }

    created++;
  }

  console.log(`Seeded ${created} listings with images and inquiries.`);
}

seed()
  .then(() => console.log('Seed complete.'))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
