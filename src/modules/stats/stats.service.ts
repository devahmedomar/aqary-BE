import { query } from '../../utils/db';

export async function getOverviewStats(): Promise<{
  totalActiveListings: number;
  totalsByOperation: { operation_type: string; count: string }[];
  soldOrRentedThisMonth: number;
  inquiriesThisWeek: number;
  totalListings: number;
}> {
  const [
    totalActive,
    totalsByOperation,
    soldRentedMonth,
    inquiriesWeek,
    totalListings,
  ] = await Promise.all([
    query<{ count: string }>(
      "SELECT count(*)::text AS count FROM listings WHERE status = 'active'"
    ),
    query<{ operation_type: string; count: string }>(
      "SELECT operation_type, count(*)::text AS count FROM listings WHERE status = 'active' GROUP BY operation_type"
    ),
    query<{ count: string }>(
      "SELECT count(*)::text AS count FROM listings WHERE status IN ('sold','rented') AND created_at >= date_trunc('month', now())"
    ),
    query<{ count: string }>(
      'SELECT count(*)::text AS count FROM inquiry_logs WHERE created_at >= date_trunc(\'week\', now())'
    ),
    query<{ count: string }>('SELECT count(*)::text AS count FROM listings'),
  ]);

  return {
    totalActiveListings: Number(totalActive[0]?.count ?? 0),
    totalsByOperation,
    soldOrRentedThisMonth: Number(soldRentedMonth[0]?.count ?? 0),
    inquiriesThisWeek: Number(inquiriesWeek[0]?.count ?? 0),
    totalListings: Number(totalListings[0]?.count ?? 0),
  };
}

export async function getListingViewsStats(id: number): Promise<{
  views_count: number;
  inquiries_count: number;
} | null> {
  const rows = await query<{ views_count: number; inquiries_count: string }>(
    `SELECT l.views_count,
            (SELECT count(*)::text FROM inquiry_logs i WHERE i.listing_id = l.id) AS inquiries_count
     FROM listings l WHERE l.id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  return {
    views_count: rows[0].views_count,
    inquiries_count: Number(rows[0].inquiries_count),
  };
}

export async function getTopListings(limit = 5): Promise<
  { id: number; title: string; views_count: number }[]
> {
  return query<{ id: number; title: string; views_count: number }>(
    'SELECT id, title, views_count FROM listings ORDER BY views_count DESC LIMIT $1',
    [limit]
  );
}
