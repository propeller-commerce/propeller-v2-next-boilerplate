// ──────────────────────────────────────
// CMS Types — normalized from Strapi
// ──────────────────────────────────────

export interface CmsImage {
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
}

export interface CmsSeo {
  metaTitle: string;
  metaDescription: string;
  shareImage: CmsImage | null;
}

// ── Block types ──

export interface CmsHeroBanner {
  _type: 'hero-banner';
  title: string;
  subtitle: string | null;
  image: CmsImage | null;
  ctaText: string | null;
  ctaUrl: string | null;
  secondaryCtaText: string | null;
  secondaryCtaUrl: string | null;
}

export interface CmsRichText {
  _type: 'rich-text';
  body: string;
}

export interface CmsMedia {
  _type: 'media';
  file: CmsImage | null;
}

export interface CmsQuote {
  _type: 'quote';
  title: string | null;
  body: string;
}

export interface CmsValuePropItem {
  icon: string;
  title: string;
  text: string;
}

export interface CmsValueProps {
  _type: 'value-props';
  items: CmsValuePropItem[];
}

export interface CmsCallToAction {
  _type: 'call-to-action';
  title: string;
  description: string | null;
  buttonText: string;
  buttonUrl: string;
  variant: 'primary' | 'secondary';
}

export interface CmsProductCarousel {
  _type: 'product-carousel';
  title: string;
  categoryId: string;
  limit: number;
}

export interface CmsContactForm {
  _type: 'contact-form';
  title: string | null;
  description: string | null;
  successMessage: string;
  phone: string | null;
  email: string | null;
  formTitle: string | null;
}

export interface CmsSlider {
  _type: 'slider';
  files: CmsImage[];
}

export interface CmsProductSlider {
  _type: 'product-slider';
  title: string;
  productIds: number[];
  clusterIds: number[];
}

export interface CmsFeature {
  _type: 'feature';
  title: string;
  description: string | null;
  image: CmsImage | null;
  imagePosition: 'left' | 'right';
  buttonText: string | null;
  buttonUrl: string | null;
}

export interface CmsFaq {
  _type: 'faq';
  title: string;
  questions: { question: string; answer: string }[];
}

export interface CmsProductCard {
  slug: string;
  name: string;
  image: CmsImage | null;
  price: number | null;
  priceSuffix: string | null;
}

export interface CmsProductCards {
  _type: 'product-cards';
  title: string;
  subtitle: string | null;
  products: CmsProductCard[];
  buttonText: string | null;
  buttonUrl: string | null;
}

export interface CmsPostCards {
  _type: 'post-cards';
  title: string;
  subtitle: string | null;
  posts: {
    title: string;
    slug: string;
    cover: CmsImage | null;
    excerpt: string | null;
    readTime: number | null;
    author: { name: string; avatar: CmsImage | null } | null;
    category: string | null;
  }[];
}

export interface CmsStatic {
  _type: 'static';
  staticType: string;
  title: string | null;
}

export type CmsBlock =
  | CmsHeroBanner
  | CmsRichText
  | CmsMedia
  | CmsQuote
  | CmsValueProps
  | CmsCallToAction
  | CmsProductCarousel
  | CmsContactForm
  | CmsSlider
  | CmsProductSlider
  | CmsFeature
  | CmsFaq
  | CmsProductCards
  | CmsPostCards
  | CmsStatic;

// ── Article / Blog ──

export interface CmsAuthor {
  name: string;
  avatar: CmsImage | null;
  email: string | null;
}

export interface CmsArticle {
  id: number;
  title: string;
  description: string | null;
  slug: string;
  cover: CmsImage | null;
  author: CmsAuthor | null;
  category: { name: string; slug: string } | null;
  blocks: CmsBlock[];
  publishedAt: string | null;
}

// ── Page ──

export interface CmsPage {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  template: 'default' | 'landing-page' | 'editorial';
  seo: CmsSeo | null;
  blocks: CmsBlock[];
}

// ── Category Banner ──

export interface CmsCategoryBanner {
  categoryId: string;
  title: string | null;
  subtitle: string | null;
  image: CmsImage | null;
  ctaText: string | null;
  ctaUrl: string | null;
}

// ── Global (header + footer) ──

export interface CmsNavLink {
  label: string;
  url: string;
  highlight: boolean;
}

export interface CmsFooterColumn {
  title: string;
  links: CmsNavLink[];
}

export interface CmsGlobal {
  siteName: string;
  siteDescription: string;
  favicon: CmsImage | null;
  defaultSeo: CmsSeo | null;
  // Header — branding
  logo: CmsImage | null;
  logoAlt: string | null;
  // Header — top bar
  topBarEnabled: boolean;
  topBarPhone: string | null;
  topBarAnnouncement: string | null;
  topBarAnnouncementEnabled: boolean;
  showVatToggle: boolean;
  showLanguageSwitcher: boolean;
  availableLanguages: string[];
  // Header — functional components
  showSearch: boolean;
  showAccount: boolean;
  showCart: boolean;
  showCategoriesMenu: boolean;
  categoriesMenuLabel: string | null;
  // Header — navigation
  navLinks: CmsNavLink[];
  // Footer
  footerDescription: string | null;
  footerColumns: CmsFooterColumn[];
  footerEmail: string | null;
  footerPhone: string | null;
  copyrightText: string | null;
}
