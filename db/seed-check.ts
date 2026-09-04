/**
 * Seed verification script.
 * Confirms regions and property_types are populated from db/schema.sql.
 *
 * Usage: npm run seed:check -- (or via ts-node)
 */
import { query } from '../src/utils/db';
import { pool } from '../src/config/db';

interface LookupRow {
  id: number;
  name: string;
  name_ar: string | null;
}

async function main() {
  try {
    const [regions, propertyTypes] = await Promise.all([
      query<LookupRow>('SELECT id, name, name_ar FROM regions ORDER BY sort_order'),
      query<LookupRow>('SELECT id, name, name_ar FROM property_types ORDER BY sort_order'),
    ]);

    console.log(`Regions (${regions.length}):`);
    regions.forEach((r) => console.log(`  - ${r.name}${r.name_ar ? ` (${r.name_ar})` : ''}`));

    console.log(`\nProperty types (${propertyTypes.length}):`);
    propertyTypes.forEach((p) =>
      console.log(`  - ${p.name}${p.name_ar ? ` (${p.name_ar})` : ''}`)
    );

    if (regions.length === 0 || propertyTypes.length === 0) {
      console.error('\nSeed verification FAILED: one or both lookup tables are empty.');
      console.error('Run db/schema.sql against the database first.');
      process.exitCode = 1;
    } else {
      console.log('\nSeed verification OK.');
    }
  } catch (err) {
    console.error('Seed verification error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
