import { documentToHtmlString } from '@contentful/rich-text-html-renderer';
import type { CmsProvider, CmsPageOptions } from '../core';
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
  CmsFaq,
} from '../types';

// ──────────────────────────────────────────────────────────────────────────
// Contentful CMS provider — hosted GraphQL.
//
// Contentful is SaaS-only (no self-hosted option): we point the app at a cloud
// Space and read published content through the Content Delivery API (CDA), or
// drafts through the Content Preview API (CPA). Transport is plain `fetch`
// against the GraphQL endpoint — no `contentful` JS SDK needed — mirroring the
// Prepr provider so the cache/fallback semantics match across providers.
//
// Conventions baked into the queries below:
//   • Each content type `X` is queryable as `xCollection(where, limit, …)`.
//   • Multi-reference fields expose a `…Collection { items { … } }` selection.
//   • Assets are an `Asset` type — `url` is already an absolute https URL.
//   • Rich Text fields return a JSON AST under `{ json }`, converted to an HTML
//     string here so `CmsRichText.body` stays an HTML string like every other
//     provider.
//   • CONTENTFUL_PREVIEW=true reads drafts via the CPA token; the `preview`
//     flag is threaded into every collection query so unpublished entries show.
// ──────────────────────────────────────────────────────────────────────────

// ── GraphQL transport ──

function isPreview(): boolean {
  return (process.env.CONTENTFUL_PREVIEW || '').trim() === 'true';
}

function contentfulEndpoint(): string {
  const spaceId = process.env.CONTENTFUL_SPACE_ID || '';
  const environment = process.env.CONTENTFUL_ENVIRONMENT || 'master';
  return `https://graphql.contentful.com/content/v1/spaces/${spaceId}/environments/${environment}`;
}

