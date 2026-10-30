import test from 'node:test';
import assert from 'node:assert/strict';
import { clientIp } from './clientIp.ts';

test('first x-forwarded-for hop, then x-real-ip, else unknown', () => {
  assert.equal(clientIp(new Headers({ 'x-forwarded-for': ' 1.1.1.1 , 2.2.2.2', 'x-real-ip': '3.3.3.3' })), '1.1.1.1');
  assert.equal(clientIp(new Headers({ 'x-real-ip': '3.3.3.3' })), '3.3.3.3');
  assert.equal(clientIp(new Headers()), 'unknown');
});
