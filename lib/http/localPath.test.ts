import test from 'node:test';
import assert from 'node:assert/strict';
import { localPath } from './localPath.ts';

test('only same-site paths are accepted as redirect targets', () => {
  assert.equal(localPath('/account/tickets?x=1'), '/account/tickets?x=1');
  assert.equal(localPath('/en/cart'), '/en/cart');
  // A URL in the query string is fine: only the path decides where the browser goes.
  assert.equal(localPath('/cart?back=https://x.example//y'), '/cart?back=https://x.example//y');
  for (const raw of ['https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '\t//evil.test', '/a\nb', 'account', '', null, undefined]) {
    assert.equal(localPath(raw), undefined, String(raw));
  }
});

test('a language prefix can not hide a protocol-relative URL', () => {
  // stripLanguagePrefix('/en//evil.example') is '//evil.example', which the browser treats as a host.
  for (const raw of ['/en//evil.example', '/de/\\evil.example', '/en/a//b', '/en\\/evil.example', '/x/%2F/ok']) {
    const expected = raw === '/x/%2F/ok' ? raw : undefined;
    assert.equal(localPath(raw), expected, raw);
  }
});