async function contentfulFetch<T = any>(
  query: string,
  variables?: Record<string, any>,
): Promise<T> {
  const preview = isPreview();
  const token = preview
    ? process.env.CONTENTFUL_CPA_TOKEN || process.env.CONTENTFUL_CDA_TOKEN || ''
    : process.env.CONTENTFUL_CDA_TOKEN || '';

  const isDev = process.env.NODE_ENV === 'development';

  const res = await fetch(contentfulEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables: { preview, ...variables } }),
    cache: isDev ? 'no-store' : undefined,
    next: isDev ? undefined : { revalidate: 60 },
  } as RequestInit);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Contentful ${res.status} ${res.statusText} — ${body}`);
  }

  const json = await res.json();

  if (json.errors?.length) {
    console.error(`[CMS:Contentful] GraphQL errors:`, json.errors.map((e: any) => e.message).join(', '));
    if (!json.data) return {} as T;
  }

  return json.data as T;
}

// ── Helpers ──

/** Unwrap a Contentful `…Collection { items }` shape into a plain array. */
function items(collection: any): any[] {
  return collection?.items || [];
}

/** Parse a value that may be a JSON string or an already-parsed array/object. */
function parseJson<T = any>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value as T;
}

// ── Normalizers ──

function normalizeImage(raw: any): CmsImage | null {
  if (!raw) return null;
  // Contentful asset URLs are protocol-relative on legacy responses; the
  // GraphQL Asset.url is normally absolute https — guard both cases.
  let url = raw.url || '';
  if (url.startsWith('//')) url = `https:${url}`;
  return {
    url,
    alternativeText: raw.description || raw.title || null,
    width: raw.width || 0,
    height: raw.height || 0,
  };
}

function normalizeSeo(raw: any): CmsSeo | null {
  if (!raw) return null;
  return {
    metaTitle: raw.metaTitle || '',
    metaDescription: raw.metaDescription || '',
    shareImage: normalizeImage(raw.shareImage),
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
    links: items(raw.linksCollection).map(normalizeNavLink),
  };
}

function normalizeValuePropItem(raw: any): CmsValuePropItem {
  return {
    icon: raw.icon || '',
    title: raw.title || '',
    text: raw.text || '',
  };
}

function richTextToHtml(body: any): string {
  // Contentful Rich Text fields come back as `{ json: <document AST> }`.
  const doc = body?.json ?? body;
  if (!doc) return '';
  try {
    return documentToHtmlString(doc);
  } catch {
    return '';
  }
}

const TYPENAME_MAP: Record<string, string> = {
  BlockHeroBanner: 'hero-banner',
  BlockRichText: 'rich-text',
  BlockMedia: 'media',
  BlockQuote: 'quote',
  BlockValueProps: 'value-props',
  BlockCallToAction: 'call-to-action',
  BlockProductCarousel: 'product-carousel',
  BlockContactForm: 'contact-form',
  BlockProductSlider: 'product-slider',
  BlockFaq: 'faq',
};

function normalizeBlock(raw: any): CmsBlock | null {
  const type = TYPENAME_MAP[raw?.__typename];
  if (!type) return null;

  switch (type) {
    case 'hero-banner':
      return {
        _type: 'hero-banner',
        title: raw.title || '',
        subtitle: raw.subtitle || null,
        description: raw.description || null,
        image: normalizeImage(raw.image),
        ctaText: raw.ctaText || null,
        ctaUrl: raw.ctaUrl || null,
        secondaryCtaText: raw.secondaryCtaText || null,
        secondaryCtaUrl: raw.secondaryCtaUrl || null,
      };
    case 'rich-text':
      return { _type: 'rich-text', body: richTextToHtml(raw.richTextBody) };
    case 'media':
      return { _type: 'media', file: normalizeImage(raw.file) };
    case 'quote':
      return { _type: 'quote', title: raw.title || null, body: raw.quoteBody || '' };
    case 'value-props':
      return {
        _type: 'value-props',
        items: parseJson<any[]>(raw.items, []).map(normalizeValuePropItem),
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
        phone: raw.phone || null,
        email: raw.email || null,
        formTitle: raw.formTitle || null,
      };
    case 'product-slider': {
      const parsed = parseJson<any[]>(raw.items, []);
      return {
        _type: 'product-slider',
        title: raw.title || '',
        productIds: parsed.filter((p: any) => !p.isCluster).map((p: any) => p.id),
        clusterIds: parsed.filter((p: any) => p.isCluster).map((p: any) => p.id),
      };
    }
    case 'faq':
      return {
        _type: 'faq',
        title: raw.title || '',
        questions: parseJson<any[]>(raw.questions, []).map((q: any) => ({
          question: q.question || '',
          answer: q.answer || '',
        })),
      } as CmsFaq;
    default:
      return null;
  }
}

function normalizeBlocks(collection: any): CmsBlock[] {
  return items(collection).map(normalizeBlock).filter(Boolean) as CmsBlock[];
}

// The `page` type also keeps a single Rich Text `body` field (the original
// simple model) alongside the structured `blocks`. We render the `body` as a
// rich-text block in ADDITION to the structured blocks so both show — the body
// is appended after any structured blocks. A page can therefore have a hero
// banner block AND its long-form body.
function normalizePage(raw: any): CmsPage {
  const blocks = normalizeBlocks(raw.blocksCollection);
  const bodyHtml = richTextToHtml(raw.body);
  if (bodyHtml) blocks.push({ _type: 'rich-text', body: bodyHtml });
  return {
    id: raw.sys?.id ?? 0,
    title: raw.title || '',
    slug: raw.slug || (raw.isHomepage ? 'home' : ''),
    description: raw.description || null,
    template: raw.template || 'default',
    seo: normalizeSeo(raw.seo),
    blocks,
  };
}

function normalizeGlobal(raw: any): CmsGlobal {
  const langString = raw.availableLanguages || 'EN,NL';
  return {
    siteName: raw.siteName || '',
    siteDescription: raw.siteDescription || '',
    favicon: normalizeImage(raw.favicon),
    defaultSeo: normalizeSeo(raw.defaultSeo),
    logo: normalizeImage(raw.logo),
    logoAlt: raw.logoAlt || null,
    topBarEnabled: raw.topBarEnabled ?? true,
    topBarPhone: raw.topBarPhone || null,
    topBarAnnouncement: raw.topBarAnnouncement || null,
    topBarAnnouncementEnabled: raw.topBarAnnouncementEnabled ?? false,
    showVatToggle: raw.showVatToggle ?? true,
    showLanguageSwitcher: raw.showLanguageSwitcher ?? true,
    availableLanguages: String(langString).split(',').map((l: string) => l.trim()).filter(Boolean),
    showSearch: raw.showSearch ?? true,
    showAccount: raw.showAccount ?? true,
    showCart: raw.showCart ?? true,
    showCategoriesMenu: raw.showCategoriesMenu ?? true,
    categoriesMenuLabel: raw.categoriesMenuLabel || null,
    navLinks: items(raw.navLinksCollection).map(normalizeNavLink),
    footerDescription: raw.footerDescription || null,
    footerColumns: items(raw.footerColumnsCollection).map(normalizeFooterColumn),
    footerEmail: raw.footerEmail || null,
    footerPhone: raw.footerPhone || null,
    copyrightText: raw.copyrightText || null,
  };
}

function normalizeCategoryBanner(raw: any): CmsCategoryBanner {
  return {
    categoryId: raw.categoryId || '',
    title: raw.title || null,
    subtitle: raw.subtitle || null,
    image: normalizeImage(raw.image),
    ctaText: raw.ctaText || null,
    ctaUrl: raw.ctaUrl || null,
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
    id: raw.sys?.id ?? 0,
    title: raw.title || '',
    description: raw.description || null,
    slug: raw.slug || '',
    cover: normalizeImage(raw.cover),
    author: normalizeAuthor(raw.author),
    category: raw.category ? { name: raw.category.name || '', slug: raw.category.slug || '' } : null,
    blocks: normalizeBlocks(raw.blocksCollection),
    publishedAt: raw.publishedAt || raw.sys?.publishedAt || null,
  };
}

// ── GraphQL fragments ──

const IMAGE_FIELDS = `url title description width height`;

const SEO_FRAGMENT = `
  metaTitle
  metaDescription
  shareImage { ${IMAGE_FIELDS} }
