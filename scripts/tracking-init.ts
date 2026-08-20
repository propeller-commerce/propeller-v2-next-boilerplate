/**
 * Installs the analytics schema (PWP-910).
 *
 *   npm run tracking:init                 apply
 *   npm run tracking:init -- --yes        apply, creating the database unasked
 *   npm run tracking:init -- --dry-run    report, change nothing
 *   npm run tracking:init -- --print-sql  write the SQL for a DBA to run
 *
 * Deliberately a command and NOT a postinstall hook: postinstall runs inside
 * Docker builds and CI with no credentials in scope, and again on every
 * unrelated `npm install`.
 *
 * ── The failsafe ──────────────────────────────────────────────────────────
 *
 * MySQL DDL does not roll back. Every CREATE TABLE auto-commits, so "undo on
 * failure" is not available at any price, and a run that dies halfway leaves a
 * half-built schema behind. So instead of a transaction:
 *
 *   - every statement is IF NOT EXISTS, so re-running is free;
 *   - a ledger row is written per completed migration, so a re-run resumes;
 *   - preflight reports EVERY problem it can see before writing anything;
 *   - any failure prints the exact remaining SQL and how to run it by hand.
 *
 * The manual path is therefore always available, and is the expected path on
 * managed instances where the app account may not create databases at all.
 */

import { writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import mysql from 'mysql2/promise';
// Default import: @next/env is CommonJS, so a named import fails under Node's
// ESM loader even though the type declarations offer one.
import nextEnv from '@next/env';
import {
  checksum,
  createDatabaseStatement,
  DEFAULT_ENGINE,
  isSupported,
  ledgerStatement,
  LEDGER_TABLE,
  migrations,
  parseEngine,
  quoteIdent,
  renderScript,
  type Engine,
  type Migration,
} from '../lib/tracking/schema.ts';
import { classifyDbError, poolOptions, STATUS_HINTS } from '../lib/tracking/dbconfig.ts';

nextEnv.loadEnvConfig(process.cwd());

const argv = process.argv.slice(2);
const has = (flag: string) => argv.includes(flag);
const DRY_RUN = has('--dry-run');
const PRINT_SQL = has('--print-sql');
const ASSUME_YES = has('--yes') || has('-y');
const SQL_FILE = 'tracking-schema.sql';

/* ── Output ─────────────────────────────────────────────────────────────── */

const say = (line = '') => process.stdout.write(`${line}\n`);
const ok = (line: string) => say(`  ✓ ${line}`);
const warn = (line: string) => say(`  ! ${line}`);
const bad = (line: string) => say(`  ✗ ${line}`);

/**
 * Ask before creating a database.
 *
 * The one thing here with a consequence nobody sees: a typo in
 * `TRACKING_DB_NAME` otherwise produces a brand-new empty database and a
 * dashboard that reports zeros forever, with no error anywhere. Applying
 * migrations to a database that already exists is not worth a prompt — that is
 * the ordinary case and it is idempotent.
 *
 * Returns false without asking when there is no terminal, so a deploy pipeline
 * fails honestly instead of silently provisioning something nobody reviewed.
 * `--yes` is the way to mean it in CI.
 */
async function confirmCreate(database: string, target: string): Promise<boolean> {
  if (ASSUME_YES) return true;

  if (!process.stdin.isTTY) {
    say();
    bad(`Database ${database} does not exist on ${target}.`);
    say('    Refusing to create it without a terminal to confirm at. Re-run with');
    say('    --yes if that is genuinely what you want, or create it by hand.');
    return false;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    // The server is named as well as the database: a wrong host looks exactly
    // like a missing database from here.
    const answer = await rl.question(`\n  Create database "${database}" on ${target}? [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

/**
 * Everything a human needs to finish the job by hand.
 *
 * Printed on any failure, not just on request: the moment this fails is exactly
 * when someone needs the SQL, and telling them to re-run with another flag
 * while a deploy is broken is a poor use of their attention.
 */
function writeManualScript(database: string, engine: Engine, partitioned: boolean): void {
  const sql = renderScript({ database, engine, partitioned });
  writeFileSync(SQL_FILE, sql, 'utf8');
  say();
  say(`Wrote ${SQL_FILE} — the whole schema, ready to run by hand:`);
  say();
  say(`  mysql -h <host> -u <user> -p < ${SQL_FILE}`);
  say();
  say('It is safe to run more than once, and it records the same ledger rows');
  say('this installer would, so a later run adopts the result instead of');
  say('repeating it. Drop the CREATE DATABASE line if your account may only');
  say('create tables inside an existing schema.');
}

/* ── Preflight ──────────────────────────────────────────────────────────── */

interface Preflight {
  connection: mysql.Connection;
  engine: Engine;
  databaseExists: boolean;
  grants: string[];
  /** Human-readable server, for messages where a wrong host is the real problem. */
  target: string;
}

async function preflight(database: string): Promise<Preflight | null> {
  const options = poolOptions();
  if (!options) {
    bad('No analytics database is configured.');
    say(`    ${STATUS_HINTS.not_configured}`);
    return null;
  }

  // Connect WITHOUT selecting a database: the whole point may be that it does
  // not exist yet, and mysql2 fails the handshake on an unknown schema.
  const { database: _ignored, connectionLimit: _l, waitForConnections: _w, queueLimit: _q, ...rest } = options;
  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection(rest);
  } catch (error) {
    const status = classifyDbError(error);
    bad(`Cannot connect: ${(error as Error).message}`);
    if (status) say(`    ${STATUS_HINTS[status]}`);
    return null;
  }
  const target = options.uri
    ? 'the configured URL'
    : options.socketPath ?? `${options.host}:${options.port}`;
  ok(`Connected to ${target}`);

  const [versionRows] = await connection.query<mysql.RowDataPacket[]>('SELECT VERSION() AS v');
  const engine = parseEngine(String(versionRows[0]?.v ?? ''));
  if (!isSupported(engine)) {
    bad(`Unsupported database: ${engine.raw}`);
    say('    Needs MySQL 5.6+ or MariaDB 10+.');
    await connection.end();
    return null;
  }
  ok(`${engine.flavor === 'mariadb' ? 'MariaDB' : 'MySQL'} ${engine.major}.${engine.minor}.${engine.patch}${engine.json ? '' : ' — no native JSON, props will be LONGTEXT'}`);

  const [dbRows] = await connection.query<mysql.RowDataPacket[]>(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [database]
  );
  const databaseExists = dbRows.length > 0;
  ok(databaseExists ? `Database ${database} exists` : `Database ${database} does not exist yet`);

  // Not parsed into a decision — grant syntax has too many shapes to read
  // reliably. It is captured so that a permission failure can show the account's
  // actual rights next to the statement that was refused.
  const [grantRows] = await connection.query<mysql.RowDataPacket[]>('SHOW GRANTS FOR CURRENT_USER()');
  const grants = grantRows.map((row) => String(Object.values(row)[0]));

  return { connection, engine, databaseExists, grants, target };
}

/* ── Apply ──────────────────────────────────────────────────────────────── */

/** Migrations already recorded as applied. Empty when the ledger is not there yet. */
async function appliedIds(connection: mysql.Connection): Promise<Map<string, string>> {
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT id, checksum FROM ${LEDGER_TABLE}`
    );
    return new Map(rows.map((r) => [String(r.id), String(r.checksum)]));
  } catch {
    return new Map();
  }
}

/**
 * Run one migration, degrading to an unpartitioned table if the server refuses
 * partitioning — a few MariaDB builds ship it disabled, and an unpartitioned
 * table is fully correct, only slower to prune.
 */
async function applyMigration(
  connection: mysql.Connection,
  migration: Migration,
  retryUnpartitioned: () => Migration
): Promise<{ partitioned: boolean }> {
  try {
    for (const statement of migration.statements) await connection.query(statement);
    return { partitioned: true };
  } catch (error) {
    const message = (error as Error).message ?? '';
    if (!/partition/i.test(message)) throw error;
    warn('This server does not support partitioning — creating an unpartitioned table.');
    warn('Retention will need DELETE rather than DROP PARTITION. Everything else is identical.');
    for (const statement of retryUnpartitioned().statements) await connection.query(statement);
    return { partitioned: false };
  }
}

async function main(): Promise<number> {
  const database = process.env.TRACKING_DB_NAME?.trim() || 'propeller_analytics';
  try {
    quoteIdent(database);
  } catch (error) {
    bad((error as Error).message);
    return 1;
  }

  say();
  say(`Propeller analytics schema — database ${database}`);
  say();

  // --print-sql works with no server at all: on a laptop with no route to
  // production, printing the script IS the deliverable.
  if (PRINT_SQL && !DRY_RUN) {
    const checked = await preflight(database).catch(() => null);
    const engine = checked?.engine ?? DEFAULT_ENGINE;
    if (!checked) warn('No database reachable — assuming a conservative engine.');
    await checked?.connection.end();
    writeManualScript(database, engine, true);
    return 0;
  }

  const checked = await preflight(database);
  if (!checked) {
    say();
    say('Preflight failed; nothing was changed.');
    writeManualScript(database, DEFAULT_ENGINE, true);
    return 1;
  }

  const { connection, engine, databaseExists, grants, target } = checked;
  const pending = migrations({ database, engine });
  let partitioned = true;

  try {
    if (!databaseExists) {
      if (DRY_RUN) {
        say(`  · would create database ${database}`);
      } else if (await confirmCreate(database, target)) {
        await connection.query(createDatabaseStatement(database));
        ok(`Created database ${database}`);
      } else {
        say();
        say(`Nothing was changed. If ${database} is not the name you meant,`);
        say('check TRACKING_DB_NAME — a typo here creates an empty database that');
        say('then reports zeros forever.');
        writeManualScript(database, engine, true);
        return 1;
      }
    }

    if (DRY_RUN && !databaseExists) {
      // Nothing further can be inspected — the schema it would live in is absent.
      say();
      say('Dry run complete.');
      return 0;
    }

    await connection.query(`USE ${quoteIdent(database)}`);
    if (!DRY_RUN) await connection.query(ledgerStatement());

    const already = await appliedIds(connection);
    let changed = 0;

    for (const migration of pending) {
      const recorded = already.get(migration.id);
      if (recorded) {
        if (recorded !== checksum(migration)) {
          warn(`${migration.id} was applied from a different version of this migration.`);
          warn('  Left untouched — reconcile it by hand rather than guessing.');
        } else {
          ok(`${migration.id} already applied`);
        }
        continue;
      }

      if (DRY_RUN) {
        say(`  · would apply ${migration.id} — ${migration.description}`);
        changed += 1;
        continue;
      }

      const result = await applyMigration(connection, migration, () =>
        migrations({ database, engine, partitioned: false }).find((m) => m.id === migration.id)!
      );
      partitioned = partitioned && result.partitioned;

      await connection.query(
        `INSERT IGNORE INTO ${LEDGER_TABLE} (id, checksum) VALUES (?, ?)`,
        [migration.id, checksum(migration)]
      );
      ok(`Applied ${migration.id} — ${migration.description}`);
      changed += 1;
    }

    say();
    if (DRY_RUN) say(`Dry run complete — ${changed} migration(s) would run.`);
    else if (changed === 0) say('Already up to date.');
    else say(`Done — ${changed} migration(s) applied.${partitioned ? '' : ' (unpartitioned)'}`);
    return 0;
  } catch (error) {
    const message = (error as Error).message ?? '';
    const denied = /denied/i.test(message);
    const status = classifyDbError(error);
    say();
    bad(`Failed: ${message}`);
    // The shared hints are written for the dashboard, where a denial means
    // "cannot read". Here it almost always means "cannot create", which is a
    // different conversation with a different person.
    if (denied) {
      say('    This account cannot create what the schema needs. Either grant it');
      say('    CREATE (and CREATE DATABASE, if the database is missing), or use');
      say('    the SQL file below — that path needs no extra rights for you.');
    } else if (status) {
      say(`    ${STATUS_HINTS[status]}`);
    }

    // Whatever completed before this point stays completed and is recorded, so
    // fixing the grant and re-running picks up exactly here.
    say();
    say('Nothing already applied was rolled back — MySQL DDL cannot be. Re-run');
    say('this command after fixing the problem and it continues where it stopped.');

    if (denied) {
      say();
      say('This account currently holds:');
      for (const grant of grants) say(`  ${grant}`);
    }

    writeManualScript(database, engine, partitioned);
    return 1;
  } finally {
    await connection.end();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    bad(`Unexpected failure: ${(error as Error)?.stack ?? error}`);
    process.exit(1);
  });
