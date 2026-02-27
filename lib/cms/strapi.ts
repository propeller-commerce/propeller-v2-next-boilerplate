import { normalizePage, normalizeGlobal, normalizeCategoryBanner } from './normalizers';
import type { CmsPage, CmsGlobal, CmsCategoryBanner } from './types';
import qs from 'qs';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN || '';

// ── Internal fetch helper ──

async function strapiFetch<T = any>(path: string, query?: Record<string, any>): Promise<T> {
  const queryString = query ? qs.stringify(query, { encodeValuesOnly: true }) : '';
  const url = `${STRAPI_URL}${path}${queryString ? `?${queryString}` : ''}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (STRAPI_TOKEN) {
    headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
  }

  const isDev = process.env.NODE_ENV === 'development';

  const res = await fetch(url, {
    headers,
    cache: isDev ? 'no-store' : undefined,
    next: isDev ? undefined : { revalidate: 60 },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Strapi ${res.status} ${res.statusText} — ${path} — ${body}`);
  }

  return res.json();
}

// ── Public API ──

export async function getPage(slug: string): Promise<CmsPage | null> {
  try {
    const data = await strapiFetch('/api/pages', {
      filters: { slug: { $eq: slug } },
      populate: {
        seo: { populate: '*' },
        blocks: { populate: '*' },
      },
    });

    const entry = data?.data?.[0];
    if (!entry) return null;

    return normalizePage(entry);
  } catch (error) {
    console.error(`[CMS] Failed to fetch page "${slug}":`, error);
    return null;
  }
}

export async function getAllPageSlugs(): Promise<string[]> {
  try {
    const data = await strapiFetch('/api/pages', {
      fields: ['slug'],
      pagination: { pageSize: 100 },
    });

    return (data?.data || []).map((entry: any) => entry.slug);
  } catch (error) {
    console.error('[CMS] Failed to fetch page slugs:', error);
    return [];
  }
}

export async function getGlobal(): Promise<CmsGlobal | null> {
  try {
    const data = await strapiFetch('/api/global', {
      populate: {
        favicon: true,
        logo: true,
        defaultSeo: { populate: '*' },
        navLinks: true,
        footerColumns: { populate: '*' },
      },
    });

    const entry = data?.data;
    if (!entry) return null;

    return normalizeGlobal(entry);
  } catch (error) {
    console.error('[CMS] Failed to fetch global:', error);
    return null;
  }
}

export async function getCategoryBanner(categoryId: string): Promise<CmsCategoryBanner | null> {
  try {
    const data = await strapiFetch('/api/category-banners', {
      filters: { categoryId: { $eq: categoryId } },
      populate: { image: true },
    });

    const entry = data?.data?.[0];
    if (!entry) return null;

    return normalizeCategoryBanner(entry);
  } catch (error) {
    console.error(`[CMS] Failed to fetch category banner for "${categoryId}":`, error);
    return null;
  }
}
