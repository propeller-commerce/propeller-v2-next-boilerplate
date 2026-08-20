-- Propeller storefront analytics schema (PWP-910).
--
-- GENERATED — do not edit by hand. Regenerate with:
--   npm run tracking:init -- --print-sql
--
-- Engine assumed: unknown
-- Database:       propeller_analytics
--
-- Safe to run more than once: every statement is IF NOT EXISTS. Run it by
-- hand when the installer cannot (no CREATE rights, no route to the server,
-- a DBA-managed instance) — then the app works exactly the same.
--
-- Drop the CREATE DATABASE line if your account may only create tables.

CREATE DATABASE IF NOT EXISTS `propeller_analytics` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `propeller_analytics`;
CREATE TABLE IF NOT EXISTS schema_migrations (
  id          VARCHAR(64)  NOT NULL,
  applied_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  -- Detects a migration edited after it was applied: same id, different SQL.
  -- Without it, changing a shipped migration silently diverges installs.
  checksum    CHAR(64)     NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 001_storefront_events: Append-only event table, partitioned monthly for retention
CREATE TABLE IF NOT EXISTS storefront_events (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Client clock, CLAMPED to server time at ingest when it is implausible.
  -- Every index and the partitioning are built on this column, so it has to be
  -- the one trustworthy time axis; `received_at` is kept unindexed purely to
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
  props           JSON        NULL,

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE COLUMNS (occurred_at) (
  PARTITION p2026_08 VALUES LESS THAN ('2026-09-01'),
  PARTITION p2026_09 VALUES LESS THAN ('2026-10-01'),
  PARTITION p2026_10 VALUES LESS THAN ('2026-11-01'),
  PARTITION p2026_11 VALUES LESS THAN ('2026-12-01'),
  PARTITION p2026_12 VALUES LESS THAN ('2027-01-01'),
  PARTITION p2027_01 VALUES LESS THAN ('2027-02-01'),
  PARTITION p2027_02 VALUES LESS THAN ('2027-03-01'),
  PARTITION p2027_03 VALUES LESS THAN ('2027-04-01'),
  PARTITION p2027_04 VALUES LESS THAN ('2027-05-01'),
  PARTITION p2027_05 VALUES LESS THAN ('2027-06-01'),
  PARTITION p2027_06 VALUES LESS THAN ('2027-07-01'),
  PARTITION p2027_07 VALUES LESS THAN ('2027-08-01'),
  PARTITION p2027_08 VALUES LESS THAN ('2027-09-01'),
  PARTITION p2027_09 VALUES LESS THAN ('2027-10-01'),
  PARTITION pmax     VALUES LESS THAN (MAXVALUE)
);

-- 002_daily_rollups: Daily rollup tables for the dashboard
CREATE TABLE IF NOT EXISTS daily_page_stats (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS daily_event_counts (
  channel_id  INT UNSIGNED NOT NULL,
  day         DATE         NOT NULL,
  event_name  VARCHAR(64)  NOT NULL,
  event_count INT UNSIGNED NOT NULL,
  visitors    INT UNSIGNED NOT NULL,
  companies   INT UNSIGNED NOT NULL,
  PRIMARY KEY (channel_id, day, event_name),
  KEY ix_event_day (channel_id, event_name, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO schema_migrations (id, checksum) VALUES ('001_storefront_events', 'b360cdb238c81d141e781e880dc02583b6eb88931ce67df02ca138e13fba1d01');
INSERT IGNORE INTO schema_migrations (id, checksum) VALUES ('002_daily_rollups', '80f6195966a2fffede075a360f48b4091d8eb7441e249320666428ac9c376e9f');
