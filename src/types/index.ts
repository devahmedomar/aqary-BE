// Domain model types matching db/schema.sql

export type OperationType = 'sale' | 'rent';
export type ListingStatus = 'active' | 'sold' | 'rented' | 'reserved' | 'archived';
export type FinishingLevel = 'unfinished' | 'shell' | 'semi' | 'full' | 'luxury';
export type AdminRole = 'owner' | 'staff';

export interface Region {
  id: number;
  name: string;
  name_ar: string | null;
  sort_order: number;
  created_at: Date;
}

export interface PropertyType {
  id: number;
  name: string;
  name_ar: string | null;
  sort_order: number;
  created_at: Date;
}

export interface Listing {
  id: number;
  operation_type: OperationType;
  property_type_id: number;
  title: string;
  description: string | null;
  price: string;
  area_sqm: string;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  finishing_level: FinishingLevel | null;
  region_id: number | null;
  address_details: string | null;
  latitude: string | null;
  longitude: string | null;
  status: ListingStatus;
  is_featured: boolean;
  views_count: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface ListingImage {
  id: number;
  listing_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: Date;
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: AdminRole;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InquiryLog {
  id: number;
  listing_id: number;
  visitor_name: string;
  visitor_phone: string;
  preferred_time: string | null;
  created_at: Date;
}
