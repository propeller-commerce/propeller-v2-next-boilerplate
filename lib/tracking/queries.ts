import 'server-only';
import { trackingQuery } from '@/lib/trackingDb';
import { rangeToUtc } from './timezone';

/**
 * The dashboard's query allowlist.
 *
 * `/api/tracker` takes a `metric` name and looks it up here. The name selects a
 * static query; `from`/`to`/`limit` are bound parameters. No SQL is ever built
 * from user input — this endpoint feeds a database directly from a URL, so that
 * rule holds regardless of whether the page in front of it is authenticated.
 *
 * Everything reads RAW `storefront_events` rather than the rollup tables. That
 * is the deliberate trade for "real time": a rollup is stale until its job runs,
 * and at storefront volumes the indexes carry these ranges comfortably. The
 * rollup tables and their job exist for when that stops being true — see
 * db/schema.sql and /api/tracker/rollup.
 */

export interface MetricParams {
  from: string;
  to: string;
  limit: number;
  channelId: number;
}

type Runner = (p: MetricParams) => Promise<unknown>;

/** Top-N results are capped so one bookmarked URL cannot scan a year. */
export const MAX_LIMIT = 100;
export const MAX_RANGE_DAYS = 400;

const q = async <T>(sql: string, params: unknown[]): Promise<T[]> => trackingQuery<T>(sql, params);

function bounds(p: MetricParams): [Date, Date, number] {
  const { start, end } = rangeToUtc(p.from, p.to);
  return [start, end, p.channelId];
}

