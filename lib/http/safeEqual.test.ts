import test from 'node:test';
import assert from 'node:assert/strict';
import { safeEqual } from './safeEqual.ts';

test('equal strings match, anything else does not', () => {
  assert.equal(safeEqual('s3cret', 's3cret'), true);
  assert.equal(safeEqual('s3cret', 's3creT'), false);
  assert.equal(safeEqual('s3cret', 's3cret '), false);
  assert.equal(safeEqual('', 'x'), false);
});
