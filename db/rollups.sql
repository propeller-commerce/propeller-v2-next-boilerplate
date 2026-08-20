-- Daily rollups (PWP-910).
--
-- The dashboard workload is "most visited pages today", "…between X and Y",
-- "registrations today", "logins over a range" — all top-N-over-a-date-range,
-- which is the one shape a raw append-only table is worst at. These two small
-- tables answer every variant with a PK lookup or a short range scan, while raw
-- keeps serving drill-down and the per-account timeline.
--
-- TWO TRAPS, both of which otherwise produce numbers that look correct:
--   1. Counts are additive, uniques are NOT. SUM(visitors) over a range gives
--      VISITS (someone here Mon+Tue counts twice), not unique visitors. The UI
--      must label the summed column "visits"; a true range-unique needs
--      COUNT(DISTINCT visitor_id) against raw.
--   2. `day` is bucketed in the SHOP's timezone, not UTC. A Dutch shop's "today"
--      starts at 22:00 or 23:00 UTC depending on DST, so a fixed +01:00 offset
--      is wrong half the year and a UTC bucket is wrong every night.

USE propeller_analytics;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS daily_event_counts (
  channel_id  INT UNSIGNED NOT NULL,
  day         DATE         NOT NULL,
  event_name  VARCHAR(64)  NOT NULL,
  event_count INT UNSIGNED NOT NULL,
  visitors    INT UNSIGNED NOT NULL,
  companies   INT UNSIGNED NOT NULL,
  PRIMARY KEY (channel_id, day, event_name),
  KEY ix_event_day (channel_id, event_name, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
