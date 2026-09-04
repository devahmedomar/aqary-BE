import { query } from '../../utils/db';
import { Region } from '../../types';

export async function listRegions(): Promise<Region[]> {
  return query<Region>('SELECT * FROM regions ORDER BY sort_order, name');
}

export async function createRegion(name: string, name_ar?: string): Promise<Region> {
  const rows = await query<Region>(
    'INSERT INTO regions (name, name_ar) VALUES ($1, $2) RETURNING *',
    [name, name_ar ?? null]
  );
  return rows[0];
}
