import test from 'node:test';
import assert from 'node:assert/strict';
import { marked } from 'marked';
import { sanitizeRichText } from './sanitize.ts';

test('script, event handlers, javascript: links and iframes are removed', () => {
  assert.equal(sanitizeRichText('<p>a<script>alert(1)</script>b</p>'), '<p>ab</p>');
  assert.equal(sanitizeRichText('<img src="x" onerror="alert(1)">'), '<img src="x" />');
  assert.equal(sanitizeRichText('<a href="javascript:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeRichText('<a href=" JaVaScRiPt:alert(1)">x</a>'), '<a>x</a>');
  assert.equal(sanitizeRichText('<iframe src="https://evil.test"></iframe><p>ok</p>'), '<p>ok</p>');
  assert.equal(sanitizeRichText('<p style="background:url(x)" onclick="x()">t</p>'), '<p>t</p>');
  assert.equal(sanitizeRichText('<form action="https://evil.test"><input name="p"></form>'), '');
  assert.equal(sanitizeRichText('<svg><script>alert(1)</script></svg>'), '');
  assert.equal(sanitizeRichText(''), '');
});

test('markdown from the CMS keeps its prose, links, images, lists, tables and code', () => {
  const md = [
    '## Heading',
    '',
    'Some **bold**, *italic*, ~~gone~~ and a [link](https://shop.test/a?b=1 "Title") and [mail](mailto:a@b.test).',
    '',
    '- one',
    '- two',
    '',
    '3. three',
    '',
    '![Alt text](/uploads/pic.png)',
    '',
    '> quoted',
    '',
    '| A | B |',
    '|:--|--:|',
    '| 1 | 2 |',
    '',
    '```js',
    'const x = 1 < 2;',
    '```',
  ].join('\n');
  const html = marked.parse(md, { async: false }) as string;
  assert.equal(sanitizeRichText(html), html.replace('<img src="/uploads/pic.png" alt="Alt text">', '<img src="/uploads/pic.png" alt="Alt text" />'));
});

test('raw HTML inside markdown is cleaned, the text around it kept', () => {
  const html = marked.parse('Hello <img src=x onerror=alert(1)> world', { async: false }) as string;
  assert.equal(sanitizeRichText(html), '<p>Hello <img src="x" /> world</p>\n');
});

test('Prepr / Contentful style HTML keeps headings and paragraphs', () => {
  const html = '<h2>Title</h2><p>Text with <a href="/page">a link</a>.</p><ul><li>item</li></ul>';
  assert.equal(sanitizeRichText(html), html);
});

test('same allowlist as propeller-vue: new-tab links get noopener; protocol-relative and data: URLs go', () => {
  assert.equal(
    sanitizeRichText('<a href="https://x.test" target="_blank">x</a>'),
    '<a href="https://x.test" target="_blank" rel="noopener noreferrer">x</a>',
  );
  assert.equal(sanitizeRichText('<a href="//evil.test/a">x</a>'), '<a>x</a>');
  assert.equal(sanitizeRichText('<img src="data:image/svg+xml;base64,PHN2Zz4=" alt="a">'), '<img alt="a" />');
});
