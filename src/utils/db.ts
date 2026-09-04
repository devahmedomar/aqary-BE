import { pool } from '../config/db';

/**
 * Typed query helper. Row is the expected shape of each returned row.
 */
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params as never[]);
  return result.rows as unknown as T[];
}

/**
 * Single-row query helper. Returns the row or null when nothing matches.
 */
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Query helper for INSERT/UPDATE/DELETE. Returns the number of affected rows.
 */
export async function execute(text: string, params?: unknown[]): Promise<number> {
  const result = await pool.query(text, params as never[]);
  return result.rowCount ?? 0;
}