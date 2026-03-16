import type { CmsProvider } from '../core';
import type {
  CmsImage,
  CmsSeo,
  CmsBlock,
  CmsPage,
  CmsGlobal,
  CmsNavLink,
  CmsFooterColumn,
  CmsValuePropItem,
  CmsCategoryBanner,
} from '../types';
import qs from 'qs';

// ── Normalizers (Strapi-specific) ──

function normalizeImage(strapiUrl: string, raw: any): CmsImage | null {
  if (!raw) return null;
  const url = raw.url?.startsWith('http') ? raw.url : `${strapiUrl}${raw.url}`;
  return {
    url,
    alternativeText: raw.alternativeText || null,
    width: raw.width || 0,
    height: raw.height || 0,
  };
}

function normalizeSeo(strapiUrl: string, raw: any): CmsSeo | null {
  if (!raw) return null;
  return {
    metaTitle: raw.metaTitle || '',
    metaDescription: raw.metaDescription || '',
    shareImage: normalizeImage(strapiUrl, raw.shareImage),
  };
}

function normalizeNavLink(raw: any): CmsNavLink {
  return {
    label: raw.label || '',
    url: raw.url || '',
    highlight: raw.highlight ?? false,
  };
}

function normalizeFooterColumn(raw: any): CmsFooterColumn {
  return {
    title: raw.title || '',
    links: (raw.links || []).map(normalizeNavLink),
  };
}

const COMPONENT_MAP: Record<string, string> = {
  'shared.hero-banner': 'hero-banner',
  'shared.rich-text': 'rich-text',
  'shared.media': 'media',
  'shared.quote': 'quote',
  'shared.value-props': 'value-props',
  'shared.call-to-action': 'call-to-action',
  'shared.product-carousel': 'product-carousel',
  'shared.contact-form': 'contact-form',
  'shared.slider': 'slider',
  'shared.product-slider': 'product-slider',
};

