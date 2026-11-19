import test from 'node:test';
import assert from 'node:assert/strict';
import { isSameOrigin, isSameOriginJson } from './sameOrigin.ts';

const req = (headers: Record<string, string>) =>
  new Request('http://internal:3000/api/auth/session', { method: 'POST', headers });

test('a JSON post from the shop itself is accepted', () => {
  assert.equal(isSameOriginJson(req({ 'content-type': 'application/json', host: 'shop.test', origin: 'https://shop.test' })), true);
  assert.equal(isSameOriginJson(req({ 'content-type': 'application/json; charset=utf-8', host: 'localhost:3000', origin: 'http://localhost:3000' })), true);
  // Behind nginx the public host can arrive as x-forwarded-host.
  assert.equal(isSameOriginJson(req({ 'content-type': 'application/json', host: '127.0.0.1:3000', 'x-forwarded-host': 'shop.test', origin: 'https://shop.test' })), true);
  // No Origin header (non-browser clients): content type still has to be JSON.
  assert.equal(isSameOriginJson(req({ 'content-type': 'application/json', host: 'shop.test' })), true);
});

test('a cross-site form post is refused', () => {
  assert.equal(isSameOriginJson(req({ 'content-type': 'text/plain', host: 'shop.test', origin: 'https://shop.test' })), false);
  assert.equal(isSameOriginJson(req({ host: 'shop.test' })), false);
  assert.equal(isSameOriginJson(req({ 'content-type': 'application/json', host: 'shop.test', origin: 'https://evil.test' })), false);
  assert.equal(isSameOriginJson(req({ 'content-type': 'application/json', host: 'shop.test', origin: 'null' })), false);
});

test('the configured public site also counts (nginx forwarding Host: localhost:3000)', () => {
  const r = req({ 'content-type': 'application/json', host: 'localhost:3000', origin: 'https://shop.test' });
  assert.equal(isSameOriginJson(r, 'https://shop.test'), true);
  assert.equal(isSameOriginJson(r, 'https://other.test'), false);
  assert.equal(isSameOriginJson(r), false);
});

test('isSameOrigin checks only the Origin, for multipart and empty posts', () => {
  assert.equal(isSameOrigin(req({ 'content-type': 'multipart/form-data; boundary=x', host: 'shop.test', origin: 'https://shop.test' })), true);
  assert.equal(isSameOrigin(req({ 'content-type': 'multipart/form-data; boundary=x', host: 'shop.test', origin: 'https://evil.test' })), false);
  assert.equal(isSameOrigin(req({ host: 'shop.test' })), true);
});
