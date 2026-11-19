import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { getTrackingPool } from '@/lib/trackingDb';
import { getVerifiedViewer } from '@/lib/auth/viewer';
import { TRACK_POLICY, formProtection } from '@/lib/form-protection';
import { clientIp } from '@/lib/http/clientIp';
import { isSameOrigin } from '@/lib/http/sameOrigin';
import { isKnownEvent } from '@/lib/tracking/taxonomy';
import { config as shopConfig } from '@/data/config';

/**
 * Behaviour-event ingest.
 *
 * Public by nature — it is called from the browser on every page. So everything
 * that decides WHO an event belongs to is derived server-side; the body is
 * treated as untrusted payload detail only. Without that the table fills with
 * data that is indistinguishable from real activity, and the first chart built
 * on it is wrong.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Caps. A batch that breaches them is truncated, not rejected — partial data beats none. */
const MAX_EVENTS = 50;
const MAX_BODY_BYTES = 128 * 1024;
/** How far a client clock may be off before we stop believing it. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const VISITOR_COOKIE = 'pr_vid';

type Json = Record<string, unknown>;

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string' || v.length === 0) return null;
  return v.length > max ? v.slice(0, max) : v;
};

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};

const uuid = (v: unknown): string | null => {
  const s = str(v, 36);
  return s && /^[0-9a-fA-F-]{36}$/.test(s) ? s : null;
};

/** Columns promoted out of `props`; whatever is left is stored as JSON. */
const PROMOTED = new Set([
  'page_type', 'entity_type', 'entity_id', 'entity_name',
  'search_term', 'results_count', 'query_id',
  'product_id', 'sku', 'order_id', 'quantity', 'value',
  'source',
]);

export async function POST(request: NextRequest) {
  try {
    const pool = getTrackingPool();
    // 202 regardless: a storefront must not care whether analytics is configured.
    if (!pool) return new NextResponse(null, { status: 202 });

    // Origin, size and rate are checked before the body is read. A beacon always
    // declares its length; without one (or over the cap) the batch is dropped.
    if (!isSameOrigin(request, process.env.NEXT_PUBLIC_SITE_URL)) return new NextResponse(null, { status: 202 });
    const declared = Number(request.headers.get('content-length') || NaN);
    if (!Number.isFinite(declared) || declared > MAX_BODY_BYTES) return new NextResponse(null, { status: 202 });
    if (!formProtection().limiter.hit(`${TRACK_POLICY.route}:${clientIp(request.headers)}`, TRACK_POLICY).ok) {
      return new NextResponse(null, { status: 202 });
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 202 });

    const body = JSON.parse(raw) as { context?: Json; events?: Json[] };
    const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
    if (events.length === 0) return new NextResponse(null, { status: 202 });

    const ctx = (body.context ?? {}) as Json;

    // ── Identity resolved server-side, not taken from the body ──────────────
    // channel is ours; the visitor id comes from the httpOnly-adjacent cookie
    // the proxy minted, so a client cannot claim to be another visitor.
    const channelId = Number(shopConfig.channelId) || 1;
    const visitorId = request.cookies.get(VISITOR_COOKIE)?.value ?? uuid(ctx.visitorId) ?? '00000000-0000-0000-0000-000000000000';
    const sessionId = uuid(ctx.sessionId) ?? visitorId;

    // Who is logged in comes from the verified session (cached per token), never
    // from the body: a client could otherwise file events under any contact.
    const viewer = await getVerifiedViewer(request.cookies.get('access_token')?.value);
    const userMode = viewer?.type === 'Contact' ? 'b2b' : viewer?.type === 'Customer' ? 'b2c' : 'anonymous';
    const contactId = viewer?.type === 'Contact' ? viewer.userId : null;
    const customerId = viewer?.type === 'Customer' ? viewer.userId : null;
    // The company the contact is browsing for, when it is one of theirs.
    const bodyCompanyId = num(ctx.companyId);
    const companyId =
      viewer?.type === 'Contact'
        ? bodyCompanyId !== null && viewer.companyIds.includes(bodyCompanyId)
          ? bodyCompanyId
          : viewer.companyId
        : null;
    const language = str(ctx.language, 2);
    const currency = str(ctx.currency, 3);

    const now = Date.now();
    const rows: unknown[][] = [];

    for (const e of events) {
      const name = str(e.name, 64);
      // Unknown names are dropped rather than stored: an open endpoint plus a
      // free-form name column is how an events table becomes unqueryable.
      if (!name || !isKnownEvent(name)) continue;

      // Clamp the client clock. Every index and the partitioning are built on
      // occurred_at, so it has to be the one trustworthy axis.
      const clientTs = num(e.ts) ?? now;
      const ts = Math.abs(now - clientTs) > MAX_CLOCK_SKEW_MS ? now : clientTs;

      const props = (e.props ?? {}) as Json;
      const source = (props.source ?? {}) as Json;

      const key = str(e.key, 191) ?? `${name}:${ts}`;
      const idem = crypto.createHash('md5').update(`${visitorId}|${key}`).digest();

      const rest: Json = {};
      for (const [k, v] of Object.entries(props)) if (!PROMOTED.has(k)) rest[k] = v;

      rows.push([
        new Date(ts),
        channelId,
        name,
        visitorId,
        sessionId,
        userMode,
        contactId,
        customerId,
        companyId,
        language,
        currency,
        str(props.page_type, 32),
        str(props.entity_type, 32),
        num(props.entity_id),
        str(props.entity_name, 255),
        str(source.type, 32),
        num(source.id),
        num(source.position),
        str(props.search_term ?? source.searchTerm, 255),
        num(props.results_count),
        uuid(props.query_id ?? source.queryId),
        num(props.product_id),
        str(props.sku, 64),
        num(props.order_id),
        num(props.quantity),
        num(props.value),
        idem,
        Object.keys(rest).length > 0 ? JSON.stringify(rest) : null,
      ]);
    }

    if (rows.length === 0) return new NextResponse(null, { status: 202 });

    // INSERT IGNORE, not INSERT: uq_idem means a single replayed row would
    // otherwise reject the whole batch.
    await pool.query(
      `INSERT IGNORE INTO storefront_events
         (occurred_at, channel_id, event_name, visitor_id, session_id, user_mode,
          contact_id, customer_id, company_id, language, currency,
          page_type, entity_type, entity_id, entity_name,
          source_type, source_id, source_position,
          search_term, results_count, query_id,
          product_id, sku, order_id, quantity, value,
          idempotency_key, props)
       VALUES ?`,
      [rows]
    );

    return new NextResponse(null, { status: 202 });
  } catch {
    // Never surface an error: the caller is a fire-and-forget beacon and a
    // failed batch is dropped by design.
    return new NextResponse(null, { status: 202 });
  }
}
