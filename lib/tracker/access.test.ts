import test from 'node:test';
import assert from 'node:assert/strict';
import { checkTrackerAccess, isTrackerPath, trackerGate, TRACKER_REALM } from './access.ts';

// Run with:  npm test

const basic = (userPass: string) => `Basic ${Buffer.from(userPass, 'utf8').toString('base64')}`;

test('unset or empty secret fails closed with 404', () => {
  assert.deepEqual(checkTrackerAccess(basic('a:b'), undefined), { ok: false, status: 404 });
  assert.deepEqual(checkTrackerAccess(basic('a:'), ''), { ok: false, status: 404 });
  assert.deepEqual(checkTrackerAccess(null, ''), { ok: false, status: 404 });
});

test('missing or wrong credentials give 401', () => {
  assert.deepEqual(checkTrackerAccess(null, 's3cret'), { ok: false, status: 401 });
  assert.deepEqual(checkTrackerAccess('', 's3cret'), { ok: false, status: 401 });
  assert.deepEqual(checkTrackerAccess(basic('admin:nope'), 's3cret'), { ok: false, status: 401 });
  assert.deepEqual(checkTrackerAccess(basic('admin:s3cret2'), 's3cret'), { ok: false, status: 401 });
});

test('any username with the right password is allowed', () => {
  assert.deepEqual(checkTrackerAccess(basic('admin:s3cret'), 's3cret'), { ok: true });
  assert.deepEqual(checkTrackerAccess(basic(':s3cret'), 's3cret'), { ok: true });
  assert.deepEqual(checkTrackerAccess(basic('x:s3:cr:et'), 's3:cr:et'), { ok: true });
  assert.deepEqual(checkTrackerAccess(basic('ü:pässwörd'), 'pässwörd'), { ok: true });
});

test('scheme is case-insensitive', () => {
  const header = basic('u:s3cret').replace('Basic', 'basic');
  assert.deepEqual(checkTrackerAccess(header, 's3cret'), { ok: true });
});

test('header parsing edge cases are rejected', () => {
  const secret = 's3cret';
  // Missing colon.
  assert.deepEqual(checkTrackerAccess(basic('s3cret'), secret), { ok: false, status: 401 });
  // Malformed base64.
  assert.deepEqual(checkTrackerAccess('Basic !!!not-base64!!!', secret), { ok: false, status: 401 });
  assert.deepEqual(checkTrackerAccess('Basic abc', secret), { ok: false, status: 401 });
  // Wrong scheme.
  assert.deepEqual(
    checkTrackerAccess(`Bearer ${Buffer.from('u:s3cret').toString('base64')}`, secret),
    { ok: false, status: 401 },
  );
  // Scheme with no token.
  assert.deepEqual(checkTrackerAccess('Basic', secret), { ok: false, status: 401 });
  assert.deepEqual(checkTrackerAccess('Basic    ', secret), { ok: false, status: 401 });
});

test('trackerGate returns null when allowed and a response otherwise', async () => {
  const ok = new Request('http://x/tracker', { headers: { authorization: basic('u:s3cret') } });
  assert.equal(trackerGate(ok, 's3cret'), null);

  const denied = trackerGate(new Request('http://x/tracker'), 's3cret');
  assert.ok(denied);
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('www-authenticate'), `Basic realm="${TRACKER_REALM}", charset="UTF-8"`);
  assert.equal(denied.headers.get('cache-control'), 'no-store');

  const absent = trackerGate(ok, undefined);
  assert.ok(absent);
  assert.equal(absent.status, 404);
  assert.equal(absent.headers.get('www-authenticate'), null);
});

test('isTrackerPath matches pages, API and locale-prefixed variants only', () => {
  const prefixes = ['en', 'de'];
  for (const p of ['/tracker', '/tracker/', '/tracker/overview', '/en/tracker', '/de/tracker/x', '/api/tracker', '/api/tracker/rollup']) {
    assert.equal(isTrackerPath(p, prefixes), true, p);
  }
  for (const p of ['/trackers', '/trackerx/a', '/fr/tracker', '/api/track', '/api/trackerx', '/product/tracker', '/en/api/tracker']) {
    assert.equal(isTrackerPath(p, prefixes), false, p);
  }
});
