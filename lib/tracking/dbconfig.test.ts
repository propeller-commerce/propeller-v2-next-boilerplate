import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyDbError, poolOptions, sslOption, STATUS_HINTS } from './dbconfig.ts';

/**
 * Run with:  npm run test:tracking
 *
 * Connection shape, not connectivity — nothing here opens a socket. These cover
 * the cases that fail on a Linux/managed deploy while looking fine locally:
 * a platform-injected URL, a unix socket, and TLS that silently does not engage.
 */

const KEYS = [
  'TRACKING_DB_URL', 'TRACKING_DB_SOCKET', 'TRACKING_DB_HOST', 'TRACKING_DB_PORT',
  'TRACKING_DB_USER', 'TRACKING_DB_PASSWORD', 'TRACKING_DB_NAME', 'TRACKING_DB_SSL',
  'TRACKING_DB_POOL',
] as const;

/** Set exactly the given vars, clearing the rest — env leaks between cases otherwise. */
function withEnv<T>(vars: Partial<Record<(typeof KEYS)[number], string>>, run: () => T): T {
  const saved = KEYS.map((k) => [k, process.env[k]] as const);
  for (const k of KEYS) delete process.env[k];
  for (const [k, v] of Object.entries(vars)) process.env[k] = v;
  try {
    return run();
  } finally {
    for (const [k, v] of saved) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

/* ── Nothing configured ─────────────────────────────────────────────────── */

test('no database configured is null, not a throw', () => {
  // A storefront runs fine without analytics; ingest 202s and reads return [].
  assert.equal(withEnv({}, poolOptions), null);
});

test('a host without a database name is not enough to connect', () => {
  assert.equal(withEnv({ TRACKING_DB_HOST: '127.0.0.1' }, poolOptions), null);
});

test('a blank var counts as absent rather than as an empty value', () => {
  // Container platforms inject empty strings for unset vars; treating "" as a
  // hostname produces a connection attempt to nowhere.
  assert.equal(withEnv({ TRACKING_DB_HOST: '   ', TRACKING_DB_NAME: 'a' }, poolOptions), null);
});

/* ── The three connection shapes ────────────────────────────────────────── */

test('a URL wins outright — it is how platforms inject a database', () => {
  const out = withEnv(
    { TRACKING_DB_URL: 'mysql://u:p@db.internal:3306/analytics', TRACKING_DB_HOST: 'ignored' },
    poolOptions
  );
  assert.equal(out?.uri, 'mysql://u:p@db.internal:3306/analytics');
  assert.equal(out?.host, undefined, 'the host vars must not also be sent');
});

test('a URL alone is sufficient — no separate DB name required', () => {
  const out = withEnv({ TRACKING_DB_URL: 'mysql://u:p@h/analytics' }, poolOptions);
  assert.ok(out, 'a URL with no TRACKING_DB_NAME must still connect');
});

test('a unix socket beats TCP, and drops host/port entirely', () => {
  // The normal way to reach MySQL on the same Linux host, and the only way in
  // when the account authenticates via auth_socket.
  const out = withEnv(
    { TRACKING_DB_SOCKET: '/var/run/mysqld/mysqld.sock', TRACKING_DB_HOST: '127.0.0.1', TRACKING_DB_NAME: 'a' },
    poolOptions
  );
  assert.equal(out?.socketPath, '/var/run/mysqld/mysqld.sock');
  assert.equal(out?.host, undefined);
  assert.equal(out?.port, undefined);
});

test('TCP defaults to 3306, the actual MySQL port', () => {
  // 3307 is one dev machine's second instance; defaulting to it means every
  // Linux deploy that omits the port connects nowhere.
  const out = withEnv({ TRACKING_DB_HOST: 'db', TRACKING_DB_NAME: 'a' }, poolOptions);
  assert.equal(out?.port, 3306);
});

/* ── TLS ────────────────────────────────────────────────────────────────── */

test('TLS is off unless asked for, and "false" means off', () => {
  assert.equal(withEnv({}, sslOption), undefined);
  assert.equal(withEnv({ TRACKING_DB_SSL: 'false' }, sslOption), undefined);
});

test('ssl=true verifies the certificate rather than merely encrypting', () => {
  // mysql2 defaults rejectUnauthorized to true for an object profile; returning
  // `{ rejectUnauthorized: false }` here would accept any certificate.
  const out = withEnv({ TRACKING_DB_SSL: 'true' }, sslOption);
  assert.deepEqual(out, {});
});

test('skip-verify is the only way to disable certificate checking', () => {
  assert.deepEqual(withEnv({ TRACKING_DB_SSL: 'skip-verify' }, sslOption), { rejectUnauthorized: false });
});

test('any other value is passed through as a named mysql2 profile', () => {
  assert.equal(withEnv({ TRACKING_DB_SSL: 'Amazon RDS' }, sslOption), 'Amazon RDS');
});

test('TLS applies to the URL shape too', () => {
  // Managed MySQL refuses plaintext; if this dropped, the URL path would fail
  // to connect while the host path worked.
  const out = withEnv({ TRACKING_DB_URL: 'mysql://u:p@h/a', TRACKING_DB_SSL: 'true' }, poolOptions);
  assert.deepEqual(out?.ssl, {});
});

/* ── Credentials ────────────────────────────────────────────────────────── */

test('a password is taken raw — whitespace can be part of it', () => {
  const out = withEnv(
    { TRACKING_DB_HOST: 'db', TRACKING_DB_NAME: 'a', TRACKING_DB_PASSWORD: '  s3cret ' },
    poolOptions
  );
  assert.equal(out?.password, '  s3cret ');
});

/* ── Error classification ───────────────────────────────────────────────── */

test('a missing table is a setup problem, not a server fault', () => {
  // The single most likely state of a fresh install: nobody ran db/*.sql.
  assert.equal(classifyDbError({ code: 'ER_NO_SUCH_TABLE' }), 'schema_missing');
  assert.equal(classifyDbError({ code: 'ER_BAD_DB_ERROR' }), 'schema_missing');
});

test('connection failures are grouped by their fix, not by their layer', () => {
  for (const code of ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST']) {
    assert.equal(classifyDbError({ code }), 'unreachable', code);
  }
});

test('credential and TLS failures are told apart — the fixes are different', () => {
  assert.equal(classifyDbError({ code: 'ER_ACCESS_DENIED_ERROR' }), 'access_denied');
  assert.equal(classifyDbError({ code: 'SELF_SIGNED_CERT_IN_CHAIN' }), 'tls');
});

test('an unrecognised error stays an error rather than becoming a setup hint', () => {
  // A bug in one of our queries must keep surfacing as a 500. Dressing it up as
  // a misconfiguration means nobody ever investigates it.
  assert.equal(classifyDbError({ code: 'ER_PARSE_ERROR' }), null);
  assert.equal(classifyDbError(new Error('boom')), null);
  assert.equal(classifyDbError(null), null);
  assert.equal(classifyDbError({ code: 42 }), null);
});

test('every status carries a hint naming the actual fix', () => {
  // The hint is the whole point — it is what the dashboard shows instead of
  // relaying a driver error code at a shop owner.
  for (const status of ['not_configured', 'unreachable', 'schema_missing', 'access_denied', 'tls'] as const) {
    assert.ok(STATUS_HINTS[status]?.length > 20, `${status} needs a usable hint`);
  }
  assert.match(STATUS_HINTS.schema_missing, /tracking:init/);
});
