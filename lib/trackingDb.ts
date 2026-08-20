import 'server-only';
import mysql from 'mysql2/promise';

/**
 * MySQL pool for `propeller_analytics` (PWP-910).
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

  const host = process.env.TRACKING_DB_HOST;
  const database = process.env.TRACKING_DB_NAME;
  if (!host || !database) return null;

  pool = mysql.createPool({
    host,
    port: Number(process.env.TRACKING_DB_PORT || 3307),
    user: process.env.TRACKING_DB_USER || 'root',
    password: process.env.TRACKING_DB_PASSWORD || '',
    database,
    // Low on purpose: each serverless instance holds its own pool, so a high
    // limit multiplied by scale-out exhausts the server's max_connections.
    connectionLimit: Number(process.env.TRACKING_DB_POOL || 4),
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    // DECIMAL/BIGINT come back as strings by default; we want numbers in JSON.
    decimalNumbers: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    timezone: 'Z',
  });
  return pool;
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