`;

const BLOCKS_FRAGMENT = `
  __typename
  ... on BlockHeroBanner {
    title subtitle image { ${IMAGE_FIELDS} }
    ctaText ctaUrl secondaryCtaText secondaryCtaUrl
  }
  ... on BlockRichText { richTextBody: body { json } }
  ... on BlockMedia { file { ${IMAGE_FIELDS} } }
  ... on BlockQuote { title quoteBody: body }
  ... on BlockValueProps { items }
  ... on BlockCallToAction { title description buttonText buttonUrl variant }
  ... on BlockProductCarousel { title categoryId limit }
  ... on BlockContactForm { title description successMessage phone email formTitle }
  ... on BlockProductSlider { title items }
  ... on BlockFaq { title questions }
`;

const ARTICLE_FIELDS = `
  sys { id }
  title
  slug
  description
  cover { ${IMAGE_FIELDS} }
  author { name avatar { ${IMAGE_FIELDS} } email }
  category { name slug }
  publishedAt
`;

// ── Provider factory ──

export function createContentfulProvider(): CmsProvider {
  return {
    // Note: Contentful has no native equivalent to Prepr's segment-based
    // personalization, so `options.segments` is accepted but ignored here.
    async getPage(slug: string, _options?: CmsPageOptions) {
      try {
        // The homepage is the page flagged `isHomepage`; all others match on
        // their `slug` field. Contentful rejects queries that declare an unused
        // variable, so `$slug` is only declared for the non-home branch.
        const isHome = slug === 'home';
        const varDecl = isHome ? '$preview: Boolean' : '$slug: String!, $preview: Boolean';
        const where = isHome ? '{ isHomepage: true }' : '{ slug: $slug }';
        const data = await contentfulFetch<any>(
          `query Page(${varDecl}) {
            pageCollection(where: ${where}, limit: 1, preview: $preview) {
              items {
                sys { id }
                title slug description template isHomepage
                body { json }
                seo { ${SEO_FRAGMENT} }
                blocksCollection(limit: 20) { items { ${BLOCKS_FRAGMENT} } }
              }
            }
          }`,
          isHome ? undefined : { slug },
        );
        const entry = items(data?.pageCollection)[0];
        if (!entry) return null;
        return normalizePage(entry);
      } catch (error) {
        console.error(`[CMS:Contentful] Failed to fetch page "${slug}":`, error);
        return null;
      }
    },

    async getAllPageSlugs() {
      try {
        const data = await contentfulFetch<any>(`query Slugs($preview: Boolean) {
          pageCollection(limit: 100, preview: $preview) { items { slug } }
        }`);
        return items(data?.pageCollection)
          .map((entry: any) => entry.slug)
          .filter(Boolean);
      } catch (error) {
        console.error('[CMS:Contentful] Failed to fetch page slugs:', error);
        return [];
      }
    },

    async getGlobal() {
      try {
        const data = await contentfulFetch<any>(`query Global($preview: Boolean) {
          globalCollection(limit: 1, preview: $preview) {
            items {
              siteName siteDescription availableLanguages logoAlt
              favicon { ${IMAGE_FIELDS} }
              logo { ${IMAGE_FIELDS} }
              defaultSeo { ${SEO_FRAGMENT} }
              topBarEnabled topBarPhone topBarAnnouncement topBarAnnouncementEnabled
              showVatToggle showLanguageSwitcher
              showSearch showAccount showCart showCategoriesMenu categoriesMenuLabel
              footerDescription footerEmail footerPhone copyrightText
              footerColumnsCollection(limit: 10) {
                items {
                  title
                  linksCollection(limit: 20) { items { label url highlight } }
                }
              }
              navLinksCollection(limit: 20) { items { label url highlight } }
            }
          }
        }`);
        const entry = items(data?.globalCollection)[0];
        if (!entry) return null;
        return normalizeGlobal(entry);
      } catch (error) {
        console.error('[CMS:Contentful] Failed to fetch global:', error);
        return null;
      }
    },

    async getCategoryBanner(categoryId: string) {
      try {
        const data = await contentfulFetch<any>(
          `query Banner($categoryId: String!, $preview: Boolean) {
            categoryBannerCollection(where: { categoryId: $categoryId }, limit: 1, preview: $preview) {
              items {
                categoryId title subtitle
                image { ${IMAGE_FIELDS} }
                ctaText ctaUrl
              }
            }
          }`,
          { categoryId },
        );
        const entry = items(data?.categoryBannerCollection)[0];
        if (!entry) return null;
        return normalizeCategoryBanner(entry);
      } catch {
        // Banner is optional — never let it break the category page.
        return null;
      }
    },

    async getArticles() {
      try {
        const data = await contentfulFetch<any>(`query Articles($preview: Boolean) {
          articleCollection(order: publishedAt_DESC, limit: 100, preview: $preview) {
            items { ${ARTICLE_FIELDS} }
          }
        }`);
        return items(data?.articleCollection).map((entry: any) => normalizeArticle(entry));
      } catch (error) {
        console.error('[CMS:Contentful] Failed to fetch articles:', error);
        return [];
      }
    },

    async getArticle(slug: string) {
      try {
        const data = await contentfulFetch<any>(
          `query Article($slug: String!, $preview: Boolean) {
            articleCollection(where: { slug: $slug }, limit: 1, preview: $preview) {
              items {
                ${ARTICLE_FIELDS}
                blocksCollection(limit: 20) { items { ${BLOCKS_FRAGMENT} } }
              }
            }
          }`,
          { slug },
        );
        const entry = items(data?.articleCollection)[0];
        if (!entry) return null;
        return normalizeArticle(entry);
      } catch (error) {
        console.error(`[CMS:Contentful] Failed to fetch article "${slug}":`, error);
        return null;
      }
    },

    async getAllArticleSlugs() {
      try {
        const data = await contentfulFetch<any>(`query ArticleSlugs($preview: Boolean) {
          articleCollection(limit: 100, preview: $preview) { items { slug } }
        }`);
        return items(data?.articleCollection)
          .map((entry: any) => entry.slug)
          .filter(Boolean);
      } catch (error) {
        console.error('[CMS:Contentful] Failed to fetch article slugs:', error);
        return [];
      }
    },

    resolveImageUrl(path: string) {
      if (!path) return path;
      if (path.startsWith('//')) return `https:${path}`;
      return path;
    },
  };
}
