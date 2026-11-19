import test from 'node:test';
import assert from 'node:assert/strict';
import { clientIp } from './clientIp.ts';

test('the right-most x-forwarded-for hop: the address our own proxy saw', () => {
  // nginx appends $remote_addr; anything left of it was written by the client.
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': ' 6.6.6.6 , 2.2.2.2', 'x-real-ip': '3.3.3.3' })), '2.2.2.2');
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '2.2.2.2' })), '2.2.2.2');
});

test('a forged first hop does not change the key', () => {
  const a = clientIp(new Headers({ 'x-forwarded-for': '10.9.9.1, 2.2.2.2' }));
  const b = clientIp(new Headers({ 'x-forwarded-for': '10.9.9.2, 2.2.2.2' }));
  assert.equal(a, b);
});

test('more trusted proxies (e.g. a CDN in front of nginx) skip that many hops from the right', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 1.1.1.1, 9.9.9.9' }), 2), '1.1.1.1');
  // Fewer hops than trusted proxies: the left-most is the best there is.
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1' }), 3), '1.1.1.1');
});

test('without x-forwarded-for: unknown, whatever x-real-ip or cf-connecting-ip says', () => {
  assert.equal(clientIp(new Headers({ 'x-real-ip': '3.3.3.3' })), 'unknown');
  assert.equal(clientIp(new Headers({ 'cf-connecting-ip': '5.5.5.5' })), 'unknown');
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': ' , ' })), 'unknown');
  assert.equal(clientIp(new Headers()), 'unknown');
});
