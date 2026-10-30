import { isHomeSlug } from './core.ts';

export interface PreviewConfig {
  prepr: boolean;
  strapi: boolean;
  secret?: string;
}

export type PreviewDecision =
  | { status: 401 | 404; body: string }
  | { status: 307; draft: boolean; location: string };

/** Origin of the Strapi admin allowed to frame the storefront; '' when Strapi preview is off. */
export function strapiPreviewOrigin(env: Record<string, string | undefined>): string {
  if ((env.NEXT_PUBLIC_CMS_PROVIDER || env.CMS_PROVIDER) !== 'strapi' || !env.STRAPI_PREVIEW_SECRET) return '';
  try {
    return new URL(env.NEXT_PUBLIC_STRAPI_API_URL || env.STRAPI_API_URL || '').origin;
  } catch {
    return '';
  }
}

/** CSP frame-ancestors: the CMS editor may frame us, otherwise nobody. */
export function frameAncestors(isPrepr: boolean, strapiOrigin: string): string {
  if (isPrepr) return "frame-ancestors 'self' https://*.prepr.io";
  if (strapiOrigin) return `frame-ancestors 'self' ${strapiOrigin}`;
  return "frame-ancestors 'none'";
}

/** Same-origin path for a preview slug; leading slashes/backslashes are collapsed so `//host` cannot escape. */
export function previewPath(slug: string): string {
  return isHomeSlug(slug) ? '/' : `/${slug.replace(/^[/\\]+/, '')}`;
}

/** Validates a /api/preview request and decides draft mode plus the redirect target. */
export function resolvePreviewRequest(searchParams: URLSearchParams, config: PreviewConfig): PreviewDecision {
  if ((!config.prepr && !config.strapi) || !config.secret) return { status: 404, body: 'Not found' };
  if (searchParams.get('secret') !== config.secret) return { status: 401, body: 'Invalid preview secret' };

  const base = previewPath(searchParams.get('slug') || searchParams.get('redirect') || '/');

  // Carry the edited locale (en-US → EN) and Prepr's segment / A-B switch through the redirect.
  const passthrough = new URLSearchParams();
  const rawLocale = searchParams.get('locale') || searchParams.get('lang');
  if (rawLocale) passthrough.set('preview_lang', rawLocale.split('-')[0].toUpperCase());
  for (const key of ['prepr_preview_segment', 'prepr_preview_ab']) {
    const value = searchParams.get(key);
    if (value) passthrough.set(key, value);
  }
  const query = passthrough.toString();
  return {
    status: 307,
    // Strapi's "Published" tab sends status=published: show the live page.
    draft: searchParams.get('status') !== 'published',
    location: query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base,
  };
}
