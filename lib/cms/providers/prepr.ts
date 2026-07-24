import type { CmsProvider, CmsPageOptions, CmsArticleOptions } from '../core';
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
  CmsCardActions,
  CmsRichText,
  CmsMedia,
} from '../types';

// ── Cache tags ──
// Anonymous published reads attach these Next data-cache tags so a Prepr
// publish webhook (POST /api/cms-revalidate) can bust them surgically via
// revalidateTag — mirroring the catalog's tagFor() scheme in lib/server.ts.
// Preview / personalized / noStore reads are never tagged: they are already
// uncached (they vary per visitor or per draft), so there is nothing to bust.
export const TAG_CMS = 'cms';
export const cmsPageTag = (slug: string) => `cms:page:${slug}`;
export const cmsArticleTag = (slug: string) => `cms:article:${slug}`;

// ── Locale helper ──

/** Map a short language code (e.g. 'NL', 'EN') to a Prepr locale header value. */
function toPreprLocale(lang?: string): string | undefined {
  if (!lang) return undefined;
  const upper = lang.toUpperCase();
  // Map common codes — extend as needed
  const map: Record<string, string> = { NL: 'nl-NL', EN: 'en-US', DE: 'de-DE', FR: 'fr-FR' };
  return map[upper] || lang.toLowerCase();
}

function localeHeaders(locale?: string): Record<string, string> {
  const mapped = toPreprLocale(locale);
  return mapped ? { 'Prepr-Locale': mapped } : {};
}

/** The environment's default Prepr locale. Used as the fallback when a post has
 *  no translation in the requested locale (Prepr itself does not fall back). */
const DEFAULT_LOCALE = toPreprLocale(process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL');

/** True when the requested language resolves to the default locale (or none). */
function isDefaultLocale(locale?: string): boolean {
  const mapped = toPreprLocale(locale);
  return !mapped || mapped === DEFAULT_LOCALE;
}

/** Language codes the storefront maps to Prepr locales. Used only in preview
 *  mode to probe for a post across locales: Prepr opens an in-CMS preview at the
 *  post's own-locale slug but without a language prefix, so `locale` resolves to
 *  the default and a post that only exists under another locale (e.g. an en-US
 *  post with an English slug) is otherwise missed. */
const SUPPORTED_LANGUAGES = ['NL', 'EN', 'DE', 'FR'];

// ── GraphQL client ──

// Server-only Preview (concept/draft) Delivery token — used when Next.js draft
// mode is enabled so editors can preview unpublished content. Must come from the
// environment's own Preview-scoped token; there is no fallback, so preview fails
// loudly rather than silently reading another environment's content. This module
// is not included in the client bundle, so the token is not exposed.
const PREPR_PREVIEW_TOKEN = process.env.PREPR_PREVIEW_TOKEN;

async function preprFetch<T = any>(
  query: string,
  variables?: Record<string, any>,
  extraHeaders?: Record<string, string>,
  opts?: { noStore?: boolean; preview?: boolean; tags?: string[] }
): Promise<T> {
  const productionToken = process.env.PREPR_ACCESS_TOKEN || process.env.NEXT_PUBLIC_PREPR_ACCESS_TOKEN;
  const token = opts?.preview ? PREPR_PREVIEW_TOKEN : productionToken;
  if (!token) {
    throw new Error(
      opts?.preview
        ? 'PREPR_PREVIEW_TOKEN is not set — cannot fetch preview content.'
        : 'PREPR_ACCESS_TOKEN is not set — cannot fetch content.'
    );
  }
  const endpoint = `https://graphql.prepr.io/${token}`;
  const isDev = process.env.NODE_ENV === 'development';
  // Personalized and preview (draft) requests vary per request, never cache them.
  const noStore = opts?.noStore || opts?.preview || isDev;

  // Cache tags are meaningful only for cached (anonymous published) reads. When
  // noStore is set the response isn't cached, so tags would be inert — omit them.
  const nextOptions = noStore
    ? undefined
    : { revalidate: 60, tags: opts?.tags?.length ? opts.tags : undefined };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ query, variables }),
    cache: noStore ? 'no-store' : undefined,
    next: nextOptions,
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
  CardActions: 'card-actions',
  // Post body (ElementBox) block types — the article body is stored as many
  // small Text blocks plus Assets image blocks.
  Text: 'rich-text',
  Assets: 'media',
};

