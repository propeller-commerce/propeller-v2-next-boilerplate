import { createHash } from 'node:crypto';

/**
 * The analytics schema, as data (PWP-910).
 *
 * Generated rather than shipped as a static .sql file, for three reasons that
 * each broke the static version:
 *
 *   1. The database name is configurable (`TRACKING_DB_NAME`). A file with
 *      `USE propeller_analytics` baked in contradicts the env var.
 *   2. Partitions have to start at the install date. A fixed window means a shop
 *      installed after it ends puts every row in the catch-all partition, and
 *      retention-by-DROP-PARTITION — the entire reason partitioning is here —
 *      silently degrades into a table scan.
 *   3. The engine varies: MariaDB, MySQL 5.7, MySQL 8, Cloud SQL. One generated
 *      statement per engine beats a support matrix of hand-maintained files.
 *
 * Nothing here touches a database — it returns strings. `scripts/tracking-init.ts`
 * executes them and `--print-sql` writes them out for a DBA to run by hand.
 */

/** Records which migrations have run, so a re-run resumes instead of repeating. */
export const LEDGER_TABLE = 'schema_migrations';

/**
 * `utf8mb4_unicode_ci` everywhere rather than MySQL 8's `utf8mb4_0900_ai_ci`.
 *
 * 0900 is the better collation — newer Unicode, faster — but it exists only on
 * MySQL 8, and one collation that works on MariaDB, 5.7, 8 and Cloud SQL is
 * worth more here than per-engine sorting nuance in a table nobody sorts by
 * name. Existing installs keep whatever they were created with; `CREATE TABLE
 * IF NOT EXISTS` never rewrites a table that is already there.
 */
export const COLLATION = 'utf8mb4_unicode_ci';

export interface Engine {
  raw: string;
  flavor: 'mysql' | 'mariadb';
  major: number;
  minor: number;
  patch: number;
  /** Native JSON column type: MySQL 5.7.8+, MariaDB 10.2+. */
  json: boolean;
}

/**
 * Assumed engine when `--print-sql` runs with no database to ask.
 *
 * Deliberately the most conservative shape that still works everywhere, so a
 * hand-run script is never *more* demanding than what the installer would do.
 */
export const DEFAULT_ENGINE: Engine = {
  raw: 'unknown',
  flavor: 'mysql',
  major: 5,
  minor: 7,
  patch: 8,
  json: true,
};

/**
 * Parse `SELECT VERSION()`.
 *
 * MariaDB reports things like `10.11.6-MariaDB-1:10.11.6+maria~deb12`, and
 * — the trap — `5.5.5-10.6.12-MariaDB` on the wire, a fake 5.5.5 prefix kept for
 * old clients. Sniffing the leading number alone reads a modern MariaDB as an
 * ancient MySQL and then generates a schema for the wrong engine.
 */
export function parseEngine(version: string): Engine {
  const mariadb = /mariadb/i.test(version);
  const stripped = mariadb ? version.replace(/^5\.5\.5-/, '') : version;
  const match = stripped.match(/(\d+)\.(\d+)\.(\d+)/);
  const [major, minor, patch] = match
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : [0, 0, 0];

  const json = mariadb
    ? major > 10 || (major === 10 && minor >= 2)
    : major > 5 || (major === 5 && minor === 7 && patch >= 8);

  return { raw: version, flavor: mariadb ? 'mariadb' : 'mysql', major, minor, patch, json };
}

/** Engines old enough that the schema cannot be made to work at all. */
export function isSupported(engine: Engine): boolean {
  return engine.flavor === 'mariadb' ? engine.major >= 10 : engine.major >= 5 && (engine.major > 5 || engine.minor >= 6);
}

export interface SchemaOptions {
  database: string;
  engine?: Engine;
  /** Month the first partition covers. Defaults to the current month. */
  from?: Date;
  /** How many monthly partitions to pre-create ahead of `from`. */
  months?: number;
  /**
   * Emit the PARTITION BY clause. The installer retries without it when the
   * server rejects partitioning — a few MariaDB builds ship it disabled, and an
   * unpartitioned table is fully correct, just slower to prune old rows.
   */
  partitioned?: boolean;
}

export interface Migration {
  id: string;
  description: string;
  statements: string[];
}

/**
 * Identifiers come from env, so they are validated rather than trusted. Not a
 * realistic attack — whoever sets the env var can already run SQL — but a
 * database named `foo\`; DROP` would produce a baffling syntax error instead of
 * a clear complaint.
 */
