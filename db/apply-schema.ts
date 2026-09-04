/**
 * Applies db/schema.sql to the configured database.
 * Idempotent (uses CREATE IF NOT EXISTS and guarded enum creation).
 *
 * Usage: npm run db:schema
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from '../src/config/db';

async function main() {
  const schemaPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  console.log(`Applying schema from ${schemaPath} ...`);
  const client = await pool.connect();
  try {
    // Not wrapped in a single transaction: schema.sql already has BEGIN/COMMIT,
    // and CREATE EXTENSION / enum guards behave better outside an outer txn.
    await client.query(sql);
    console.log('Schema applied successfully.');
  } finally {
    client.release();
  }
  await pool.end();
}

void main().catch((err) => {
  console.error('Schema apply failed:', err.message);
  process.exitCode = 1;
});