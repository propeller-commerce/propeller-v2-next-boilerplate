import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { METRICS, MAX_LIMIT, MAX_RANGE_DAYS, type MetricParams } from '@/lib/tracking/queries';
import { classifyDbError, STATUS_HINTS } from '@/lib/tracking/dbconfig';
import { isTrackingConfigured } from '@/lib/trackingDb';
import { todayLocal, addDays } from '@/lib/tracking/timezone';
import { config as shopConfig } from '@/data/config';

/**
 * Dashboard metrics endpoint (PWP-910).
 *
 * `metric` selects a static named query from an allowlist — it is never
 * interpolated into SQL. `from`/`to`/`limit` are validated, clamped and passed
 * as bound parameters.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
  return Math.round((b - a) / 86_400_000);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const metric = searchParams.get('metric') ?? '';

  const runner = METRICS[metric];
  if (!runner) {
    return NextResponse.json(
      { error: 'unknown metric', allowed: Object.keys(METRICS) },
      { status: 400 }
    );
  }

  const today = todayLocal();
  const from = searchParams.get('from') ?? today;
  const to = searchParams.get('to') ?? today;
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: 'from/to must be YYYY-MM-DD' }, { status: 400 });
  }

  const span = daysBetween(from, to);
  if (!Number.isFinite(span) || span < 0) {
    return NextResponse.json({ error: 'to must not precede from' }, { status: 400 });
  }
  // Capped so a hand-edited or bookmarked URL cannot ask for a decade.
  const safeTo = span > MAX_RANGE_DAYS ? addDays(from, MAX_RANGE_DAYS) : to;

  const limit = Math.min(
    Math.max(Number(searchParams.get('limit')) || 20, 1),
    MAX_LIMIT
  );

  const params: MetricParams = {
    from,
    to: safeTo,
    limit,
    channelId: Number(shopConfig.channelId) || 1,
  };

  // Answered before running anything: with no database every metric would
  // otherwise return an empty array with a 200, and a dashboard full of honest
  // zeros is indistinguishable from a quiet day.
  if (!isTrackingConfigured()) {
    return NextResponse.json(
      { error: 'analytics database not configured', status: 'not_configured', hint: STATUS_HINTS.not_configured, metric },
      { status: 503 }
    );
  }

  try {
    const data = await runner(params);
    return NextResponse.json(
      { metric, from, to: safeTo, data },
      // Always fresh: the dashboard polls for near-real-time numbers, so a
      // cached response would quietly show stale data that looks live.
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'query failed';

    // A setup problem is not a server fault: 503 with the fix attached, so the
    // dashboard can say "run db/*.sql" instead of relaying ER_NO_SUCH_TABLE.
    const status = classifyDbError(error);
    if (status) {
      return NextResponse.json(
        { error: message, status, hint: STATUS_HINTS[status], metric },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message, metric }, { status: 500 });
  }
}
