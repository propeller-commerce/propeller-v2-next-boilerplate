/**
 * POST /api/cms-revalidate — Prepr publish-webhook entry point.
 *
 * The Prepr provider (`lib/cms/providers/prepr.ts`) tags its anonymous
 * published reads with `cms`, `cms:page:<slug>`, and `cms:article:<slug>`
 * (see TAG_CMS / cmsPageTag / cmsArticleTag there). This route lets Prepr bust
 * those cache entries the moment an editor publishes, instead of waiting for
 * the 60-second revalidate window — mirroring the catalog's /api/revalidate.
 *
 * Only active when Prepr is the CMS; returns 404 otherwise (a Strapi/Contentful
 * build tags nothing, so there is nothing to bust). Gated by the shared
 * `REVALIDATE_SECRET` (same secret as /api/revalidate).
 *
 * Contract (configure as the Prepr webhook target):
 *
 *   POST /api/cms-revalidate
 *   Header: X-Revalidate-Secret: <value of REVALIDATE_SECRET>
 *   Body:   { "slug": "about", "type": "page" }      // → busts cms:page:about
 *           { "slug": "my-post", "type": "article" } // → busts cms:article:my-post
 *           { "tag": "cms" }                          // → nuclear wipe of all CMS entries
 *           {}                                        // → also a full CMS wipe (safe default)
 *
 *   200  { "ok": true, "tags": ["cms:page:about"] }
 *   401  { "error": "unauthorized" }
 *   404  { "error": "not found" }        // Prepr is not the active CMS
 *   500  { "error": "<message>" }
 */
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { PREPR_ENABLED } from '@/lib/preprEvent';
import { TAG_CMS, cmsPageTag, cmsArticleTag } from '@/lib/cms/providers/prepr';

export async function POST(req: Request) {
  // Only Prepr tags CMS reads; nothing to revalidate for other providers.
  if (!PREPR_ENABLED) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const secret = req.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;

  // Fail closed when the secret isn't configured — never leave the route open.
  if (!expected) {
    return NextResponse.json(
      { error: 'revalidation endpoint not configured' },
      { status: 503 }
    );
  }
  if (!secret || secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>;
  } catch {
    // Empty/invalid body is fine — falls through to the full-CMS wipe below.
  }

  const slug = typeof body.slug === 'string' ? body.slug : undefined;
  const type = typeof body.type === 'string' ? body.type : undefined;
  const explicitTag = typeof body.tag === 'string' ? body.tag : undefined;

  // Resolve the set of tags to evict:
  //  - explicit `{tag}` (allow the `cms` umbrella / any cms:* tag), OR
  //  - `{slug,type}` → the entity tag + the `cms` umbrella, OR
  //  - nothing → full CMS wipe via the umbrella tag.
  let tags: string[];
  if (explicitTag) {
    tags = [explicitTag === '*' ? TAG_CMS : explicitTag];
  } else if (slug && type === 'article') {
    tags = [cmsArticleTag(slug), TAG_CMS];
  } else if (slug && (type === 'page' || type === undefined)) {
    tags = [cmsPageTag(slug), TAG_CMS];
  } else {
    tags = [TAG_CMS];
  }

  try {
    // Next 16's revalidateTag takes a cache-lifetime profile as the 2nd arg;
    // `'max'` evicts immediately — the right semantics for a publish webhook.
    for (const tag of tags) revalidateTag(tag, 'max');
    return NextResponse.json({ ok: true, tags });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'revalidation failed' },
      { status: 500 }
    );
  }
}