function parseIds(value: any): number[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter((n) => !isNaN(n));
  return String(value).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

function normalizeValuePropItem(raw: any): CmsValuePropItem {
  return {
    icon: raw.icon || '',
    title: raw.title || '',
    text: raw.text || '',
  };
}

function normalizeBlock(strapiUrl: string, raw: any): CmsBlock | null {
  const type = COMPONENT_MAP[raw.__component];
  if (!type) return null;

  switch (type) {
    case 'hero-banner':
      return {
        _type: 'hero-banner',
        title: raw.title || '',
        subtitle: raw.subtitle || null,
        image: normalizeImage(strapiUrl, raw.image),
        ctaText: raw.ctaText || null,
        ctaUrl: raw.ctaUrl || null,
        secondaryCtaText: raw.secondaryCtaText || null,
        secondaryCtaUrl: raw.secondaryCtaUrl || null,
      };
    case 'rich-text':
      return { _type: 'rich-text', body: raw.body || '' };
    case 'media':
      return { _type: 'media', file: normalizeImage(strapiUrl, raw.file) };
    case 'quote':
      return { _type: 'quote', title: raw.title || null, body: raw.body || '' };
    case 'value-props':
      return { _type: 'value-props', items: (raw.items || []).map(normalizeValuePropItem) };
    case 'call-to-action':
      return {
        _type: 'call-to-action',
        title: raw.title || '',
        description: raw.description || null,
        buttonText: raw.buttonText || '',
        buttonUrl: raw.buttonUrl || '',
        variant: raw.variant || 'primary',
      };
    case 'product-carousel':
      return {
        _type: 'product-carousel',
        title: raw.title || '',
        categoryId: raw.categoryId || '',
        limit: raw.limit || 8,
      };
    case 'contact-form':
      return {
        _type: 'contact-form',
        title: raw.title || null,
        description: raw.description || null,
        successMessage: raw.successMessage || 'Thank you for your message. We will get back to you soon.',
      };
    case 'slider':
      return {
        _type: 'slider',
        files: (raw.files || []).map((f: any) => normalizeImage(strapiUrl, f)).filter(Boolean) as CmsImage[],
      };
    case 'product-slider': {
      const items = typeof raw.items === 'string'
        ? JSON.parse(raw.items || '[]')
        : raw.items;
      const parsed = Array.isArray(items) ? items : [];
      return {
        _type: 'product-slider',
        title: raw.title || '',
        productIds: parsed.filter((p: any) => !p.isCluster).map((p: any) => p.id),
        clusterIds: parsed.filter((p: any) => p.isCluster).map((p: any) => p.id),
      };
    }
    default:
      return null;
  }
}

function normalizeBlocks(strapiUrl: string, raw: any[]): CmsBlock[] {
  if (!raw) return [];
  return raw.map((b) => normalizeBlock(strapiUrl, b)).filter(Boolean) as CmsBlock[];
}

function normalizePage(strapiUrl: string, raw: any): CmsPage {
  return {
    id: raw.id,
    title: raw.title || '',
    slug: raw.slug || '',
    description: raw.description || null,
    template: raw.template || 'default',
    seo: normalizeSeo(strapiUrl, raw.seo),
    blocks: normalizeBlocks(strapiUrl, raw.blocks || []),
  };
}

function normalizeGlobal(strapiUrl: string, raw: any): CmsGlobal {
  const langString = raw.availableLanguages || 'EN,NL';
  return {
    siteName: raw.siteName || '',
    siteDescription: raw.siteDescription || '',
    favicon: normalizeImage(strapiUrl, raw.favicon),
    defaultSeo: normalizeSeo(strapiUrl, raw.defaultSeo),
    logo: normalizeImage(strapiUrl, raw.logo),
    logoAlt: raw.logoAlt || null,
    topBarEnabled: raw.topBarEnabled ?? true,
    topBarPhone: raw.topBarPhone || null,
    topBarAnnouncement: raw.topBarAnnouncement || null,
    topBarAnnouncementEnabled: raw.topBarAnnouncementEnabled ?? false,
    showVatToggle: raw.showVatToggle ?? true,
    showLanguageSwitcher: raw.showLanguageSwitcher ?? true,
    availableLanguages: langString.split(',').map((l: string) => l.trim()).filter(Boolean),
    showSearch: raw.showSearch ?? true,
    showAccount: raw.showAccount ?? true,
    showCart: raw.showCart ?? true,
    showCategoriesMenu: raw.showCategoriesMenu ?? true,
    categoriesMenuLabel: raw.categoriesMenuLabel || null,
    navLinks: (raw.navLinks || []).map(normalizeNavLink),
    footerDescription: raw.footerDescription || null,
    footerColumns: (raw.footerColumns || []).map(normalizeFooterColumn),
    footerEmail: raw.footerEmail || null,
    footerPhone: raw.footerPhone || null,
    copyrightText: raw.copyrightText || null,
  };
}

function normalizeCategoryBanner(strapiUrl: string, raw: any): CmsCategoryBanner {
  return {
    categoryId: raw.categoryId || '',
    title: raw.title || null,
    subtitle: raw.subtitle || null,
    image: normalizeImage(strapiUrl, raw.image),
    ctaText: raw.ctaText || null,
    ctaUrl: raw.ctaUrl || null,
  };
}

// ── Provider factory ──

export function createStrapiProvider(): CmsProvider {
  const strapiUrl = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL || 'http://localhost:1337';
  const strapiToken = process.env.STRAPI_API_TOKEN || '';

  async function strapiFetch<T = any>(path: string, query?: Record<string, any>): Promise<T> {
    const queryString = query ? qs.stringify(query, { encodeValuesOnly: true }) : '';
    const url = `${strapiUrl}${path}${queryString ? `?${queryString}` : ''}`;

    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (strapiToken) {
      headers['Authorization'] = `Bearer ${strapiToken}`;
    }

    const isDev = process.env.NODE_ENV === 'development';

    const res = await fetch(url, {
      headers,
      cache: isDev ? 'no-store' : undefined,
      next: isDev ? undefined : { revalidate: 60 },
    });

    if (!res.ok) {
      if (res.status === 404) return { data: null } as T;
      const body = await res.text().catch(() => '');
      throw new Error(`Strapi ${res.status} ${res.statusText} — ${path} — ${body}`);
    }

    return res.json();
  }

  return {
    async getPage(slug: string) {
      try {
        const data = await strapiFetch('/api/pages', {
          filters: { slug: { $eq: slug } },
          populate: { seo: { populate: '*' }, blocks: { populate: '*' } },
        });
        const entry = data?.data?.[0];
        if (!entry) return null;
        return normalizePage(strapiUrl, entry);
      } catch (error) {
        console.error(`[CMS:Strapi] Failed to fetch page "${slug}":`, error);
        return null;
      }
    },

    async getAllPageSlugs() {
      try {
        const data = await strapiFetch('/api/pages', {
          fields: ['slug'],
          pagination: { pageSize: 100 },
        });
        return (data?.data || []).map((entry: any) => entry.slug);
      } catch (error) {
        console.error('[CMS:Strapi] Failed to fetch page slugs:', error);
        return [];
      }
    },

    async getGlobal() {
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
        return normalizeGlobal(strapiUrl, entry);
      } catch (error) {
        console.error('[CMS:Strapi] Failed to fetch global:', error);
        return null;
      }
    },

    async getCategoryBanner(categoryId: string) {
      try {
        const data = await strapiFetch('/api/category-banners', {
          filters: { categoryId: { $eq: categoryId } },
          populate: { image: true },
        });
        const entry = data?.data?.[0];
        if (!entry) return null;
        return normalizeCategoryBanner(strapiUrl, entry);
      } catch (error) {
        console.error(`[CMS:Strapi] Failed to fetch category banner for "${categoryId}":`, error);
        return null;
      }
    },

    resolveImageUrl(path: string) {
      if (path.startsWith('http')) return path;
      return `${strapiUrl}${path}`;
    },
  };
}
