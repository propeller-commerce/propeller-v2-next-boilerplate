-- propeller_analytics — storefront behaviour events (PWP-910)
--
-- One wide append-only table rather than a table per event type: the ~55 event
-- names in the taxonomy share a common context and differ only in a handful of
-- payload fields, so the columns we filter and group by are promoted to real
-- typed columns and everything else lives in `props` JSON.
--
-- Requires MySQL 8.0+ (utf8mb4_0900_ai_ci; the dashboard also uses window
-- functions and CTEs, neither of which exists in 5.7).

CREATE DATABASE IF NOT EXISTS propeller_analytics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

USE propeller_analytics;

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
  props           JSON            NULL,

  -- MySQL requires the partitioning column in EVERY unique key, hence the
  -- composite PK and the composite unique key. Without this the PARTITION BY
  -- clause below is rejected.
  PRIMARY KEY (id, occurred_at),
  UNIQUE KEY uq_idem  (idempotency_key, occurred_at),

  KEY ix_company_time (company_id, occurred_at),
  KEY ix_contact_time (contact_id, occurred_at),
  KEY ix_visitor_time (visitor_id, occurred_at),
  KEY ix_event_time   (channel_id, event_name, occurred_at),
  KEY ix_entity       (channel_id, entity_type, entity_id, occurred_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
-- Partitioning exists for RETENTION, not speed: dropping old data becomes an
-- instant DROP PARTITION instead of a DELETE that runs for hours.
PARTITION BY RANGE COLUMNS (occurred_at) (
  PARTITION p2026_08 VALUES LESS THAN ('2026-09-01'),
  PARTITION p2026_09 VALUES LESS THAN ('2026-10-01'),
  PARTITION p2026_10 VALUES LESS THAN ('2026-11-01'),
  PARTITION p2026_11 VALUES LESS THAN ('2026-12-01'),
  PARTITION p2026_12 VALUES LESS THAN ('2027-01-01'),
  PARTITION p2027_01 VALUES LESS THAN ('2027-02-01'),
  PARTITION p2027_02 VALUES LESS THAN ('2027-03-01'),
  PARTITION pmax     VALUES LESS THAN (MAXVALUE)
);
