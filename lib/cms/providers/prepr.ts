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
  CmsFeature,
  CmsFaq,
  CmsProductCards,
  CmsPostCards,
  CmsStatic,
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

  if (json.errors?.length) {
    console.error(`[CMS:Prepr] GraphQL errors:`, json.errors.map((e: any) => e.message).join(', '));
    if (!json.data) return {} as T;
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
    metaTitle: raw.meta_title || '',
    metaDescription: raw.meta_description || '',
    shareImage: normalizeImage(raw.meta_image),
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
  Hero: 'hero-banner',
  Feature: 'feature',
  Cards: 'cards',
  CTA: 'call-to-action',
  Contact: 'contact-form',
  FAQ: 'faq',
  Static: 'static',
};

function normalizeButton(raw: any): { text: string; url: string; type: string } | null {
  if (!raw) return null;
  const url = raw.use_external_link ? (raw.external_url || '') : (raw.link?._slug || '');
  return { text: raw.text || '', url, type: raw.button_type || 'primary' };
}

// Track feature index for alternating left/right layout
let featureIndex = 0;

function normalizeBlock(raw: any): CmsBlock | null {
  const typename = raw.__typename;
  if (!TYPENAME_MAP[typename]) return null;

  switch (typename) {
    case 'Hero': {
      const buttons = (raw.buttons || []).map(normalizeButton).filter(Boolean);
      const primary = buttons[0];
      const secondary = buttons[1];
      return {
        _type: 'hero-banner',
        title: raw.heading || '',
        subtitle: raw.sub_heading || null,
        image: normalizeImage(raw.image),
        ctaText: primary?.text || null,
        ctaUrl: primary?.url || null,
        secondaryCtaText: secondary?.text || null,
        secondaryCtaUrl: secondary?.url || null,
      };
    }
    case 'Feature': {
      const btn = normalizeButton(raw.button);
      const position = raw.image_position === 'Right' ? 'right' : raw.image_position === 'Left' ? 'left' : (featureIndex % 2 === 0 ? 'left' : 'right');
      featureIndex++;
      return {
        _type: 'feature',
        title: raw.heading || '',
        description: raw.sub_heading || null,
        image: normalizeImage(raw.image),
        imagePosition: position,
        buttonText: btn?.text || null,
        buttonUrl: btn?.url || null,
      } as CmsFeature;
    }
    case 'Cards': {
      const cards = raw.cards || [];
      const firstType = cards[0]?.__typename;

      if (firstType === 'Product') {
        const btn = normalizeButton(raw.button);
        return {
          _type: 'product-cards',
          title: raw.heading || '',
          subtitle: raw.sub_heading || null,
          products: cards.map((c: any) => ({
            slug: c._slug || '',
            name: c.name || '',
            image: normalizeImage(c.image),
            price: c.price ?? null,
            priceSuffix: c.price_suffix || null,
          })),
          buttonText: btn?.text || null,
          buttonUrl: btn?.url || null,
        } as CmsProductCards;
      }

      if (firstType === 'Post') {
        return {
          _type: 'post-cards',
          title: raw.heading || '',
          subtitle: raw.sub_heading || null,
          posts: cards.map((post: any) => ({
            title: post.title || '',
            slug: post._slug || '',
            cover: normalizeImage(post.cover),
            excerpt: post.excerpt || null,
            readTime: post._read_time || null,
            author: post.author ? { name: post.author.name || '', avatar: null } : null,
            category: post.categories?.[0]?.name || null,
          })),
        } as CmsPostCards;
      }

      // Fallback: generic value-props
      return {
        _type: 'value-props',
        items: cards.map((card: any) => ({
          icon: card.image?.url || '',
          title: card.heading || '',
          text: card.sub_heading || '',
        })),
      };
    }
    case 'CTA':
      return {
        _type: 'call-to-action',
        title: raw.heading || '',
        description: raw.sub_heading || null,
        buttonText: '',
        buttonUrl: '',
        variant: 'primary',
      };
    case 'Contact':
      return {
        _type: 'contact-form',
        title: raw.heading || null,
        description: raw.sub_heading || null,
        successMessage: 'Thank you for your message. We will get back to you soon.',
        phone: raw.phone_number || null,
        email: raw.email || null,
        formTitle: raw.form_title || null,
      };
    case 'FAQ':
      return {
        _type: 'faq',
        title: raw.title || '',
        questions: (raw.questions || []).map((q: any) => ({
          question: q.question || '',
          answer: q.answer || '',
        })),
      } as CmsFaq;
    case 'Static':
      return {
        _type: 'static',
        staticType: raw.static_type || '',
        title: raw.title || null,
      } as CmsStatic;
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
    slug: raw._slug || '',
    description: null,
    template: 'default',
    seo: normalizeSeo(raw.seo),
    blocks: normalizeBlocks(raw.content || []),
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
  const firstCategory = raw.categories?.[0];
  return {
    id: raw._id,
    title: raw.title || '',
    description: raw.excerpt || null,
    slug: raw._slug || '',
    cover: normalizeImage(raw.cover),
    author: normalizeAuthor(raw.author),
    category: firstCategory ? { name: firstCategory.name || '', slug: firstCategory._slug || '' } : null,
    blocks: normalizeBlocks(raw.content || []),
    publishedAt: raw._publish_on || null,
  };
}

// ── GraphQL fragments ──

const IMAGE_FIELDS = `url width height`;

const SEO_FRAGMENT = `
  seo {
    meta_title
    meta_description
    meta_image { ${IMAGE_FIELDS} }
  }
`;

const BUTTON_FRAGMENT = `
  text
  use_external_link
  external_url
  button_type
  link {
    ... on Page { _slug }
    ... on Post { _slug }
  }
`;

const BLOCK_FRAGMENTS = `
  __typename
  ... on Hero {
    heading
    sub_heading
    image { ${IMAGE_FIELDS} }
    buttons { ${BUTTON_FRAGMENT} }
  }
  ... on Feature {
    heading
    sub_heading
    button { ${BUTTON_FRAGMENT} }
    image { ${IMAGE_FIELDS} }
    image_position
  }
  ... on Cards {
    heading
    sub_heading
    variant
    button { ${BUTTON_FRAGMENT} }
    cards {
      __typename
      ... on Product {
        _slug
        name
        image { ${IMAGE_FIELDS} }
        price
        price_suffix
      }
      ... on Post {
        title
        _slug
        excerpt
        _read_time
        cover { ${IMAGE_FIELDS} }
        author {
          name
        }
        categories {
          _slug
          name
        }
      }
    }
  }
  ... on CTA {
    heading
    sub_heading
  }
  ... on Contact {
    heading
    sub_heading
    form_title
    phone_number
    email
    hubspot_form_id
    hubspot_portal_id
  }
  ... on FAQ {
    title
    questions {
      question
      answer
    }
  }
  ... on Static {
    title
    static_type
  }
`;

// ── Provider factory ──

export function createPreprProvider(): CmsProvider {
  return {
    async getPage(slug: string) {
      try {
        const lookupSlug = slug === 'home' ? '/' : slug;
        const data = await preprFetch<any>(`{
          Pages(where: { _slug_any: ["${lookupSlug}"] }, limit: 1) {
            items {
              _id
              _slug
              title
              ${SEO_FRAGMENT}
              content {
                ${BLOCK_FRAGMENTS}
              }
            }
          }
        }`);
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
        const data = await preprFetch<any>(`{
          Pages(limit: 100) {
            items { _slug }
          }
        }`);
        return (data?.Pages?.items || []).map((entry: any) => entry._slug);
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch page slugs:', error);
        return [];
      }
    },

    async getGlobal() {
      try {
        const data = await preprFetch<any>(`{
          Navigation {
            _id
            internal_name
            top_navigation {
              text
              use_external_link
              external_url
              button_type
              link {
                ... on Page { _slug }
                ... on Post { _slug }
              }
            }
          }
        }`);
        const nav = data?.Navigation;
        const navLinks: CmsNavLink[] = (nav?.top_navigation || []).map((item: any) => {
          const url = item.use_external_link ? (item.external_url || '') : (item.link?._slug ? `/${item.link._slug}` : '');
          return { label: item.text || '', url, highlight: false };
        });
        return normalizeGlobal({ navLinks, siteName: nav?.internal_name || '' });
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch global:', error);
        return null;
      }
    },

    async getCategoryBanner(categoryId: string) {
      // CategoryBanner model does not exist in this Prepr environment yet
      return null;
    },

    async getArticles() {
      try {
        const data = await preprFetch<any>(`{
          Posts(sort: _publish_on_DESC, limit: 100) {
            items {
              _id
              _slug
              title
              excerpt
              _publish_on
              cover { ${IMAGE_FIELDS} }
              author {
                name
              }
              categories {
                name
                _slug
              }
            }
          }
        }`);
        return (data?.Posts?.items || []).map((entry: any) => normalizeArticle(entry));
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch articles:', error);
        return [];
      }
    },

    async getArticle(slug: string) {
      try {
        const data = await preprFetch<any>(`{
          Posts(where: { _slug_any: ["${slug}"] }, limit: 1) {
            items {
              _id
              _slug
              title
              excerpt
              _publish_on
              cover { ${IMAGE_FIELDS} }
              author {
                name
              }
              categories {
                name
                _slug
              }
              content {
                ${BLOCK_FRAGMENTS}
              }
            }
          }
        }`);
        const entry = data?.Posts?.items?.[0];
        if (!entry) return null;
        return normalizeArticle(entry);
      } catch (error) {
        console.error(`[CMS:Prepr] Failed to fetch article "${slug}":`, error);
        return null;
      }
    },

    async getAllArticleSlugs() {
      try {
        const data = await preprFetch<any>(`{
          Posts(limit: 100) {
            items { _slug }
          }
        }`);
        return (data?.Posts?.items || []).map((entry: any) => entry._slug);
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