function normalizeButton(raw: any): { text: string; url: string; type: string } | null {
  if (!raw) return null;
  // Supports both the current Button schema (label/url/style/target) and the
  // legacy one (text/use_external_link/external_url/button_type/link).
  const text = raw.label ?? raw.text ?? '';
  let url = '';
  if (raw.url) url = raw.url;
  else if (raw.use_external_link) url = raw.external_url || '';
  if (!url) {
    const targetSlug = Array.isArray(raw.target) ? raw.target[0]?._slug : raw.link?._slug;
    if (targetSlug) url = `/${String(targetSlug).replace(/^\//, '')}`;
  }
  const type = String(raw.style ?? raw.button_type ?? 'primary').toLowerCase();
  return { text, url, type };
}

// Track feature index for alternating left/right layout
let featureIndex = 0;

function normalizeBlock(raw: any): CmsBlock | CmsBlock[] | null {
  const typename = raw.__typename;
  if (!TYPENAME_MAP[typename]) return null;

  switch (typename) {
    case 'Text': {
      // Prepr rich-text block; `html` holds the rendered headings/paragraphs.
      const html = raw.html || '';
      return html.trim() ? ({ _type: 'rich-text', body: html } as CmsRichText) : null;
    }
    case 'Assets': {
      // One media block per image so an image group keeps every image.
      const media = (raw.items || [])
        .map((img: any) => normalizeImage(img))
        .filter((f: CmsImage | null): f is CmsImage => !!f)
        .map((file: CmsImage) => ({ _type: 'media', file } as CmsMedia));
      return media.length ? media : null;
    }
    case 'Hero': {
      const buttons = (raw.buttons || []).map(normalizeButton).filter(Boolean);
      const primary = buttons[0];
      const secondary = buttons[1];
      return {
        _type: 'hero-banner',
        title: raw.heading || '',
        subtitle: raw.sub_heading || null,
        description: raw.description || null,
        image: normalizeImage(raw.image || raw.asset),
        ctaText: primary?.text || null,
        ctaUrl: primary?.url || null,
        secondaryCtaText: secondary?.text || null,
        secondaryCtaUrl: secondary?.url || null,
        variantKey: raw._context?.variant_key ?? null,
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
      // Support both schemas: cards[] (propeller env) or products[] (demo env)
      const cards = raw.cards || [];
      const products = raw.products || [];
      const firstCardType = cards[0]?.__typename;
      const title = raw.heading || raw.title || '';
      const subtitle = raw.sub_heading || null;

      // Products from _json (demo env) — contains Propeller product IDs
      if (products.length > 0 && products[0]?._json) {
        return {
          _type: 'product-cards',
          title,
          subtitle,
          products: products.map((p: any) => ({
            productId: p._json?.productId ? parseInt(String(p._json.productId), 10) : null,
            slug: '',
            name: '',
            image: null,
            price: p._json?.price ?? null,
            priceSuffix: null,
          })),
          buttonText: null,
          buttonUrl: null,
          variantKey: raw._context?.variant_key ?? null,
        } as CmsProductCards;
      }

      // Product cards from propeller env (rich Product type with fields)
      if (firstCardType === 'Product') {
        const btn = normalizeButton(raw.button);
        return {
          _type: 'product-cards',
          title,
          subtitle,
          products: cards.map((c: any) => ({
            productId: null,
            slug: c._slug || '',
            name: c.name || '',
            image: normalizeImage(c.image),
            price: c.price ?? null,
            priceSuffix: c.price_suffix || null,
          })),
          buttonText: btn?.text || null,
          buttonUrl: btn?.url || null,
          variantKey: raw._context?.variant_key ?? null,
        } as CmsProductCards;
      }

      if (firstCardType === 'Post') {
        return {
          _type: 'post-cards',
          title,
          subtitle,
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
        questions: (raw.questions || raw.faq_items || []).map((q: any) => ({
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
    case 'CardActions':
      return {
        _type: 'card-actions',
        title: raw.title || null,
        items: (raw.cardactionitems || []).map((item: any) => ({
          title: item.card_title || '',
          description: item.card_description || null,
          image: normalizeImage(item.image),
          icon: null,
          buttonText: null,
          buttonUrl: null,
        })),
      } as CmsCardActions;
    default:
      return null;
  }
}

function normalizeBlocks(raw: any[]): CmsBlock[] {
  if (!raw) return [];
  const flat = raw.flatMap((b) => {
    const r = normalizeBlock(b);
    if (!r) return [] as CmsBlock[];
    return Array.isArray(r) ? r : [r];
  });
  // Prepr stores a post body as many small Text blocks (one per heading or
  // paragraph). Merge adjacent rich-text blocks so the body renders as a single
  // prose section instead of dozens of separately-padded sections.
  const merged: CmsBlock[] = [];
  for (const block of flat) {
    const prev = merged[merged.length - 1];
    if (block._type === 'rich-text' && prev?._type === 'rich-text') {
      (prev as CmsRichText).body += (block as CmsRichText).body;
    } else {
      merged.push(block);
    }
  }
  return merged;
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

// A post's _slug should be a bare segment (e.g. "energy-efficient-ac"), but an
// editor can accidentally save it with a path prefix ("/blog/energy-…"). Strip a
// leading slash and an optional "blog/" so links never become "/blog//blog/…"
// and route params stay clean. getArticle also probes the "/blog/"-prefixed form
// so lookups still resolve for posts stored the malformed way.
function normalizeSlug(slug: unknown): string {
  return String(slug || '').replace(/^\/+/, '').replace(/^blog\//, '');
}

function normalizeArticle(raw: any): CmsArticle {
  const firstCategory = raw.categories?.[0];
  return {
    id: raw._id,
    title: raw.title || '',
    description: raw.excerpt || null,
    slug: normalizeSlug(raw._slug),
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

// Build the Button sub-selection from the fields that actually exist on the
// environment's Button type. Supports the current schema (label/url/style/
// target) and the legacy one (text/use_external_link/external_url/button_type/
// link), so a Button schema difference can never break the parent query.
function buildButtonFragment(schema: SchemaInfo): string {
  const parts: string[] = [];
  // Current Prepr schema
  if (hasField(schema, 'Button', 'label')) parts.push('label');
  if (hasField(schema, 'Button', 'url')) parts.push('url');
  if (hasField(schema, 'Button', 'style')) parts.push('style');
  if (hasField(schema, 'Button', 'open_in_new_window')) parts.push('open_in_new_window');
  if (hasField(schema, 'Button', 'target')) {
    parts.push('target { __typename ... on Page { _slug } ... on Post { _slug } }');
  }
  // Legacy schema
  if (hasField(schema, 'Button', 'text')) parts.push('text');
  if (hasField(schema, 'Button', 'use_external_link')) parts.push('use_external_link');
  if (hasField(schema, 'Button', 'external_url')) parts.push('external_url');
  if (hasField(schema, 'Button', 'button_type')) parts.push('button_type');
  if (hasField(schema, 'Button', 'link')) {
    parts.push('link { __typename ... on Page { _slug } ... on Post { _slug } }');
  }
  // Fallback to the current schema's basic fields if introspection was empty.
  return parts.length ? parts.join('\n') : 'label\nurl\nstyle';
}

// ── Dynamic schema introspection ──

interface SchemaInfo {
  types: Set<string>;
  queryFields: Set<string>;
  pageContentTypes: Set<string>;
  fields: Record<string, Set<string>>;
}

let _schema: SchemaInfo | null = null;

async function getSchema(): Promise<SchemaInfo> {
  if (_schema) return _schema;
  try {
    const data = await preprFetch<any>(`{
      __schema { types { name kind } }
      QueryType: __type(name: "Query") { fields { name } }
      PageContent: __type(name: "Page_Content") { possibleTypes { name } }
      HeroType: __type(name: "Hero") { fields { name } }
      CardsType: __type(name: "Cards") { fields { name } }
      CardActionsType: __type(name: "CardActions") { fields { name type { name kind ofType { name kind ofType { name kind ofType { name kind } } } } } }
      CardItemType: __type(name: "CardItem") { fields { name } }
      ButtonType: __type(name: "Button") { fields { name } }
      SEOType: __type(name: "SEO") { fields { name } }
      PostType: __type(name: "Post") { fields { name } }
      AuthorType: __type(name: "Author") { fields { name } }
    }`);

    const types = new Set<string>(
      (data?.__schema?.types || [])
        .filter((t: any) => t.kind === 'OBJECT' || t.kind === 'UNION' || t.kind === 'ENUM')
        .map((t: any) => t.name as string)
    );

    const queryFields = new Set<string>(
      (data?.QueryType?.fields || []).map((f: any) => f.name as string)
    );

    const pageContentTypes = new Set<string>(
      (data?.PageContent?.possibleTypes || []).map((t: any) => t.name as string)
    );

    const fields: Record<string, Set<string>> = {};
    const typeMap: [string, string][] = [['HeroType', 'Hero'], ['CardsType', 'Cards'], ['SEOType', 'SEO'], ['PostType', 'Post'], ['AuthorType', 'Author'], ['CardActionsType', 'CardActions'], ['CardItemType', 'CardItem'], ['ButtonType', 'Button']];
    for (const [key, prefix] of typeMap) {
      fields[prefix] = new Set<string>((data?.[key]?.fields || []).map((f: any) => f.name as string));
    }

    _schema = { types, queryFields, pageContentTypes, fields };
  } catch {
    _schema = { types: new Set(), queryFields: new Set(), pageContentTypes: new Set(), fields: {} };
  }
  return _schema;
}

function has(schema: SchemaInfo, typeName: string): boolean {
  return schema.types.has(typeName);
}

function hasField(schema: SchemaInfo, typeName: string, fieldName: string): boolean {
  return schema.fields[typeName]?.has(fieldName) ?? false;
}

function inPageContent(schema: SchemaInfo, typeName: string): boolean {
  // If Page_Content union doesn't exist (not introspectable), fall back to type existence
  return schema.pageContentTypes.size === 0 ? has(schema, typeName) : schema.pageContentTypes.has(typeName);
}

function buildSeoFragment(schema: SchemaInfo): string {
  const hasMetaImage = hasField(schema, 'SEO', 'meta_image');
  return `seo {
    meta_title
    meta_description
    ${hasMetaImage ? `meta_image { ${IMAGE_FIELDS} }` : ''}
  }`;
}

// Build the Post cover/author/categories selection. Field names differ per
// Prepr environment: the post image is `cover` in some, `image` in others; the
// author's name is `name` or `full_name` and the photo `avatar` or `image`. We
// alias whichever exists back to the keys the normalizer expects (cover / name /
// avatar), so a model difference can't silently drop the blog imagery.
function buildPostMetaFields(schema: SchemaInfo): string {
  const parts: string[] = [];

  const imageField = hasField(schema, 'Post', 'cover')
    ? 'cover'
    : hasField(schema, 'Post', 'image')
      ? 'image'
      : null;
  if (imageField) parts.push(`cover: ${imageField} { ${IMAGE_FIELDS} }`);

  if (hasField(schema, 'Post', 'author')) {
    const nameField = hasField(schema, 'Author', 'full_name')
      ? 'full_name'
      : hasField(schema, 'Author', 'name')
        ? 'name'
        : null;
    const avatarField = hasField(schema, 'Author', 'avatar')
      ? 'avatar'
      : hasField(schema, 'Author', 'image')
        ? 'image'
        : null;
    const authorParts: string[] = [];
    if (nameField) authorParts.push(`name: ${nameField}`);
    if (avatarField) authorParts.push(`avatar: ${avatarField} { ${IMAGE_FIELDS} }`);
    if (authorParts.length) parts.push(`author { ${authorParts.join(' ')} }`);
  }

  if (hasField(schema, 'Post', 'categories')) parts.push(`categories { name _slug }`);

  return parts.join('\n');
}

function buildBlockFragments(schema: SchemaInfo, forPage: boolean): string {
  const fragments: string[] = ['__typename'];
  // Cards has two shapes across environments: "rich" (a `cards` stack of
  // Product/Post) or "simple" (a `products` content-integration field). Detect
  // from the actual schema rather than guessing from another type's presence.
  const isRich = hasField(schema, 'Cards', 'cards');
  const buttonFragment = buildButtonFragment(schema);

  if (has(schema, 'Hero')) {
    fragments.push(`... on Hero {
      heading
      ${hasField(schema, 'Hero', 'sub_heading') ? 'sub_heading' : ''}
      ${hasField(schema, 'Hero', 'description') ? 'description' : ''}
      ${hasField(schema, 'Hero', 'image') ? `image { ${IMAGE_FIELDS} }` : ''}
      ${hasField(schema, 'Hero', 'asset') ? `asset { ${IMAGE_FIELDS} }` : ''}
      ${hasField(schema, 'Hero', 'buttons') ? `buttons { ${buttonFragment} }` : ''}
      ${hasField(schema, 'Hero', '_context') ? '_context { variant_key }' : ''}
    }`);
  }

  if (has(schema, 'Feature') && (forPage ? inPageContent(schema, 'Feature') : true)) {
    fragments.push(`... on Feature {
      heading sub_heading
      button { ${buttonFragment} }
      image { ${IMAGE_FIELDS} }
      image_position
    }`);
  }

  if (has(schema, 'CTA') && (forPage ? inPageContent(schema, 'CTA') : true)) {
    fragments.push(`... on CTA { heading sub_heading }`);
  }

  if (has(schema, 'Text') && (forPage ? inPageContent(schema, 'Text') : true)) {
    fragments.push(`... on Text { html body }`);
  }

  if (has(schema, 'Quote') && (forPage ? inPageContent(schema, 'Quote') : true)) {
    fragments.push(`... on Quote { body author }`);
  }

  if (has(schema, 'Assets') && (forPage ? inPageContent(schema, 'Assets') : true)) {
    fragments.push(`... on Assets { items { ${IMAGE_FIELDS} } }`);
  }

  // Page-only blocks
  if (forPage) {
    if (has(schema, 'Cards') && inPageContent(schema, 'Cards')) {
      if (isRich) {
        // Propeller env: heading, sub_heading, variant, cards[], button
        const cardsSubs: string[] = ['__typename'];
        if (has(schema, 'Product')) {
          cardsSubs.push(`... on Product { _slug name image { ${IMAGE_FIELDS} } price price_suffix }`);
        }
        if (has(schema, 'Post')) {
          cardsSubs.push(`... on Post { title _slug excerpt _read_time cover { ${IMAGE_FIELDS} } author { name } categories { _slug name } }`);
        }
        fragments.push(`... on Cards {
          heading sub_heading variant
          ${hasField(schema, 'Cards', '_context') ? '_context { variant_key }' : ''}
          button { ${buttonFragment} }
          cards { ${cardsSubs.join('\n')} }
        }`);
      } else {
        // Demo/simple env: title, products[] with _json containing Propeller IDs
        fragments.push(`... on Cards {
          title
          ${hasField(schema, 'Cards', '_context') ? '_context { variant_key }' : ''}
          products { _id _json }
        }`);
      }
    }

    if (has(schema, 'Contact') && inPageContent(schema, 'Contact')) {
      fragments.push(`... on Contact {
        heading sub_heading form_title phone_number email hubspot_form_id hubspot_portal_id
      }`);
    }

    if (has(schema, 'FAQ') && inPageContent(schema, 'FAQ')) {
      const faqField = has(schema, 'FAQItem') ? 'faq_items' : 'questions';
      fragments.push(`... on FAQ { title ${faqField} { question answer } }`);
    }

    if (has(schema, 'Static') && inPageContent(schema, 'Static')) {
      fragments.push(`... on Static { title static_type }`);
    }

    if (has(schema, 'CardActions') && inPageContent(schema, 'CardActions')) {
      fragments.push(`... on CardActions {
        title
        cardactionitems {
          _id
          card_title
          card_description
          image { ${IMAGE_FIELDS} }
        }
      }`);
    }
  }

  return fragments.join('\n');
}

// ── Provider factory ──

export function createPreprProvider(): CmsProvider {
  return {
    async getPage(slug: string, options?: CmsPageOptions) {
      try {
        const schema = await getSchema();
        const pageFragments = buildBlockFragments(schema, true);
        const seoFragment = buildSeoFragment(schema);
        // The home page slug varies per Prepr environment. Prefer the
        // personalized home page, then conventional home slugs, and finally
        // a generic home page (tried in this preference order below).
        const HOME_SLUG_PREFERENCE = ['home-personalized', '/', 'home', 'index', 'home-generic'];
        // Prepr's slug representation can include or omit a leading slash,
        // so query both forms to match regardless.
        const stripSlash = (s: string) => s.replace(/^\//, '');
        const lookupSlugs =
          slug === 'home'
            ? Array.from(
                new Set(
                  HOME_SLUG_PREFERENCE.flatMap((s) => (s === '/' ? ['/'] : [s, `/${s}`])),
                ),
              )
            : [slug];
        const segments = options?.segments?.filter(Boolean).sort();
        const headers: Record<string, string> = {
          ...localeHeaders(options?.locale),
          ...(options?.extraHeaders || {}),
        };
        if (segments?.length) {
          headers['Prepr-Segments'] = segments.join(',');
        }
        // Tag anonymous published reads so a publish webhook can bust them.
        // Personalized (segments/extraHeaders), noStore and preview reads are
        // uncached, so tagging them would be inert — leave tags off there.
        const isPersonalized = !!segments?.length || !!options?.extraHeaders;
        const tags =
          options?.preview || options?.noStore || isPersonalized
            ? undefined
            : [TAG_CMS, cmsPageTag(slug)];
        const data = await preprFetch<any>(`{
          Pages(where: { _slug_any: [${lookupSlugs.map(s => `"${s}"`).join(', ')}] }, limit: ${lookupSlugs.length}) {
            items {
              _id
              _slug
              title
              ${seoFragment}
              content {
                ${pageFragments}
              }
            }
          }
        }`, undefined, headers, { noStore: options?.noStore, preview: options?.preview, tags });
        const items: any[] = data?.Pages?.items || [];
        // Pick by preference order (comparing slugs without a leading slash)
        // so the personalized home wins over the generic one.
        const entry =
          slug === 'home'
            ? HOME_SLUG_PREFERENCE.map((pref) =>
                items.find((it: any) => stripSlash(it._slug || '') === stripSlash(pref)),
              ).find(Boolean) || items[0]
            : items[0];
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

    async getGlobal(locale?: string) {
      try {
        const schema = await getSchema();

        // Not all Prepr environments have a Navigation query
        if (!schema.queryFields.has('Navigation')) {
          return normalizeGlobal({ navLinks: [], siteName: '' });
        }

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
        }`, undefined, localeHeaders(locale), { tags: [TAG_CMS] });
        const nav = data?.Navigation;
        const navLinks: CmsNavLink[] = (nav?.top_navigation || []).map((item: any) => {
          const url = item.link?._slug ? `/${item.link._slug}` : (item.external_url || '');
          return { label: item.text || '', url, highlight: false };
        });
        return normalizeGlobal({ navLinks, siteName: nav?.internal_name || '' });
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch global:', error);
        return null;
      }
    },

    async getCategoryBanner(categoryId: string, locale?: string) {
      // CategoryBanner model does not exist in this Prepr environment yet
      return null;
    },

    async getArticles(locale?: string, options?: CmsArticleOptions) {
      const fetchList = async (loc?: string): Promise<CmsArticle[]> => {
        const schema = await getSchema();
        const data = await preprFetch<any>(`{
          Posts(sort: publish_on_DESC, limit: 100) {
            items {
              _id
              _slug
              title
              excerpt
              _publish_on
              ${buildPostMetaFields(schema)}
            }
          }
        }`, undefined, localeHeaders(loc), {
          preview: options?.preview,
          tags: options?.preview ? undefined : [TAG_CMS],
        });
        return (data?.Posts?.items || []).map((entry: any) => normalizeArticle(entry));
      };
      try {
        const primary = await fetchList(locale);
        // Prepr returns only posts translated into the requested locale, so for a
        // non-default locale we merge with the default-locale list: keep the
        // localized post where it exists (by id), fall back to the default-locale
        // version for the rest — so every post still shows, translated where it can.
        if (isDefaultLocale(locale)) return primary;
        const fallback = await fetchList(undefined);
        const byId = new Map(primary.map((a) => [a.id, a]));
        return fallback.map((a) => byId.get(a.id) || a);
      } catch (error) {
        console.error('[CMS:Prepr] Failed to fetch articles:', error);
        return [];
      }
    },

    async getArticle(slug: string, locale?: string, options?: CmsArticleOptions) {
      // Match both the bare slug and the "/blog/"-prefixed form, so a post whose
      // _slug was saved with a stray prefix still resolves from a clean URL.
      const bareSlug = normalizeSlug(slug);
      const slugCandidates = JSON.stringify([bareSlug, `/blog/${bareSlug}`]);
      const fetchBySlug = async (loc?: string) => {
        const schema = await getSchema();
        const postFragments = buildBlockFragments(schema, false);
        const isPersonalized = !!options?.extraHeaders;
        const data = await preprFetch<any>(`{
          Posts(where: { _slug_any: ${slugCandidates} }, limit: 1) {
            items {
              _id
              _slug
              title
              excerpt
              _publish_on
              ${buildPostMetaFields(schema)}
              content {
                ${postFragments}
              }
            }
          }
        }`, undefined, { ...localeHeaders(loc), ...(options?.extraHeaders || {}) }, {
          preview: options?.preview,
          tags: options?.preview || isPersonalized ? undefined : [TAG_CMS, cmsArticleTag(bareSlug)],
        });
        const entry = data?.Posts?.items?.[0];
        return entry ? normalizeArticle(entry) : null;
      };
      try {
        const primary = await fetchBySlug(locale);
        if (primary) return primary;
        // Not found in the requested locale (e.g. an NL-only post opened from the
        // EN shop) — fall back to the default locale.
        const fallback = isDefaultLocale(locale) ? null : await fetchBySlug(undefined);
        if (fallback) return fallback;
        // Preview only: Prepr's in-CMS preview opens a post at its own-locale slug
        // but without a language prefix, so `locale` resolved to the default and
        // the lookups above miss a post that only exists under another locale
        // (e.g. an en-US post with an English slug → the NL route 404s). Probe the
        // remaining locales so the editor's preview still renders.
        if (options?.preview) {
          const tried = new Set([toPreprLocale(locale), DEFAULT_LOCALE]);
          for (const lang of SUPPORTED_LANGUAGES) {
            if (tried.has(toPreprLocale(lang))) continue;
            const hit = await fetchBySlug(lang);
            if (hit) return hit;
          }
        }
        return null;
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
