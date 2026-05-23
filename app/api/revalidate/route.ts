/**
 * POST /api/revalidate — surgical cache invalidation entry point.
 *
 * Anonymous catalog reads (`getAnonymousInfra()` in `lib/server.ts`) attach
 * `next.tags` to their underlying `fetch()` calls, with the tag scheme
 * defined by `tagFor()` in the same module. This route lets the backend
 * (or a maintenance script) bust those cache entries surgically when
 * catalog data changes, instead of waiting for the 5-minute revalidate
 * window to elapse.
 *
 * Gated by a shared secret (`REVALIDATE_SECRET` env). Never expose this
 * route without the secret — a public revalidation endpoint is a trivial
 * DoS amplifier (every call forces the next render to re-fetch).
 *
 * Contract (the backend webhook implements this):
 *
 *   POST /api/revalidate
 *   Header: X-Revalidate-Secret: <value of REVALIDATE_SECRET>
 *   Body:   { "tag": "product:42" }   // or 'category:13', 'menu', 'catalog'
 *
 *   200  { "ok": true, "tag": "product:42" }
 *   400  { "error": "missing tag" }
 *   401  { "error": "unauthorized" }
 *   500  { "error": "<message>" }
 *
 * Tag values must be produced by `tagFor(...)` in `lib/server.ts`.
 * Free-form strings are accepted (Next doesn't validate tags), but
 * agreeing on the helper-generated set keeps everyone honest.
 */
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { TAG_CATALOG } from '@/lib/server';

export async function POST(req: Request) {
  const secret = req.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;

  // If the env var isn't set, fail closed rather than leaving the route
  // open. Operations should set REVALIDATE_SECRET before pointing the
  // backend webhook at this URL.
  if (!expected) {
    return NextResponse.json(
      { error: 'revalidation endpoint not configured' },
      { status: 503 }
    );
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const tag =
    body && typeof body === 'object' && 'tag' in body && typeof (body as { tag: unknown }).tag === 'string'
      ? (body as { tag: string }).tag
      : null;

  if (!tag) {
    return NextResponse.json({ error: 'missing tag' }, { status: 400 });
  }

  try {
    // Next 16's revalidateTag takes a cache-lifetime profile as the second
    // arg. `'max'` evicts immediately — the right semantics for a webhook
    // that just learned the underlying data changed.
    //
    // The wildcard `*` is a nuclear wipe. Every anonymous cache entry
    // attaches `TAG_CATALOG` as its umbrella tag (see `lib/server.ts`),
    // so busting that one tag clears the lot. Same shared-secret gate.
    const effectiveTag = tag === '*' ? TAG_CATALOG : tag;
    revalidateTag(effectiveTag, 'max');
    return NextResponse.json({ ok: true, tag });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'revalidation failed' },
      { status: 500 }
    );
  }
}
