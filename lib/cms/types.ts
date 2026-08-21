/**
 * CMS types for the storefront.
 *
 * The canonical CMS type system lives in
 * `@propeller-commerce/propeller-v2-core-ui` (promoted from this boilerplate).
 * We re-export it so the app has a single source of truth, and add the
 * app-local extras core-ui does not (yet) carry:
 *
 *  - `card-actions` block (not in core-ui's `CmsTypedBlock` union).
 *  - `description` + `variantKey` on the hero, and `variantKey` on
 *    product-cards — Prepr adaptive-content signals the providers emit but
 *    core-ui's block interfaces dropped. We augment locally so the providers
 *    keep strong typing (no casts) instead of narrowing the app to core-ui.
 *
 * Naming note: this app uses `CmsPage`/`CmsBlock` to mean the *typed*
 * page/block (blocks carry `_type`, template, etc.). core-ui reserves those
 * names for the *flat* adapter shapes (`{ type, data }`) and calls the typed
 * ones `CmsRichPage`/`CmsTypedBlock`. We keep the app's historical names,
 * pointed at the (locally-widened) typed shapes.
 */
export type {
  // Media / SEO
  CmsImage,
  CmsSeo,
  // Individual typed blocks (identical to the former app-local copies)
  CmsRichText,
  CmsMedia,
  CmsQuote,
  CmsValuePropItem,
  CmsValueProps,
  CmsCallToAction,
  CmsProductCarousel,
  CmsContactForm,
  CmsSlider,
  CmsProductSlider,
  CmsFeature,
  CmsFaq,
  CmsProductCard,
  CmsPostCards,
  CmsStatic,
  // Author
  CmsAuthor,
  // Category banner + global (header/footer)
  CmsCategoryBanner,
  CmsNavLink,
  CmsFooterColumn,
  CmsGlobal,
} from '@propeller-commerce/propeller-v2-core-ui';

import type {
  CmsImage,
  CmsRichPage,
  CmsTypedBlock,
  CmsArticle as CmsCoreArticle,
  CmsHeroBanner as CmsCoreHeroBanner,
  CmsProductCards as CmsCoreProductCards,
} from '@propeller-commerce/propeller-v2-core-ui';

// ── App-local augmentations: Prepr adaptive-content fields ──
// core-ui's block interfaces dropped these; the providers still emit them.

/** Hero + the app's `description` and Prepr adaptive-content `variantKey`. */
export interface CmsHeroBanner extends CmsCoreHeroBanner {
  description: string | null;
  /** Prepr adaptive-content variant key (_context.variant_key). */
  variantKey?: string | null;
}

/** Product-cards + Prepr adaptive-content `variantKey`. */
export interface CmsProductCards extends CmsCoreProductCards {
  /** Prepr adaptive-content variant key (_context.variant_key). */
  variantKey?: string | null;
}

// ── App-local block: card-actions (not in core-ui's union) ──

export interface CmsCardActionItem {
  title: string;
  description: string | null;
  image: CmsImage | null;
  icon: CmsImage | null;
  buttonText: string | null;
  buttonUrl: string | null;
}

export interface CmsCardActions {
  _type: 'card-actions';
  title: string | null;
  items: CmsCardActionItem[];
}

// ── Typed page / block / article ──
//
// Widen core-ui's typed block union with the local augmentations + card-actions,
// then thread that union through the page and article shapes. Keeps the app's
// historical `CmsPage`/`CmsBlock` names and strong typing at the provider seam.

/**
 * Typed block union: core-ui's typed blocks, with the hero + product-cards
 * augmented and the app-local `card-actions` added. We swap the two augmented
 * members in by excluding core-ui's originals (matched by `_type`) then adding
 * the local supersets.
 */
export type CmsBlock =
  | Exclude<CmsTypedBlock, { _type: 'hero-banner' } | { _type: 'product-cards' }>
  | CmsHeroBanner
  | CmsProductCards
  | CmsCardActions;

/** Typed page: core-ui's rich page with the widened block union. */
export type CmsPage = Omit<CmsRichPage, 'blocks'> & { blocks: CmsBlock[] };

/** Blog article: core-ui's article with the widened block union. */
export type CmsArticle = Omit<CmsCoreArticle, 'blocks'> & { blocks: CmsBlock[] };
