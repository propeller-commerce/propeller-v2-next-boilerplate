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
} from './types';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || process.env.STRAPI_API_URL || 'http://localhost:1337';

// ── Image ──

export function normalizeImage(raw: any): CmsImage | null {
  if (!raw) return null;
  const url = raw.url?.startsWith('http') ? raw.url : `${STRAPI_URL}${raw.url}`;
  return {
    url,
    alternativeText: raw.alternativeText || null,
    width: raw.width || 0,
    height: raw.height || 0,
  };
}

// ── SEO ──

export function normalizeSeo(raw: any): CmsSeo | null {
  if (!raw) return null;
  return {
    metaTitle: raw.metaTitle || '',
    metaDescription: raw.metaDescription || '',
    shareImage: normalizeImage(raw.shareImage),
  };
}

// ── Nav Link ──

function normalizeNavLink(raw: any): CmsNavLink {
  return {
    label: raw.label || '',
    url: raw.url || '',
    highlight: raw.highlight ?? false,
  };
}

// ── Footer Column ──

function normalizeFooterColumn(raw: any): CmsFooterColumn {
  return {
    title: raw.title || '',
    links: (raw.links || []).map(normalizeNavLink),
  };
}

// ── Helpers ──

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

// ── Blocks ──

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

function normalizeValuePropItem(raw: any): CmsValuePropItem {
  return {
    icon: raw.icon || '',
    title: raw.title || '',
    text: raw.text || '',
  };
}

function normalizeBlock(raw: any): CmsBlock | null {
  const type = COMPONENT_MAP[raw.__component];
  if (!type) return null;

  switch (type) {
    case 'hero-banner':
      return {
        _type: 'hero-banner',
        title: raw.title || '',
        subtitle: raw.subtitle || null,
        image: normalizeImage(raw.image),
        ctaText: raw.ctaText || null,
        ctaUrl: raw.ctaUrl || null,
        secondaryCtaText: raw.secondaryCtaText || null,
        secondaryCtaUrl: raw.secondaryCtaUrl || null,
      };
    case 'rich-text':
      return {
        _type: 'rich-text',
        body: raw.body || '',
      };
    case 'media':
      return {
        _type: 'media',
        file: normalizeImage(raw.file),
      };
    case 'quote':
      return {
        _type: 'quote',
        title: raw.title || null,
        body: raw.body || '',
      };
    case 'value-props':
      return {
        _type: 'value-props',
        items: (raw.items || []).map(normalizeValuePropItem),
      };
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
        files: (raw.files || []).map(normalizeImage).filter(Boolean) as CmsImage[],
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

export function normalizeBlocks(raw: any[]): CmsBlock[] {
  if (!raw) return [];
  return raw.map(normalizeBlock).filter(Boolean) as CmsBlock[];
}

// ── Category Banner ──

export function normalizeCategoryBanner(raw: any): CmsCategoryBanner {
  return {
    categoryId: raw.categoryId || '',
    title: raw.title || null,
    subtitle: raw.subtitle || null,
    image: normalizeImage(raw.image),
    ctaText: raw.ctaText || null,
    ctaUrl: raw.ctaUrl || null,
  };
}

// ── Page ──

export function normalizePage(raw: any): CmsPage {
  return {
    id: raw.id,
    title: raw.title || '',
    slug: raw.slug || '',
    description: raw.description || null,
    template: raw.template || 'default',
    seo: normalizeSeo(raw.seo),
    blocks: normalizeBlocks(raw.blocks || []),
  };
}

// ── Global ──

export function normalizeGlobal(raw: any): CmsGlobal {
  const langString = raw.availableLanguages || 'EN,NL';
  return {
    siteName: raw.siteName || '',
    siteDescription: raw.siteDescription || '',
    favicon: normalizeImage(raw.favicon),
    defaultSeo: normalizeSeo(raw.defaultSeo),
    // Header — branding
    logo: normalizeImage(raw.logo),
    logoAlt: raw.logoAlt || null,
    // Header — top bar
    topBarEnabled: raw.topBarEnabled ?? true,
    topBarPhone: raw.topBarPhone || null,
    topBarAnnouncement: raw.topBarAnnouncement || null,
    topBarAnnouncementEnabled: raw.topBarAnnouncementEnabled ?? false,
    showVatToggle: raw.showVatToggle ?? true,
    showLanguageSwitcher: raw.showLanguageSwitcher ?? true,
    availableLanguages: langString.split(',').map((l: string) => l.trim()).filter(Boolean),
    // Header — functional components
    showSearch: raw.showSearch ?? true,
    showAccount: raw.showAccount ?? true,
    showCart: raw.showCart ?? true,
    showCategoriesMenu: raw.showCategoriesMenu ?? true,
    categoriesMenuLabel: raw.categoriesMenuLabel || null,
    // Header — navigation
    navLinks: (raw.navLinks || []).map(normalizeNavLink),
    // Footer
    footerDescription: raw.footerDescription || null,
    footerColumns: (raw.footerColumns || []).map(normalizeFooterColumn),
    footerEmail: raw.footerEmail || null,
    footerPhone: raw.footerPhone || null,
    copyrightText: raw.copyrightText || null,
  };
}
