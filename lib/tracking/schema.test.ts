import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checksum,
  COLLATION,
  createDatabaseStatement,
  DEFAULT_ENGINE,
  isSupported,
  migrations,
  parseEngine,
  partitionRanges,
  quoteIdent,
  renderScript,
} from './schema.ts';

/**
 * Run with:  npm run test:tracking
 *
 * The generator is the whole reason the schema is portable, and every failure
 * mode here is one that produces a plausible-looking script that then fails on
 * someone else's database — long after the person who ran it has moved on.
 */

const mysql8 = parseEngine('8.0.36');
const mysql57 = parseEngine('5.7.44-log');
const mariadb = parseEngine('10.11.6-MariaDB-1:10.11.6+maria~deb12');

/* ── Engine detection ───────────────────────────────────────────────────── */

test('MariaDB is recognised despite its fake 5.5.5 wire prefix', () => {
  // MariaDB reports `5.5.5-10.6.12-MariaDB` to old clients. Reading the leading
  // number sees an ancient MySQL and generates the wrong schema for it.
  const disguised = parseEngine('5.5.5-10.6.12-MariaDB');
  assert.equal(disguised.flavor, 'mariadb');
  assert.equal(disguised.major, 10);
  assert.equal(disguised.minor, 6);
  assert.ok(disguised.json, 'MariaDB 10.6 has JSON');
});

test('MySQL and MariaDB versions parse to their real numbers', () => {
  assert.deepEqual(
    [mysql8.flavor, mysql8.major, mysql8.minor],
    ['mysql', 8, 0]
  );
  assert.deepEqual([mariadb.flavor, mariadb.major, mariadb.minor], ['mariadb', 10, 11]);
  assert.deepEqual([mysql57.flavor, mysql57.major, mysql57.minor], ['mysql', 5, 7]);
});

test('native JSON is detected at the versions that actually gained it', () => {
  assert.equal(parseEngine('5.7.7').json, false, 'JSON arrived in 5.7.8');
  assert.equal(parseEngine('5.7.8').json, true);
  assert.equal(parseEngine('10.1.48-MariaDB').json, false, 'MariaDB JSON arrived in 10.2');
  assert.equal(parseEngine('10.2.0-MariaDB').json, true);
});

test('unparseable version strings do not crash the installer', () => {
  const unknown = parseEngine('who knows');
  assert.equal(unknown.major, 0);
  assert.equal(isSupported(unknown), false, 'an unreadable version is not silently accepted');
});

test('engines too old to run this schema are rejected', () => {
  assert.equal(isSupported(parseEngine('5.5.62')), false);
  assert.equal(isSupported(mysql57), true);
  assert.equal(isSupported(mysql8), true);
  assert.equal(isSupported(mariadb), true);
});

/* ── Portability of the generated SQL ───────────────────────────────────── */

test('the collation works on every supported engine', () => {
  // utf8mb4_0900_ai_ci exists only on MySQL 8 — using it is what made the
  // original schema MySQL-8-only.
  const sql = renderScript({ database: 'analytics' });
  assert.equal(COLLATION, 'utf8mb4_unicode_ci');
  assert.ok(!sql.includes('0900'), 'no MySQL-8-only collation anywhere in the script');
});