export function quoteIdent(name: string): string {
  if (!/^[A-Za-z0-9_$]+$/.test(name)) {
    throw new Error(
      `Unusable database name ${JSON.stringify(name)}: letters, digits, _ and $ only.`
    );
  }
  return `\`${name}\``;
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Monthly partition boundaries, as `RANGE COLUMNS` wants them: each partition
 * holds rows *less than* the first day of the following month.
 */
export function partitionRanges(
  from: Date,
  months: number
): Array<{ name: string; lessThan: string }> {
  const out: Array<{ name: string; lessThan: string }> = [];
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();

  for (let i = 0; i < months; i += 1) {
    const start = new Date(Date.UTC(year, month + i, 1));
    const end = new Date(Date.UTC(year, month + i + 1, 1));
    out.push({
      name: `p${start.getUTCFullYear()}_${pad(start.getUTCMonth() + 1)}`,
      lessThan: `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-01`,
    });
  }
  return out;
}

function partitionClause(from: Date, months: number): string {
  const ranges = partitionRanges(from, months);
  const lines = ranges.map((r) => `  PARTITION ${r.name} VALUES LESS THAN ('${r.lessThan}')`);
  // The catch-all keeps inserts working after the pre-created months run out.
  // Rows land there rather than being rejected; retention just stops being
  // granular until someone adds more partitions.
  lines.push('  PARTITION pmax     VALUES LESS THAN (MAXVALUE)');
  return `PARTITION BY RANGE COLUMNS (occurred_at) (\n${lines.join(',\n')}\n)`;
}

/** The migration ledger. Applied before anything else, and never listed in itself. */
export function ledgerStatement(): string {
  return `CREATE TABLE IF NOT EXISTS ${LEDGER_TABLE} (
  id          VARCHAR(64)  NOT NULL,
  applied_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  -- Detects a migration edited after it was applied: same id, different SQL.
  -- Without it, changing a shipped migration silently diverges installs.
  checksum    CHAR(64)     NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION}`;
}

/**
 * Every migration, oldest first.
 *
 * Append only — an id that has shipped is frozen, because installs in the field
 * have already recorded it. A change to an existing table is a NEW entry.
 */
export function migrations(options: SchemaOptions): Migration[] {
  const engine = options.engine ?? DEFAULT_ENGINE;
  const from = options.from ?? new Date();
  const months = options.months ?? 14;
  const partitioned = options.partitioned ?? true;

  // MariaDB's JSON is a LONGTEXT alias anyway; on anything without native JSON
  // we say LONGTEXT outright. `props` is written and never queried, so the
  // column type carries no behaviour today — this only keeps old engines from
  // rejecting the CREATE outright.
  const propsType = engine.json ? 'JSON' : 'LONGTEXT';

  const events = `CREATE TABLE IF NOT EXISTS storefront_events (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Client clock, CLAMPED to server time at ingest when it is implausible.
  -- Every index and the partitioning are built on this column, so it has to be
  -- the one trustworthy time axis; \`received_at\` is kept unindexed purely to
  -- diagnose skew after the fact.
  occurred_at     DATETIME(3)     NOT NULL,
  received_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  channel_id      INT UNSIGNED    NOT NULL,
  event_name      VARCHAR(64)     NOT NULL,

  -- identity
  visitor_id      CHAR(36)        NOT NULL,
  session_id      CHAR(36)        NOT NULL,
  user_mode       ENUM('anonymous','b2c','b2b') NOT NULL DEFAULT 'anonymous',
  contact_id      BIGINT UNSIGNED NULL,
  customer_id     BIGINT UNSIGNED NULL,
  company_id      BIGINT UNSIGNED NULL,

  language        CHAR(2)         NULL,
  currency        CHAR(3)         NULL,

  -- navigation: powers "most visited <anything>" without a per-page-type event
  page_type       VARCHAR(32)     NULL,
  entity_type     VARCHAR(32)     NULL,
  entity_id       BIGINT UNSIGNED NULL,
  entity_name     VARCHAR(255)    NULL,

  -- provenance: which surface the interaction came from
  source_type     VARCHAR(32)     NULL,
  source_id       BIGINT UNSIGNED NULL,
  source_position SMALLINT UNSIGNED NULL,

  -- search
  search_term     VARCHAR(255)    NULL,
  results_count   INT UNSIGNED    NULL,
  query_id        CHAR(36)        NULL,

  -- commerce
  product_id      BIGINT UNSIGNED NULL,
  sku             VARCHAR(64)     NULL,
  order_id        BIGINT UNSIGNED NULL,
  quantity        INT             NULL,
  value           DECIMAL(12,2)   NULL,

  idempotency_key BINARY(16)      NOT NULL,
  props           ${propsType}${' '.repeat(Math.max(1, 12 - propsType.length))}NULL,

  -- The partitioning column must appear in EVERY unique key, hence the
  -- composite PK and unique key. They are kept identical in the unpartitioned
  -- fallback so both shapes stay one schema.
  PRIMARY KEY (id, occurred_at),
  UNIQUE KEY uq_idem  (idempotency_key, occurred_at),

  KEY ix_company_time (company_id, occurred_at),
  KEY ix_contact_time (contact_id, occurred_at),
  KEY ix_visitor_time (visitor_id, occurred_at),
  KEY ix_event_time   (channel_id, event_name, occurred_at),
  KEY ix_entity       (channel_id, entity_type, entity_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION}${
    partitioned ? `\n${partitionClause(from, months)}` : ''
  }`;

  const pageStats = `CREATE TABLE IF NOT EXISTS daily_page_stats (
  channel_id  INT UNSIGNED    NOT NULL,
  day         DATE            NOT NULL,
  page_type   VARCHAR(32)     NOT NULL,
  entity_type VARCHAR(32)     NOT NULL DEFAULT '',
  entity_id   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  entity_name VARCHAR(255)    NULL,     -- denormalised so reports need no join
  views       INT UNSIGNED    NOT NULL,
  visitors    INT UNSIGNED    NOT NULL, -- DISTINCT visitor_id THAT DAY, not additive
  PRIMARY KEY (channel_id, day, page_type, entity_type, entity_id),
  KEY ix_day_views (channel_id, day, views)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION}`;

  const eventCounts = `CREATE TABLE IF NOT EXISTS daily_event_counts (
  channel_id  INT UNSIGNED NOT NULL,
  day         DATE         NOT NULL,
  event_name  VARCHAR(64)  NOT NULL,
  event_count INT UNSIGNED NOT NULL,
  visitors    INT UNSIGNED NOT NULL,
  companies   INT UNSIGNED NOT NULL,
  PRIMARY KEY (channel_id, day, event_name),
  KEY ix_event_day (channel_id, event_name, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${COLLATION}`;

  return [
    {
      id: '001_storefront_events',
      description: 'Append-only event table, partitioned monthly for retention',
      statements: [events],
    },
    {
      id: '002_daily_rollups',
      description: 'Daily rollup tables for the dashboard',
      statements: [pageStats, eventCounts],
    },
  ];
}

/**
 * Migration identity.
 *
 * Over the id and the statements, so the *same* schema generated on a different
 * day still matches: partition dates change with the install date, and hashing
 * them would report a false "migration was edited" on every fresh run.
 */
export function checksum(migration: Migration): string {
  return createHash('sha256')
    .update(migration.id)
    .update(migration.statements.join(';').replace(/PARTITION[\s\S]*$/m, ''))
    .digest('hex');
}

/** `CREATE DATABASE`, kept separate — plenty of accounts may create tables but not databases. */
export function createDatabaseStatement(database: string): string {
  return `CREATE DATABASE IF NOT EXISTS ${quoteIdent(database)} CHARACTER SET utf8mb4 COLLATE ${COLLATION}`;
}

/**
 * The whole schema as one runnable script, for `--print-sql` and for the copy
 * checked in at `db/schema.sql`.
 */
export function renderScript(options: SchemaOptions): string {
  const engine = options.engine ?? DEFAULT_ENGINE;
  const header = [
    '-- Propeller storefront analytics schema (PWP-910).',
    '--',
    '-- GENERATED — do not edit by hand. Regenerate with:',
    '--   npm run tracking:init -- --print-sql',
    '--',
    `-- Engine assumed: ${engine.raw}${engine.json ? '' : ' (no native JSON — props is LONGTEXT)'}`,
    `-- Database:       ${options.database}`,
    '--',
    '-- Safe to run more than once: every statement is IF NOT EXISTS. Run it by',
    '-- hand when the installer cannot (no CREATE rights, no route to the server,',
    '-- a DBA-managed instance) — then the app works exactly the same.',
    '--',
    '-- Drop the CREATE DATABASE line if your account may only create tables.',
    '',
  ].join('\n');

  const parts = [
    createDatabaseStatement(options.database),
    `USE ${quoteIdent(options.database)}`,
    ledgerStatement(),
    ...migrations(options).flatMap((m) => [`-- ${m.id}: ${m.description}`, ...m.statements]),
  ];

  // Ledger rows so a later `tracking:init` against a hand-built schema adopts it
  // instead of re-running migrations that are already there.
  const ledgerRows = migrations(options)
    .map((m) => `INSERT IGNORE INTO ${LEDGER_TABLE} (id, checksum) VALUES ('${m.id}', '${checksum(m)}')`);

  return `${header}\n${[...parts, ...ledgerRows]
    .map((p) => (p.startsWith('--') ? `\n${p}` : `${p};`))
    .join('\n')}\n`;
}
