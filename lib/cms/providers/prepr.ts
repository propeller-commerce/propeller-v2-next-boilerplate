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
  CmsArticle,
  CmsAuthor,
} from '../types';

// ── GraphQL client ──

async function preprFetch<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
  const endpoint = `https://graphql.prepr.io/${process.env.PREPR_ACCESS_TOKEN}`;
  const isDev = process.env.NODE_ENV === 'development';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    cache: isDev ? 'no-store' : undefined,
    next: isDev ? undefined : { revalidate: 60 },
  } as RequestInit);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Prepr ${res.status} ${res.statusText} — ${body}`);
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(`Prepr GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

// ── Normalizers ──

function normalizeImage(raw: any): CmsImage | null {
  if (!raw) return null;
  return {
    url: raw.url || '',
    alternativeText: raw.alt || null,
    width: raw.width || 0,
    height: raw.height || 0,
  };
}

function normalizeSeo(raw: any): CmsSeo | null {
  if (!raw) return null;
  return {
    metaTitle: raw.metaTitle || raw.meta_title || '',
    metaDescription: raw.metaDescription || raw.meta_description || '',
    shareImage: normalizeImage(raw.shareImage || raw.share_image),
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

function normalizeValuePropItem(raw: any): CmsValuePropItem {
  return {
    icon: raw.icon || '',
    title: raw.title || '',
    text: raw.text || '',
  };
}

function parseIds(value: any): number[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(Number).filter((n) => !isNaN(n));
  return String(value).split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

const TYPENAME_MAP: Record<string, string> = {
  HeroBanner: 'hero-banner',
  RichText: 'rich-text',
  Media: 'media',
  Quote: 'quote',
  ValueProps: 'value-props',
  CallToAction: 'call-to-action',
  ProductCarousel: 'product-carousel',
  ContactForm: 'contact-form',
  Slider: 'slider',
  ProductSlider: 'product-slider',
};

function normalizeBlock(raw: any): CmsBlock | null {
  const type = TYPENAME_MAP[raw.__typename];
  if (!type) return null;

  switch (type) {
    case 'hero-banner':
      return {
        _type: 'hero-banner',
        title: raw.title || '',
        subtitle: raw.subtitle || null,
        image: normalizeImage(raw.image),
        ctaText: raw.ctaText || raw.cta_text || null,
        ctaUrl: raw.ctaUrl || raw.cta_url || null,
        secondaryCtaText: raw.secondaryCtaText || raw.secondary_cta_text || null,
        secondaryCtaUrl: raw.secondaryCtaUrl || raw.secondary_cta_url || null,
      };
    case 'rich-text':
      return { _type: 'rich-text', body: raw.body || raw.html || '' };
    case 'media':
      return { _type: 'media', file: normalizeImage(raw.file) };
    case 'quote':
      return { _type: 'quote', title: raw.title || null, body: raw.body || '' };
    case 'value-props':
      return { _type: 'value-props', items: (raw.items || []).map(normalizeValuePropItem) };
    case 'call-to-action':
      return {
        _type: 'call-to-action',
        title: raw.title || '',
        description: raw.description || null,
        buttonText: raw.buttonText || raw.button_text || '',
        buttonUrl: raw.buttonUrl || raw.button_url || '',
        variant: raw.variant || 'primary',
      };
    case 'product-carousel':
      return {
        _type: 'product-carousel',
        title: raw.title || '',
        categoryId: raw.categoryId || raw.category_id || '',
        limit: raw.limit || 8,
      };
    case 'contact-form':
      return {
        _type: 'contact-form',
        title: raw.title || null,
        description: raw.description || null,
        successMessage: raw.successMessage || raw.success_message || 'Thank you for your message. We will get back to you soon.',
      };
    case 'slider':
      return {
        _type: 'slider',
        files: (raw.files || []).map((f: any) => normalizeImage(f)).filter(Boolean) as CmsImage[],
      };
    case 'product-slider': {
      let productIds: number[] = [];
      let clusterIds: number[] = [];
      if (raw.items && Array.isArray(raw.items)) {
        productIds = raw.items.filter((p: any) => !p.isCluster).map((p: any) => Number(p.id)).filter((n: number) => !isNaN(n));
        clusterIds = raw.items.filter((p: any) => p.isCluster).map((p: any) => Number(p.id)).filter((n: number) => !isNaN(n));
      } else {
        productIds = parseIds(raw.productIds || raw.product_ids);
        clusterIds = parseIds(raw.clusterIds || raw.cluster_ids);
      }
      return {
        _type: 'product-slider',
        title: raw.title || '',
        productIds,
        clusterIds,
      };
    }
    default:
      return null;
  }
}

function normalizeBlocks(raw: any[]): CmsBlock[] {
  if (!raw) return [];
  return raw.map((b) => normalizeBlock(b)).filter(Boolean) as CmsBlock[];
}

function normalizePage(raw: any): CmsPage {
  return {
    id: raw._id,
    title: raw.title || '',
    slug: raw.slug || raw._slug || '',
    description: raw.description || null,
    template: raw.template || 'default',
    seo: normalizeSeo(raw.seo),
    blocks: normalizeBlocks(raw.blocks || []),
  };
}

function normalizeGlobal(raw: any): CmsGlobal {
  const langString = raw.availableLanguages || raw.available_languages || 'EN,NL';
  return {
    siteName: raw.siteName || raw.site_name || '',
    siteDescription: raw.siteDescription || raw.site_description || '',
    favicon: normalizeImage(raw.favicon),
    defaultSeo: normalizeSeo(raw.defaultSeo || raw.default_seo),
    logo: normalizeImage(raw.logo),
    logoAlt: raw.logoAlt || raw.logo_alt || null,
    topBarEnabled: raw.topBarEnabled ?? raw.top_bar_enabled ?? true,
    topBarPhone: raw.topBarPhone || raw.top_bar_phone || null,
    topBarAnnouncement: raw.topBarAnnouncement || raw.top_bar_announcement || null,
    topBarAnnouncementEnabled: raw.topBarAnnouncementEnabled ?? raw.top_bar_announcement_enabled ?? false,
    showVatToggle: raw.showVatToggle ?? raw.show_vat_toggle ?? true,
    showLanguageSwitcher: raw.showLanguageSwitcher ?? raw.show_language_switcher ?? true,
    availableLanguages: String(langString).split(',').map((l: string) => l.trim()).filter(Boolean),
    showSearch: raw.showSearch ?? raw.show_search ?? true,
    showAccount: raw.showAccount ?? raw.show_account ?? true,
    showCart: raw.showCart ?? raw.show_cart ?? true,
    showCategoriesMenu: raw.showCategoriesMenu ?? raw.show_categories_menu ?? true,
    categoriesMenuLabel: raw.categoriesMenuLabel || raw.categories_menu_label || null,
    navLinks: (raw.navLinks || raw.nav_links || []).map(normalizeNavLink),
    footerDescription: raw.footerDescription || raw.footer_description || null,
    footerColumns: (raw.footerColumns || raw.footer_columns || []).map(normalizeFooterColumn),
    footerEmail: raw.footerEmail || raw.footer_email || null,
    footerPhone: raw.footerPhone || raw.footer_phone || null,
    copyrightText: raw.copyrightText || raw.copyright_text || null,
  };
}

function normalizeCategoryBanner(raw: any): CmsCategoryBanner {
  return {
    categoryId: raw.categoryId || raw.category_id || '',
    title: raw.title || null,
    subtitle: raw.subtitle || null,
    image: normalizeImage(raw.image),
    ctaText: raw.ctaText || raw.cta_text || null,
    ctaUrl: raw.ctaUrl || raw.cta_url || null,
  };
}

function normalizeAuthor(raw: any): CmsAuthor | null {
  if (!raw) return null;
  return {
    name: raw.name || '',
    avatar: normalizeImage(raw.avatar),
    email: raw.email || null,
  };
}

function normalizeArticle(raw: any): CmsArticle {
  return {
    id: raw._id,
    title: raw.title || '',
    description: raw.description || null,
    slug: raw.slug || raw._slug || '',
    cover: normalizeImage(raw.cover),
    author: normalizeAuthor(raw.author),
    category: raw.category ? { name: raw.category.name || '', slug: raw.category.slug || '' } : null,
    blocks: normalizeBlocks(raw.blocks || []),
    publishedAt: raw.publishedAt || raw._publish_on || null,
  };
}

// ── GraphQL fragments ──

const IMAGE_FIELDS = `url width height`;

const SEO_FRAGMENT = `
  seo {
    metaTitle: meta_title
    metaDescription: meta_description
    shareImage: share_image {
      ${IMAGE_FIELDS}
    }
  }
`;

const BLOCK_FRAGMENTS = `
  __typename
  ... on HeroBanner {
    title
    subtitle
    image { ${IMAGE_FIELDS} }
    ctaText: cta_text
    ctaUrl: cta_url
    secondaryCtaText: secondary_cta_text
    secondaryCtaUrl: secondary_cta_url
  }
  ... on RichText {
    body
    html
  }
  ... on Media {
    file { ${IMAGE_FIELDS} }
  }
  ... on Quote {
    title
    body
  }
  ... on ValueProps {
    items {
      icon
      title
      text
    }
  }
  ... on CallToAction {
    title
    description
    buttonText: button_text
    buttonUrl: button_url
    variant
  }
  ... on ProductCarousel {
    title
    categoryId: category_id
    limit
  }
  ... on ContactForm {
    title
    description
    successMessage: success_message
  }
  ... on Slider {
    files { ${IMAGE_FIELDS} }
  }
  ... on ProductSlider {
    title
    productIds: product_ids
    clusterIds: cluster_ids
    items {
      id
      isCluster
    }
  }
`;

// ── Provider factory ──

export function createPreprProvider(): CmsProvider {
  return {
    async getPage(slug: string) {
      try {
        const data = await preprFetch<any>(`
          query GetPage($slug: String!) {
            Pages(where: { slug: $slug }, limit: 1) {
              items {
                _id
                title
                slug
                description
                template
                ${SEO_FRAGMENT}
                blocks {
                  ${BLOCK_FRAGMENTS}
                }
              }
            }
          }
        `, { slug });
        const entry = data?.Pages?.items?.[0];
        if (!entry) return null;
        return normalizePage(entry);
      } catch (error) {
        console.error(`[CMS:Prepr] Failed to fetch page "${slug}":`, error);
        return null;
      }
    },

    async getAllPageSlugs() {
      try {
        const data = await preprFetch<any>(`
          query GetAllPageSlugs {
            Pages(limit: 100) {
              items {
                slug
              }
            }
          }
        `);
        return (data?.Pages?.items || []).map((entry: any) => entry.slug);
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch page slugs:', error);
        return [];
      }
    },

    async getGlobal() {
      try {
        const data = await preprFetch<any>(`
          query GetGlobal {
            Global {
              siteName: site_name
              siteDescription: site_description
              favicon { ${IMAGE_FIELDS} }
              defaultSeo: default_seo {
                metaTitle: meta_title
                metaDescription: meta_description
                shareImage: share_image { ${IMAGE_FIELDS} }
              }
              logo { ${IMAGE_FIELDS} }
              logoAlt: logo_alt
              topBarEnabled: top_bar_enabled
              topBarPhone: top_bar_phone
              topBarAnnouncement: top_bar_announcement
              topBarAnnouncementEnabled: top_bar_announcement_enabled
              showVatToggle: show_vat_toggle
              showLanguageSwitcher: show_language_switcher
              availableLanguages: available_languages
              showSearch: show_search
              showAccount: show_account
              showCart: show_cart
              showCategoriesMenu: show_categories_menu
              categoriesMenuLabel: categories_menu_label
              navLinks: nav_links {
                label
                url
                highlight
              }
              footerDescription: footer_description
              footerColumns: footer_columns {
                title
                links {
                  label
                  url
                  highlight
                }
              }
              footerEmail: footer_email
              footerPhone: footer_phone
              copyrightText: copyright_text
            }
          }
        `);
        const entry = data?.Global;
        if (!entry) return null;
        return normalizeGlobal(entry);
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch global:', error);
        return null;
      }
    },

    async getCategoryBanner(categoryId: string) {
      try {
        const data = await preprFetch<any>(`
          query GetCategoryBanner($categoryId: String!) {
            CategoryBanners(where: { category_id: $categoryId }, limit: 1) {
              items {
                categoryId: category_id
                title
                subtitle
                image { ${IMAGE_FIELDS} }
                ctaText: cta_text
                ctaUrl: cta_url
              }
            }
          }
        `, { categoryId });
        const entry = data?.CategoryBanners?.items?.[0];
        if (!entry) return null;
        return normalizeCategoryBanner(entry);
      } catch {
        return null;
      }
    },

    async getArticles() {
      try {
        const data = await preprFetch<any>(`
          query GetArticles {
            Articles(sort: publishedAt_DESC, limit: 100) {
              items {
                _id
                title
                description
                slug
                publishedAt: _publish_on
                cover { ${IMAGE_FIELDS} }
                author {
                  name
                  avatar { ${IMAGE_FIELDS} }
                  email
                }
                category {
                  name
                  slug
                }
              }
            }
          }
        `);
        return (data?.Articles?.items || []).map((entry: any) => normalizeArticle(entry));
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch articles:', error);
        return [];
      }
    },

    async getArticle(slug: string) {
      try {
        const data = await preprFetch<any>(`
          query GetArticle($slug: String!) {
            Articles(where: { slug: $slug }, limit: 1) {
              items {
                _id
                title
                description
                slug
                publishedAt: _publish_on
                cover { ${IMAGE_FIELDS} }
                author {
                  name
                  avatar { ${IMAGE_FIELDS} }
                  email
                }
                category {
                  name
                  slug
                }
                blocks {
                  ${BLOCK_FRAGMENTS}
                }
              }
            }
          }
        `, { slug });
        const entry = data?.Articles?.items?.[0];
        if (!entry) return null;
        return normalizeArticle(entry);
      } catch (error) {
        console.error(`[CMS:Prepr] Failed to fetch article "${slug}":`, error);
        return null;
      }
    },

    async getAllArticleSlugs() {
      try {
        const data = await preprFetch<any>(`
          query GetAllArticleSlugs {
            Articles(limit: 100) {
              items {
                slug
              }
            }
          }
        `);
        return (data?.Articles?.items || []).map((entry: any) => entry.slug);
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch article slugs:', error);
        return [];
      }
    },

    resolveImageUrl(path: string) {
      return path;
    },
  };
}
