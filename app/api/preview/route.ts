import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest } from 'next/server';
import { isHomeSlug } from '@/lib/cms';
import { PREPR_ENABLED } from '@/lib/preprEvent';

// Shared secret guarding draft mode. Configure the Prepr environment's preview
// URL as:  https://<host>/api/preview?secret=<PREPR_PREVIEW_SECRET>&slug=/{slug}&locale={locale}
// Prepr fills {locale} with the locale being edited (e.g. en-US), so the preview
// follows the editor's locale switch.
const PREVIEW_SECRET = process.env.PREPR_PREVIEW_SECRET || 'prepr-preview';

/**
 * Enables Next.js draft mode (so pages fetch unpublished content via the Prepr
 * Preview token) and redirects to the requested page. Used by Prepr's in-editor
 * preview. Only available when Prepr is the active CMS.
 */
export async function GET(request: NextRequest) {
  if (!PREPR_ENABLED) {
    return new Response('Not found', { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug') || searchParams.get('redirect') || '/';

  if (secret !== PREVIEW_SECRET) {
    return new Response('Invalid preview secret', { status: 401 });
  }

  (await draftMode()).enable();

  // The home page (incl. the personalized "home-personalized" slug) is served at
  // the root `/`, not via the catch-all CMS route — so a preview of it must land
  // on `/`. Everything else previews at its own slug. Only same-origin paths.
  const base = isHomeSlug(slug) ? '/' : slug.startsWith('/') ? slug : `/${slug}`;

  // Prepr's preview bar appends its segment / A-B switch as query params on the
  // preview URL. This route 307-redirects to the page, which would drop the
  // query string — so carry the switch params through so the page (and proxy.ts)
  // can resolve the chosen variant.
  const passthrough = new URLSearchParams();
  // Carry the edited locale to the (server-rendered) page. Prepr fills {locale}
  // with the locale being edited (e.g. en-US); normalise to the storefront's
  // short code (en-US → EN) and pass it as a query param — it survives the
  // redirect and works inside Prepr's cross-site iframe (no cookie needed). A
  // manual &lang= short code is also accepted.
  const rawLocale = searchParams.get('locale') || searchParams.get('lang');
  if (rawLocale) passthrough.set('preview_lang', rawLocale.split('-')[0].toUpperCase());
  for (const key of ['prepr_preview_segment', 'prepr_preview_ab']) {
    const value = searchParams.get(key);
    if (value) passthrough.set(key, value);
  }
  const query = passthrough.toString();
  redirect(query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base);
}
