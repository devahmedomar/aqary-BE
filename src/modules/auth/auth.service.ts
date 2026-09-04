import { query, queryOne } from '../../utils/db';
import { AdminUser, AdminRole } from '../../types';
import { hashPassword } from './password';

export interface PublicAdminUser {
  id: number;
  username: string;
  name: string;
  role: AdminRole;
  last_login_at: Date | null;
  created_at: Date;
}

export function toPublicAdminUser(u: AdminUser): PublicAdminUser {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    last_login_at: u.last_login_at,
    created_at: u.created_at,
  };
}

export async function findAdminByUsername(username: string): Promise<AdminUser | null> {
  return queryOne<AdminUser>(
    'SELECT * FROM admin_users WHERE username = $1',
    [username]
  );
}

export async function findAdminById(id: number): Promise<AdminUser | null> {
  return queryOne<AdminUser>('SELECT * FROM admin_users WHERE id = $1', [id]);
}

export async function createAdminUser(input: {
  username: string;
  password: string;
  name: string;
  role: AdminRole;
}): Promise<AdminUser> {
  const password_hash = await hashPassword(input.password);
  const rows = await query<AdminUser>(
    `INSERT INTO admin_users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.username, password_hash, input.name, input.role]
  );
  return rows[0];
}

export async function touchLastLogin(id: number): Promise<void> {
  await query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [id]);
}
