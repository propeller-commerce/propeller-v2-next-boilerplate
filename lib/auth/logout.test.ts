import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSessionCookies } from './logout.ts';

// Run with:  npm test

const expired = (opts: { keepPunchoutPending?: boolean } = {}) => {
  const set = new Map<string, { value: string; maxAge: number; path: string }>();
  clearSessionCookies(
    {
      cookies: {
        set: (name, value, o) => set.set(name, { value, maxAge: o.maxAge, path: o.path }),
      },
    },
    opts
  );
  for (const c of set.values()) assert.deepEqual([c.value, c.maxAge, c.path], ['', 0, '/']);
  return [...set.keys()].sort();
};

test('logout expires the session, the last order, the registration and every punchout cookie', () => {
  assert.deepEqual(expired(), [
    'access_token',
    'propeller_last_order',
    'propeller_registration',
    'punchout',
    'punchout_active',
    'punchout_pending',
    'refresh_token',
  ]);
});

test("the magic-login page's logout before its exchange keeps only the pending punchout entry", () => {
  assert.deepEqual(expired({ keepPunchoutPending: true }), [
    'access_token',
    'propeller_last_order',
    'propeller_registration',
    'punchout',
    'punchout_active',
    'refresh_token',
  ]);
});
