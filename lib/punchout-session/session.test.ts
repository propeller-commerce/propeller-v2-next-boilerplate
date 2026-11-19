import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'graphql';
import {
  PUNCHOUT_COOKIE,
  PUNCHOUT_FLAG_COOKIE,
  PUNCHOUT_PENDING_COOKIE,
  clearPunchoutCookies,
  isAllowedHookUrl,
  keepsPunchout,
  magicTokenExchange,
  promotePending,
  setActiveCookies,
  signCxmlStart,
  signPending,
  verifyActive,
  verifyCxmlStart,
  type PunchoutSession,
} from './session.ts';

const opts = { key: 'punchout-test-key' };
const session: PunchoutSession = {
  mode: 'oci',
  returnUrl: 'https://erp.example/oci-return?x=1',
  target: '_self',
  session: { '~CALLER': 'CTLG' },
};

test('hook URLs: https only, no credentials, and on the allowlist when one is set', () => {
  assert.equal(isAllowedHookUrl('https://erp.example/hook', ''), true);
  for (const bad of ['http://erp.example/hook', 'javascript:alert(1)', 'data:text/html,x', '//erp.example', 'https://u:p@erp.example/', '', 42, undefined]) {
    assert.equal(isAllowedHookUrl(bad, ''), false, String(bad));
  }
  assert.equal(isAllowedHookUrl('https://ERP.example/hook', 'erp.example, other.example'), true);
  assert.equal(isAllowedHookUrl('https://attacker.example/collect', 'erp.example'), false);
  assert.equal(isAllowedHookUrl('https://erp.example.attacker.test/', 'erp.example'), false);
});

test('a pending entry is promoted only by an exchange of the very token it was bound to', () => {
  const pending = signPending('mtoken-1', session, opts)!;
  assert.equal(promotePending(pending, 'mtoken-2', 'access-a', opts), null);
  assert.equal(promotePending(undefined, 'mtoken-1', 'access-a', opts), null);
  assert.equal(promotePending(pending, 'mtoken-1', '', opts), null);
  // A pending cookie can't pose as an active one, nor the other way round.
  assert.equal(verifyActive(pending, opts), null);
  const promoted = promotePending(pending, 'mtoken-1', 'access-a', opts)!;
  assert.equal(promoted.mode, 'oci');
  assert.deepEqual(verifyActive(promoted.value, opts)?.session, session);
  assert.equal(promotePending(promoted.value, 'mtoken-1', 'access-a', opts), null);
  // Tampered or signed with another key.
  assert.equal(verifyActive(promoted.value.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')), opts), null);
  assert.equal(verifyActive(promoted.value, { key: 'other' }), null);
});

test('a pending entry with a disallowed return URL never activates', () => {
  const pending = signPending('t', { ...session, returnUrl: 'http://erp.example/hook' }, opts)!;
  assert.equal(promotePending(pending, 't', 'access', opts), null);
});

test('only a login with the exchanged session keeps the punchout session', () => {
  const active = promotePending(signPending('t', session, opts)!, 't', 'access-a', opts)!.value;
  assert.equal(keepsPunchout(active, 'access-a', opts), true);
  assert.equal(keepsPunchout(active, 'access-b', opts), false);
  assert.equal(keepsPunchout(undefined, 'access-a', opts), false);
});

test('the cXML start data is signed by setup and bound to its token', () => {
  const data = { returnUrl: 'https://ariba.example/browserformpost', buyerCookie: 'bc', from: 'F', to: 'T', deploymentMode: 'test' };
  const signed = signCxmlStart('mt', data, opts)!;
  assert.deepEqual(verifyCxmlStart(signed, 'mt', opts), data);
  assert.equal(verifyCxmlStart(signed, 'other-token', opts), null);
  assert.equal(verifyCxmlStart(undefined, 'mt', opts), null);
  assert.equal(verifyCxmlStart(signCxmlStart('mt', { ...data, returnUrl: 'http://x.example' }, opts), 'mt', opts), null);
});

test('magicTokenExchange reads the token and the session the proxy saw', () => {
  const doc = parse('mutation magicTokenLogin($id: String!) { magicTokenLogin(id: $id) { session { accessToken } } }');
  assert.deepEqual(magicTokenExchange(doc, { id: 'mt' }, { data: { magicTokenLogin: { session: { accessToken: 'at' } } } }), {
    token: 'mt',
    accessToken: 'at',
  });
  assert.deepEqual(magicTokenExchange(doc, { id: 'mt' }, { errors: [{ message: 'used' }], data: { magicTokenLogin: null } }), {
    token: 'mt',
    accessToken: null,
  });
  const aliased = parse('mutation { x: magicTokenLogin(id: "mt") { session { accessToken } } }');
  assert.deepEqual(magicTokenExchange(aliased, {}, { data: { x: { session: { accessToken: 'at' } } } }), { token: 'mt', accessToken: 'at' });
  assert.equal(magicTokenExchange(parse('mutation { login(input: {}) { session { accessToken } } }'), {}, {}), null);
  assert.equal(magicTokenExchange(null, {}, {}), null);
});

test('cookie writers set and clear the right cookies', () => {
  const set: Record<string, { value: string; maxAge: number; httpOnly?: boolean }> = {};
  const res = { cookies: { set: (name: string, value: string, o: { maxAge: number; httpOnly?: boolean }) => (set[name] = { value, ...o }) } };
  setActiveCookies(res, { value: 'v', mode: 'oci' });
  assert.equal(set[PUNCHOUT_COOKIE].value, 'v');
  assert.equal(set[PUNCHOUT_COOKIE].httpOnly, true);
  assert.equal(set[PUNCHOUT_FLAG_COOKIE].httpOnly, false);
  assert.equal(set[PUNCHOUT_PENDING_COOKIE].maxAge, 0);
  for (const k of Object.keys(set)) delete set[k];
  clearPunchoutCookies(res, { keepPending: true });
  assert.deepEqual(Object.keys(set).sort(), [PUNCHOUT_COOKIE, PUNCHOUT_FLAG_COOKIE].sort());
  clearPunchoutCookies(res);
  assert.equal(set[PUNCHOUT_PENDING_COOKIE].maxAge, 0);
});
