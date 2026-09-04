import { query, queryOne } from '../../utils/db';
import { pool } from '../../config/db';
import { ListingImage } from '../../types';

export const MAX_IMAGES_PER_LISTING = 15;

export async function addImage(
  listingId: number,
  image_url: string,
  sort_order: number,
  is_primary = false
): Promise<ListingImage> {
  const rows = await query<ListingImage>(
    `INSERT INTO listing_images (listing_id, image_url, sort_order, is_primary)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [listingId, image_url, sort_order, is_primary]
  );
  return rows[0];
}

export async function countImages(listingId: number): Promise<number> {
  const row = await queryOne<{ count: string }>(
    'SELECT count(*)::text AS count FROM listing_images WHERE listing_id = $1',
    [listingId]
  );
  return Number(row?.count ?? 0);
}

export async function setPrimary(listingId: number, imageId: number): Promise<ListingImage | null> {
  // Unset any current primary, then set this one (respects partial unique index)
  await query(
    'UPDATE listing_images SET is_primary = false WHERE listing_id = $1',
    [listingId]
  );
  const rows = await query<ListingImage>(
    'UPDATE listing_images SET is_primary = true WHERE id = $1 AND listing_id = $2 RETURNING *',
    [imageId, listingId]
  );
  return rows[0] ?? null;
}

export async function findImageById(imageId: number): Promise<ListingImage | null> {
  return queryOne<ListingImage>('SELECT * FROM listing_images WHERE id = $1', [imageId]);
}

export async function reorderImages(
  listingId: number,
  orderedImageIds: number[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < orderedImageIds.length; i++) {
      await client.query(
        'UPDATE listing_images SET sort_order = $1 WHERE id = $2 AND listing_id = $3',
        [i, orderedImageIds[i], listingId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteImage(imageId: number): Promise<boolean> {
  const rows = await query<ListingImage>(
    'DELETE FROM listing_images WHERE id = $1 RETURNING *',
    [imageId]
  );
  return rows.length > 0;
}
