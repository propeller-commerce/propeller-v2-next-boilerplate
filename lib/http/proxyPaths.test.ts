import test from 'node:test';
import assert from 'node:assert/strict';
import { proxyPathKind } from './proxyPaths.ts';

// Run with:  npm test

test('a page under a file-like path is never passed through without security headers', () => {
  for (const path of [
    '/product/123/x.js',
    '/search/a.json',
    '/category/1/x.css',
    '/robots.txt',
    '/favicon.ico',
  ]) {
    assert.equal(proxyPathKind(path), 'file', path);
  }
  for (const path of ['/', '/product/123/some.name', '/search/a.b', '/administratie']) {
    assert.equal(proxyPathKind(path), 'page', path);
  }
});

test('only API routes bypass the proxy; other Next internal paths get the headers', () => {
  for (const path of ['/api/graphql', '/api/punchout/transfer', '/api/x.json']) {
    assert.equal(proxyPathKind(path), 'bypass', path);
  }
  for (const path of ['/_next/x.js', '/_next/data/x.json', '/_next/x', '/apiary.js']) {
    assert.equal(proxyPathKind(path), 'file', path);
  }
});
