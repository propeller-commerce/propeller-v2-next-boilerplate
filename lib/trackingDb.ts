import 'server-only';
import mysql from 'mysql2/promise';
import { poolOptions } from './tracking/dbconfig';

/**
 * MySQL pool for `propeller_analytics`.
 *
 * Server-only. Credentials come from TRACKING_DB_* and must never be prefixed
 * NEXT_PUBLIC_, or they would be inlined into the client bundle.
 *
 * Deliberately not an ORM: this is one append-only table plus two rollups, and
 * almost everything we need — multi-row INSERT IGNORE, partitioned DDL, window
 * functions for period-over-period deltas — sits outside what an ORM expresses,
 * so it would all be raw SQL anyway.
 */

export const TRACKING_ENABLED = process.env.TRACKING_ENABLED !== 'false';

let pool: mysql.Pool | null = null;

export function getTrackingPool(): mysql.Pool | null {
  if (!TRACKING_ENABLED) return null;
  if (pool) return pool;

  // Which database and how to reach it lives in `tracking/dbconfig.ts` — see
  // there for the URL / socket / host precedence and the TLS modes.
  const options = poolOptions();
  if (!options) return null;

  pool = mysql.createPool(options);
  return pool;
}

/**
 * Whether a database is configured at all.
 *
 * Distinct from "a query failed": no database is an ordinary state for a shop
 * that never set analytics up, and the dashboard says so rather than rendering
 * a grid of zeros that reads as "nobody visited today".
 */
export function isTrackingConfigured(): boolean {
  return getTrackingPool() !== null;
}

/** Run a read query. Returns [] when tracking is disabled or unconfigured. */
export async function trackingQuery<T = Record<string, unknown>>(
  sql: string,
  params: ReadonlyArray<unknown> = []
): Promise<T[]> {
  const p = getTrackingPool();
  if (!p) return [];
  const [rows] = await p.query(sql, params as unknown[]);
  return rows as T[];
}
