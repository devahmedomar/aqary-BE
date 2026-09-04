import { query, queryOne } from '../../utils/db';
import { InquiryLog } from '../../types';

export async function createInquiry(input: {
  listing_id: number;
  visitor_name: string;
  visitor_phone: string;
  preferred_time?: string | null;
}): Promise<InquiryLog> {
  const rows = await query<InquiryLog>(
    `INSERT INTO inquiry_logs (listing_id, visitor_name, visitor_phone, preferred_time)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.listing_id, input.visitor_name, input.visitor_phone, input.preferred_time ?? null]
  );
  return rows[0];
}

export async function listInquiries(opts: {
  listing_id?: number;
  page?: number;
  limit?: number;
}): Promise<{ items: InquiryLog[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.listing_id) {
    params.push(opts.listing_id);
    where.push(`listing_id = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM inquiry_logs ${whereSql}`,
    params
  );
  const total = Number(countRow?.count ?? 0);

  const items = await query<InquiryLog>(
    `SELECT * FROM inquiry_logs ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { items, total, page, limit };
}
