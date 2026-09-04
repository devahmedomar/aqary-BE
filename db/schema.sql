-- =============================================================
-- Beni Suef Real Estate Platform — Database Schema
-- Source of truth: SRS_منصة_عقارات_بني_سويف.md (section 5)
-- PostgreSQL
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- Extensions
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- Enums
-- -------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operation_type') THEN
    CREATE TYPE operation_type AS ENUM ('sale', 'rent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE listing_status AS ENUM ('draft', 'active', 'sold', 'rented', 'reserved', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finishing_level') THEN
    CREATE TYPE finishing_level AS ENUM ('unfinished', 'shell', 'semi', 'full', 'luxury');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('owner', 'staff');
  END IF;
END $$;

-- -------------------------------------------------------------
-- Lookup: regions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regions (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  name_ar     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- Lookup: property_types
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS property_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  name_ar     TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- Admin users (single broker / one office)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          admin_role NOT NULL DEFAULT 'staff',
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- Listings (core entity)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id              SERIAL PRIMARY KEY,
  operation_type  operation_type NOT NULL,
  property_type_id INTEGER NOT NULL REFERENCES property_types(id),
  title           TEXT NOT NULL,
  description     TEXT,
  price           NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  area_sqm        NUMERIC(10,2) NOT NULL CHECK (area_sqm > 0),
  rooms           INTEGER,
  bathrooms       INTEGER,
  floor           INTEGER,
  finishing_level finishing_level,
  region_id       INTEGER REFERENCES regions(id),
  address_details TEXT,
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  status          listing_status NOT NULL DEFAULT 'draft',
  is_featured     BOOLEAN NOT NULL DEFAULT false,
  views_count     INTEGER NOT NULL DEFAULT 0,
  created_by      INTEGER NOT NULL REFERENCES admin_users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- Listing images (URL-only hosting; no binary storage)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_images (
  id          SERIAL PRIMARY KEY,
  listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One primary image per listing (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS uq_listing_primary
  ON listing_images (listing_id)
  WHERE is_primary = true;

-- -------------------------------------------------------------
-- Inquiry log ("request a viewing")
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiry_logs (
  id             SERIAL PRIMARY KEY,
  listing_id     INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  visitor_name   TEXT NOT NULL,
  visitor_phone  TEXT NOT NULL,
  preferred_time TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- Indexes
-- -------------------------------------------------------------
-- Public listing lookups (only active listings)
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings (status);
CREATE INDEX IF NOT EXISTS idx_listings_operation ON listings (operation_type);
CREATE INDEX IF NOT EXISTS idx_listings_region ON listings (region_id);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings (property_type_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings (price);
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings (is_featured, status);

-- Free-text search over title/description (trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm ON listings USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_listings_description_trgm ON listings USING gin (description gin_trgm_ops);

-- Inquiry lookups
CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON inquiry_logs (listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiry_logs (created_at DESC);

-- Image ordering
CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images (listing_id, sort_order);

-- -------------------------------------------------------------
-- Trigger: keep updated_at current on write
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_listings_updated ON listings;
CREATE TRIGGER trg_listings_updated
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_users_updated ON admin_users;
CREATE TRIGGER trg_admin_users_updated
  BEFORE UPDATE ON admin_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -------------------------------------------------------------
-- Seed data
-- -------------------------------------------------------------
INSERT INTO regions (name, name_ar, sort_order) VALUES
  ('Bani Suef City', 'مدينة بنى سويف', 1),
  ('Beba', 'ببا', 2),
  ('Al Fashn', 'الفشن', 3),
  ('Ehnasia', 'إهناسيا', 4),
  ('Nasser', 'ناصر', 5),
  ('Al Wasta', 'الواسطى', 6),
  ('Sammasta', 'سمسطا', 7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO property_types (name, name_ar, sort_order) VALUES
  ('Apartment', 'شقة', 1),
  ('Villa', 'فيلا', 2),
  ('House', 'منزل', 3),
  ('Land', 'أرض', 4),
  ('Shop', 'محل', 5),
  ('Office', 'مكتب', 6),
  ('Building', 'عمارة', 7)
ON CONFLICT (name) DO NOTHING;

-- -------------------------------------------------------------
-- Listing view tracking (per-IP + 24h window)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listing_views (
  listing_id  INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  ip_hash     TEXT NOT NULL,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (listing_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_listing_views_viewed
  ON listing_views (viewed_at);

COMMIT;
