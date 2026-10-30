import test from 'node:test';
import assert from 'node:assert/strict';
import { frameAncestors, previewPath, resolvePreviewRequest, strapiPreviewOrigin } from './preview.ts';

// Run with:  npm test

const STRAPI = { prepr: false, strapi: true, secret: 's3cret' };
const params = (q: Record<string, string>) => new URLSearchParams(q);

test('preview route 404s when no CMS preview is configured', () => {
  assert.equal(resolvePreviewRequest(params({ secret: 'x' }), { prepr: false, strapi: false, secret: 'x' }).status, 404);
  assert.equal(resolvePreviewRequest(params({ secret: '' }), { prepr: false, strapi: true, secret: undefined }).status, 404);
});

test('preview route rejects a wrong or missing secret with 401', () => {
  assert.equal(resolvePreviewRequest(params({ secret: 'nope', slug: '/about' }), STRAPI).status, 401);
  assert.equal(resolvePreviewRequest(params({ slug: '/about' }), STRAPI).status, 401);
});

test('draft status enables draft mode, published disables it', () => {
  const draft = resolvePreviewRequest(params({ secret: 's3cret', slug: '/about', status: 'draft' }), STRAPI);
  assert.deepEqual(draft, { status: 307, draft: true, location: '/about' });
  const live = resolvePreviewRequest(params({ secret: 's3cret', slug: '/about', status: 'published' }), STRAPI);
  assert.deepEqual(live, { status: 307, draft: false, location: '/about' });
  const prepr = resolvePreviewRequest(params({ secret: 'p', slug: '/about' }), { prepr: true, strapi: false, secret: 'p' });
  assert.equal(prepr.status === 307 && prepr.draft, true);
});

test('home slugs land on the root and the locale is carried through', () => {
  const res = resolvePreviewRequest(params({ secret: 's3cret', slug: '/', locale: 'nl', status: 'draft' }), STRAPI);
  assert.deepEqual(res, { status: 307, draft: true, location: '/?preview_lang=NL' });
  assert.equal(previewPath('home'), '/');
  assert.equal(previewPath('blog/post'), '/blog/post');
});

test('protocol-relative slugs cannot redirect off-site', () => {
  for (const slug of ['//evil.example', '///evil.example', '/\\evil.example', '\\\\evil.example']) {
    const res = resolvePreviewRequest(params({ secret: 's3cret', slug }), STRAPI);
    assert.equal(res.status, 307);
    if (res.status === 307) {
      assert.equal(res.location, '/evil.example');
      assert.equal(new URL(res.location, 'https://shop.test').origin, 'https://shop.test');
    }
  }
});

test('frame-ancestors allows the Strapi origin only when its preview secret is set', () => {
  const env = { CMS_PROVIDER: 'strapi', NEXT_PUBLIC_STRAPI_API_URL: 'https://cms.shop.test/api' };
  assert.equal(strapiPreviewOrigin(env), '');
  const origin = strapiPreviewOrigin({ ...env, STRAPI_PREVIEW_SECRET: 'x' });
  assert.equal(origin, 'https://cms.shop.test');
  assert.equal(frameAncestors(false, origin), "frame-ancestors 'self' https://cms.shop.test");
  assert.equal(frameAncestors(false, ''), "frame-ancestors 'none'");
  assert.equal(strapiPreviewOrigin({ ...env, CMS_PROVIDER: 'prepr', STRAPI_PREVIEW_SECRET: 'x' }), '');
  assert.equal(strapiPreviewOrigin({ CMS_PROVIDER: 'strapi', STRAPI_PREVIEW_SECRET: 'x', STRAPI_API_URL: 'not a url' }), '');
  assert.equal(frameAncestors(true, ''), "frame-ancestors 'self' https://*.prepr.io");
});

test('previewPath keeps every slug on the shop (also used by /api/preview/exit)', () => {
  for (const slug of ['//evil.example', '/\evil.example', '\\evil.example']) {
    assert.equal(new URL(previewPath(slug), 'https://shop.test').origin, 'https://shop.test');
  }
});