export const METRICS: Record<string, Runner> = {
  /**
   * Setup probe for the dashboard banner. Cheapest query that can still fail
   * the way a broken install fails: `WHERE 1=0` returns no rows and scans
   * nothing, but the table still has to exist, so a missing schema raises
   * ER_NO_SUCH_TABLE here exactly as it would in a real query. `SELECT 1` alone
   * would report a perfectly healthy database with no tables in it.
   */
  health: async () => {
    await q('SELECT 1 FROM storefront_events WHERE 1=0', []);
    return { ok: true };
  },

  /** KPI tiles. */
  overview: async (p) => {
    const [start, end, ch] = bounds(p);
    const rows = await q<Record<string, number>>(
      `SELECT
         COUNT(DISTINCT session_id) AS visits,
         COUNT(DISTINCT visitor_id) AS visitors,
         SUM(event_name = 'page_viewed') AS page_views,
         COUNT(DISTINCT CASE WHEN company_id IS NOT NULL THEN company_id END) AS companies,
         SUM(event_name = 'search') AS searches,
         SUM(event_name = 'search_no_results') AS zero_result_searches,
         SUM(event_name = 'add_to_cart') AS add_to_carts,
         SUM(event_name = 'purchase') AS orders,
         COALESCE(SUM(CASE WHEN event_name = 'purchase' THEN value END), 0) AS revenue,
         SUM(event_name = 'login') AS logins,
         SUM(event_name = 'sign_up') AS registrations
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?`,
      [ch, start, end]
    );
    return rows[0] ?? {};
  },

  /** Daily series for the trend chart. */
  trend: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT DATE(occurred_at) AS day,
              COUNT(DISTINCT session_id) AS visits,
              COUNT(DISTINCT visitor_id) AS visitors,
              SUM(event_name = 'page_viewed') AS page_views,
              SUM(event_name = 'add_to_cart') AS add_to_carts,
              SUM(event_name = 'purchase') AS orders
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
       GROUP BY DATE(occurred_at)
       ORDER BY day`,
      [ch, start, end]
    );
  },

  /** Most visited pages / categories / products. */
  top_pages: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT page_type,
              COALESCE(entity_type, '') AS entity_type,
              entity_id,
              MAX(entity_name) AS entity_name,
              COUNT(*) AS views,
              COUNT(DISTINCT visitor_id) AS visitors
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND event_name = 'page_viewed'
       GROUP BY page_type, COALESCE(entity_type, ''), entity_id
       ORDER BY views DESC
       LIMIT ?`,
      [ch, start, end, p.limit]
    );
  },

  /** Page-type distribution — the shape of a visit. */
  page_types: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT page_type, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS visitors
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND event_name = 'page_viewed' AND page_type IS NOT NULL
       GROUP BY page_type
       ORDER BY views DESC`,
      [ch, start, end]
    );
  },

  top_searches: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT search_term,
              COUNT(*) AS searches,
              COUNT(DISTINCT visitor_id) AS visitors,
              MAX(results_count) AS max_results
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND event_name = 'search' AND search_term IS NOT NULL
       GROUP BY search_term
       ORDER BY searches DESC
       LIMIT ?`,
      [ch, start, end, p.limit]
    );
  },

  /**
   * The headline table. `companies` is what makes it a sales signal rather than
   * a merchandising one — a named account that keeps finding nothing.
   */
  zero_result_searches: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT search_term,
              COUNT(*) AS searches,
              COUNT(DISTINCT visitor_id) AS visitors,
              COUNT(DISTINCT CASE WHEN company_id IS NOT NULL THEN company_id END) AS companies,
              MAX(occurred_at) AS last_seen
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND event_name = 'search_no_results' AND search_term IS NOT NULL
       GROUP BY search_term
       ORDER BY searches DESC
       LIMIT ?`,
      [ch, start, end, p.limit]
    );
  },

  /** The provenance payoff: does search convert better than the category grid? */
  add_to_cart_by_source: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT COALESCE(source_type, 'unknown') AS source_type,
              COUNT(*) AS adds,
              COUNT(DISTINCT visitor_id) AS visitors,
              COALESCE(SUM(value), 0) AS value
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND event_name = 'add_to_cart'
       GROUP BY COALESCE(source_type, 'unknown')
       ORDER BY adds DESC`,
      [ch, start, end]
    );
  },

  /** Checkout funnel with drop-off per step. */
  funnel: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT event_name, COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS events
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND event_name IN ('view_item','add_to_cart','view_cart','begin_checkout',
                            'add_shipping_info','add_payment_info','purchase')
       GROUP BY event_name`,
      [ch, start, end]
    );
  },

  /** Anonymous vs known, B2B vs B2C. */
  visitor_split: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT user_mode,
              COUNT(DISTINCT visitor_id) AS visitors,
              COUNT(DISTINCT session_id) AS visits,
              COUNT(*) AS events
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
       GROUP BY user_mode`,
      [ch, start, end]
    );
  },

  /** Registrations and logins over time. */
  identity_trend: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT DATE(occurred_at) AS day,
              SUM(event_name = 'login') AS logins,
              SUM(event_name = 'logout') AS logouts,
              SUM(event_name = 'sign_up') AS sign_ups,
              SUM(event_name = 'registration_submitted') AS registrations,
              SUM(event_name = 'session_started') AS sessions
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND event_name IN ('login','logout','sign_up','registration_submitted','session_started')
       GROUP BY DATE(occurred_at)
       ORDER BY day`,
      [ch, start, end]
    );
  },

  /** Per-account activity — the rep-facing table. */
  accounts: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT company_id,
              COUNT(DISTINCT contact_id) AS contacts,
              COUNT(DISTINCT session_id) AS visits,
              SUM(event_name = 'page_viewed') AS page_views,
              SUM(event_name = 'search_no_results') AS failed_searches,
              SUM(event_name = 'add_to_cart') AS add_to_carts,
              SUM(event_name = 'purchase') AS orders,
              SUM(event_name = 'propeller.favorite_added') AS favorites_added,
              MAX(occurred_at) AS last_seen
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
         AND company_id IS NOT NULL
       GROUP BY company_id
       ORDER BY visits DESC
       LIMIT ?`,
      [ch, start, end, p.limit]
    );
  },

  /** Event-name totals — powers the explorer's facet list. */
  event_counts: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT event_name, COUNT(*) AS events, COUNT(DISTINCT visitor_id) AS visitors
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
       GROUP BY event_name
       ORDER BY events DESC`,
      [ch, start, end]
    );
  },

  /** Raw explorer — the escape hatch for anything the fixed panels miss. */
  recent_events: async (p) => {
    const [start, end, ch] = bounds(p);
    return q(
      `SELECT id, occurred_at, event_name, user_mode, contact_id, customer_id,
              company_id, page_type, entity_type, entity_id, entity_name,
              source_type, search_term, results_count, product_id, sku,
              order_id, quantity, value
       FROM storefront_events
       WHERE channel_id = ? AND occurred_at >= ? AND occurred_at < ?
       ORDER BY occurred_at DESC, id DESC
       LIMIT ?`,
      [ch, start, end, p.limit]
    );
  },
};

export const METRIC_NAMES = Object.keys(METRICS);