test('no window functions or CTEs — the dashboard needs neither', () => {
  const sql = renderScript({ database: 'analytics' });
  assert.doesNotMatch(sql, /\bOVER\s*\(|\bWITH\s+RECURSIVE\b/i);
});

test('props falls back to LONGTEXT where there is no native JSON type', () => {
  const [events] = migrations({ database: 'a', engine: parseEngine('5.7.7') });
  assert.match(events.statements[0], /props\s+LONGTEXT/);
  const [modern] = migrations({ database: 'a', engine: mysql8 });
  assert.match(modern.statements[0], /props\s+JSON/);
});

test('every statement is re-runnable', () => {
  // The installer resumes after a permission failure by simply running again.
  // Match at line start only: the header comment mentions CREATE DATABASE.
  const sql = renderScript({ database: 'analytics' });
  const creates = sql.match(/^CREATE (TABLE|DATABASE)/gm) ?? [];
  const guarded = sql.match(/^CREATE (TABLE|DATABASE) IF NOT EXISTS/gm) ?? [];
  assert.equal(creates.length, guarded.length, 'an unguarded CREATE would fail on re-run');
  assert.ok(creates.length >= 4);
  assert.match(sql, /^INSERT IGNORE INTO/m, 'ledger rows must not fail a second run either');
});

/* ── Partitions ─────────────────────────────────────────────────────────── */

test('partitions start at the install date, not a date frozen in a file', () => {
  // A shop installed after a hardcoded window ends puts every row in pmax, and
  // retention-by-DROP-PARTITION quietly becomes a full table scan.
  const ranges = partitionRanges(new Date(Date.UTC(2027, 4, 17)), 3);
  assert.deepEqual(ranges.map((r) => r.name), ['p2027_05', 'p2027_06', 'p2027_07']);
});

test('each partition ends at the first day of the next month', () => {
  // RANGE COLUMNS is exclusive: the boundary is what rows must be LESS THAN.
  const [may] = partitionRanges(new Date(Date.UTC(2027, 4, 1)), 1);
  assert.equal(may.lessThan, '2027-06-01');
});

test('partitions roll over the year boundary', () => {
  const ranges = partitionRanges(new Date(Date.UTC(2026, 10, 1)), 4);
  assert.deepEqual(ranges.map((r) => r.name), ['p2026_11', 'p2026_12', 'p2027_01', 'p2027_02']);
  assert.equal(ranges.at(-1)?.lessThan, '2027-03-01');
});

test('a catch-all partition always exists so inserts never start failing', () => {
  const [events] = migrations({ database: 'a', from: new Date(Date.UTC(2026, 7, 1)), months: 2 });
  assert.match(events.statements[0], /PARTITION pmax\s+VALUES LESS THAN \(MAXVALUE\)/);
});

test('the unpartitioned fallback is the same table without the clause', () => {
  // Some MariaDB builds ship partitioning disabled. An unpartitioned table is
  // fully correct — only retention gets slower — so the installer degrades.
  const [events] = migrations({ database: 'a', partitioned: false });
  assert.ok(!events.statements[0].includes('PARTITION'));
  assert.match(events.statements[0], /PRIMARY KEY \(id, occurred_at\)/, 'key shape stays identical');
});

/* ── Ledger ─────────────────────────────────────────────────────────────── */

test('the checksum ignores partition dates', () => {
  // Otherwise the same migration hashes differently every month and every
  // install reports "this migration was edited after it was applied".
  const january = migrations({ database: 'a', from: new Date(Date.UTC(2027, 0, 1)) })[0];
  const june = migrations({ database: 'a', from: new Date(Date.UTC(2027, 5, 1)) })[0];
  assert.notEqual(january.statements[0], june.statements[0], 'the SQL does differ');
  assert.equal(checksum(january), checksum(june), 'but identity must not');
});

test('a genuinely different migration hashes differently', () => {
  const withJson = migrations({ database: 'a', engine: mysql8 })[0];
  const withText = migrations({ database: 'a', engine: parseEngine('5.7.7') })[0];
  assert.notEqual(checksum(withJson), checksum(withText));
});

test('migration ids are unique, ordered, and adopted by the printed script', () => {
  const ids = migrations({ database: 'a' }).map((m) => m.id);
  assert.deepEqual(ids, [...new Set(ids)], 'duplicate ids would skip a migration');
  assert.deepEqual(ids, [...ids].sort(), 'ids must sort into apply order');

  // A hand-run script has to record the same rows, or the installer would later
  // re-run migrations against a schema that already has them.
  const sql = renderScript({ database: 'a' });
  for (const id of ids) assert.ok(sql.includes(`'${id}'`), `${id} missing from the ledger inserts`);
});

/* ── Identifiers ────────────────────────────────────────────────────────── */

test('the database name comes from the config, never hardcoded', () => {
  const sql = renderScript({ database: 'shop_analytics' });
  assert.ok(sql.includes('`shop_analytics`'));
  assert.ok(!sql.includes('propeller_analytics'), 'the old baked-in name must be gone');
});

test('an unusable database name is refused with a readable message', () => {
  // Not a real attack — whoever sets the env can run SQL anyway — but the
  // alternative is a baffling syntax error from the server.
  assert.throws(() => quoteIdent('a`b; DROP'), /Unusable database name/);
  assert.equal(quoteIdent('propeller_analytics'), '`propeller_analytics`');
});

test('creating the database is a separate statement from creating tables', () => {
  // Managed instances routinely grant CREATE TABLE inside an existing schema
  // and nothing above it; that has to be a degraded path, not a dead end.
  assert.match(createDatabaseStatement('a'), /^CREATE DATABASE IF NOT EXISTS `a`/);
  for (const m of migrations({ database: 'a' })) {
    for (const s of m.statements) assert.ok(!/CREATE DATABASE/i.test(s));
  }
});

test('the default engine assumed offline is the conservative one', () => {
  // `--print-sql` runs without a database to ask. What it prints must not be
  // more demanding than what the installer would have done.
  assert.equal(DEFAULT_ENGINE.flavor, 'mysql');
  assert.ok(isSupported(DEFAULT_ENGINE));
});
