/**
 * Script to create/seed the first admin account (owner role).
 * The owner cannot be created through the public API — run this once
 * against a fresh database, or to add additional staff.
 *
 * Usage:
 *   OWNER_USERNAME=admin OWNER_PASSWORD=your-strong-password OWNER_NAME=Broker node db/setup-owner.ts
 *   (or run via ts-node / npm script)
 */
import { z } from 'zod';
import { pool } from '../src/config/db';
import { queryOne } from '../src/utils/db';
import { hashPassword } from '../src/modules/auth/password';
import { AdminUser, AdminRole } from '../src/types';

const ownerEnvSchema = z.object({
  OWNER_USERNAME: z.string().min(1),
  OWNER_PASSWORD: z.string().min(8),
  OWNER_NAME: z.string().min(1).default('Administrator'),
  OWNER_ROLE: z.enum(['owner', 'staff']).default('owner'),
});

async function main() {
  const parsed = ownerEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      'Missing/invalid env. Set OWNER_USERNAME, OWNER_PASSWORD (min 8 chars), OWNER_NAME., OWNER_ROLE'
    );
    console.error(
      parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    );
    process.exitCode = 1;
    await pool.end();
    return;
  }

  const { OWNER_USERNAME, OWNER_PASSWORD, OWNER_NAME, OWNER_ROLE } = parsed.data;

  const existing = await queryOne<AdminUser>(
    'SELECT id, username, role FROM admin_users WHERE username = $1',
    [OWNER_USERNAME]
  );
  if (existing) {
    console.log(`Admin user '${OWNER_USERNAME}' already exists (role=${existing.role}). Skipping.`);
    await pool.end();
    return;
  }

  const password_hash = await hashPassword(OWNER_PASSWORD);
  const { rows } = await pool.query(
    `INSERT INTO admin_users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4) RETURNING id, username, name, role`,
    [OWNER_USERNAME, password_hash, OWNER_NAME, OWNER_ROLE as AdminRole]
  );
  console.log(`Created admin user:`, rows[0]);
  await pool.end();
}

void main();