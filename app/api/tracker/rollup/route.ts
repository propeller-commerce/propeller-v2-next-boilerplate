import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTrackingPool } from '@/lib/trackingDb';
import { rangeToUtc, todayLocal, addDays, SHOP_TIMEZONE } from '@/lib/tracking/timezone';

/**
 * Daily rollup job.
 *
 * The dashboard reads raw for real-time accuracy; these tables exist for when
 * raw stops keeping up. Run from cron / a scheduled task:
 *   POST /api/tracker/rollup?days=3
 *
 * Idempotent by construction: REPLACE INTO keyed on (channel, day, …) means
 * re-running a day overwrites it, so a re-run after an outage self-heals and
 * today's partial day can be refreshed as often as you like.
 *
 * Day bucketing happens HERE, in Node, not via MySQL's CONVERT_TZ — its
 * timezone tables are frequently unloaded and it then returns NULL rather than
 * erroring, which would silently drop rows instead of failing the job.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DAYS = 90;

export async function POST(request: NextRequest) {
  const pool = getTrackingPool();
  if (!pool) {
    return NextResponse.json({ error: 'tracking not configured' }, { status: 503 });
  }

  const days = Math.min(Math.max(Number(request.nextUrl.searchParams.get('days')) || 2, 1), MAX_DAYS);
  const today = todayLocal();
  const processed: string[] = [];

  try {
    for (let i = 0; i < days; i++) {
      const day = addDays(today, -i);
      const { start, end } = rangeToUtc(day, day);

      await pool.query(
        `REPLACE INTO daily_page_stats
           (channel_id, day, page_type, entity_type, entity_id, entity_name, views, visitors)
         SELECT channel_id,
                ? AS day,
                COALESCE(page_type, ''),
                COALESCE(entity_type, ''),
                COALESCE(entity_id, 0),
                MAX(entity_name),
                COUNT(*),
                COUNT(DISTINCT visitor_id)
         FROM storefront_events
         WHERE event_name = 'page_viewed' AND occurred_at >= ? AND occurred_at < ?
         GROUP BY channel_id, COALESCE(page_type, ''), COALESCE(entity_type, ''), COALESCE(entity_id, 0)`,
        [day, start, end]
      );

      await pool.query(
        `REPLACE INTO daily_event_counts
           (channel_id, day, event_name, event_count, visitors, companies)
         SELECT channel_id,
                ? AS day,
                event_name,
                COUNT(*),
                COUNT(DISTINCT visitor_id),
                COUNT(DISTINCT company_id)
         FROM storefront_events
         WHERE occurred_at >= ? AND occurred_at < ?
         GROUP BY channel_id, event_name`,
        [day, start, end]
      );

      processed.push(day);
    }

    return NextResponse.json({ ok: true, timezone: SHOP_TIMEZONE, days: processed });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'rollup failed';
    return NextResponse.json({ error: message, processed }, { status: 500 });
  }
}
