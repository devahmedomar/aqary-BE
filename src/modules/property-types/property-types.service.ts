import { query } from '../../utils/db';
import { PropertyType } from '../../types';

export async function listPropertyTypes(): Promise<PropertyType[]> {
  return query<PropertyType>('SELECT * FROM property_types ORDER BY sort_order, name');
}

export async function createPropertyType(
  name: string,
  name_ar?: string
): Promise<PropertyType> {
  const rows = await query<PropertyType>(
    'INSERT INTO property_types (name, name_ar) VALUES ($1, $2) RETURNING *',
    [name, name_ar ?? null]
  );
  return rows[0];
}
