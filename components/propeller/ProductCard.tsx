'use client';
/**
 * @rsc-blocked — Client-only component: interactive state (useState).
 * The compound subcomponents (`<ProductCard.Image>` etc.) inherit this
 * boundary even though several of them are individually pure — moving the
 * boundary would force a context-less prop drilling that defeats the
 * compound pattern. Server-side render needs go through the underlying
 * Bucket-B primitives (ProductPrice, ItemStock) directly.
 */
import * as React from 'react';

import { createContext, useContext, useState } from 'react';
import {
  GraphQLClient,
  Product,
  Contact,
  Customer,
  Cart,
  CartMainItem,
  CartChildItemInput,
  AttributeResult,
} from 'propeller-sdk-v2';
import AddToCartImpl from './AddToCart';
import ItemStock from './ItemStock';
import ProductPriceDisplay from './ProductPrice';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import {
  getProductImageUrl,
  getProductSku,
  getLocalizedValue,
} from '@/composables/shared/utils/productHelpers';
import { useResolvedProps, ResolveSpec } from '@/composables/react/useResolvedProps';
import { ProductGridConfig } from '@/context/ProductGridContext';

// ── Public types ────────────────────────────────────────────────────────────

/**
 * Props for the root `<ProductCard>` (and the back-compat monolithic
 * variant). Most fields are display toggles preserved for back-compat; in
 * the new compound API, consumers control rendering by composition instead
 * — see the Subcomponents section below.
 */
export interface ProductCardProps {
  // === Core ===

  /** The product object to display */
  product: Product;

  /**
   * Compound API: provide subcomponents as children. When omitted, the
   * monolithic legacy layout renders based on the show*/ /* allow* prop
   * toggles below.
   *
   * @example
   * <ProductCard product={p}>
   *   <ProductCard.Image variant="grid" />
   *   <ProductCard.Name linkable />
   *   <ProductCard.Price />
   *   <ProductCard.AddToCart />
   * </ProductCard>
   */
  children?: React.ReactNode;

  // === Display toggles (legacy / monolithic mode only) ===

  /** Show the product name. Defaults to true. */
  showName?: boolean;

  /** Show the product image. Defaults to true. */
  showImage?: boolean;

  /** Show the product short description. Defaults to false. */
  showShortDescription?: boolean;

  /** Show the product SKU. Defaults to true. */
  showSku?: boolean;

  /** Show the product manufacturer. Defaults to false. */
  showManufacturer?: boolean;

  /**
   * Show the stock / availability widget below the product name.
   * Uses the embedded `ItemStock` component driven by `product.inventory`.
   * Defaults to false.
   */
  showStock?: boolean;

  /**
   * Show only the availability indicator (Available / Not available) inside ItemStock.
   * Only relevant when `showStock` is true.
   * Defaults to true.
   */
  showAvailability?: boolean;

  /**
   * Show the price below the product name.
   * Defaults to true.
   */
  showPrice?: boolean;

  /**
   * Show the AddToCart component.
   * Defaults to true.
   */
  allowAddToCart?: boolean;

  /**
   * Label overrides forwarded to the embedded ItemStock component.
   * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
   */
  stockLabels?: Record<string, string>;

  // === Attribute labels ===

  /**
   * Attribute codes/names to look up and display as badge overlays on the product image.
   * Example: ['new', 'sale']
   */
  imageLabels?: string[];

  /**
   * Attribute codes/names to look up and display as extra text rows below the product name.
   * Example: ['brand', 'color']
   */
  textLabels?: string[];

  // === UI string overrides ===

  /** Override any UI string. Keys: addToFavorites, removeFromFavorites */
  labels?: Record<string, string>;

  // === Favourites ===

  /** Renders a heart-icon toggle button on the product image. Defaults to false. */
  enableAddFavorite?: boolean;

  /** Called whenever the favourite state is toggled. */
  onToggleFavorite?: (product: Product, isFavorite: boolean) => void;

  // === Navigation ===

  /**
   * Called when the product name or image is clicked.
   * When provided, the default `<a>` navigation is prevented.
   */
  onProductClick?: (product: Product) => void;

  // === Pricing ===

  /** When true, tax-inclusive (net) price is the leading price. Defaults to false. */
  includeTax?: boolean;

  // === Appearance ===

  /** Number of grid columns — when 1 the card renders as a compact horizontal row. */
  columns?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /**
   * URL pattern controlling which segments appear in product links.
   * Tokens: page → 'product', id → productId, slug → slug value.
   * Defaults to 'page/id/slug'.
   */
  urlPattern?: string;

  // === AddToCart pass-through props (forwarded to the compound subcomponent
  //     OR the legacy embedded AddToCart) ===

  graphqlClient?: GraphQLClient;
  user?: Contact | Customer | null;
  cartId?: string;
  configuration?: any;
  clusterId?: number;
  childItems?: number[];
  notes?: string;
  price?: number;
  createCart?: boolean;
  onCartCreated?: (cart: Cart) => void;
  onAddToCart?: (
    product: Product,
    clusterId?: number,
    quantity?: number,
    childItems?: CartChildItemInput[],
    notes?: string,
    price?: number,
    showModal?: boolean
  ) => Cart;
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;
  showModal?: boolean;
  allowIncrDecr?: boolean;
  enableStockValidation?: boolean;
  language?: string;
  companyId?: number;
  onProceedToCheckout?: () => void;
  onRequestQuoteClick?: (cart: Cart) => void;
  addToCartLabels?: Record<string, string>;
}

// ── Pure helpers (module scope — created once, not per render) ──────────────

function getProductName(product: Product | undefined, language: string): string {
  return getLocalizedValue(product?.names, language, 'Product');
}

function getProductShortDescription(product: Product | undefined, language: string): string {
  return getLocalizedValue(product?.shortDescriptions, language, '');
}

function getProductManufacturer(product: Product | undefined): string {
  return product?.manufacturer || '';
}

/** Resolves attribute codes to their display values, dropping any with no value. */
function resolveAttributeValues(product: Product | undefined, codes: string[] | undefined): string[] {
  if (!codes || codes.length === 0) return [];
  const attrs = product?.attributes?.items || [];
  return codes
    .map((code) => {
      const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
      return found?.value?.value || '';
    })
    .filter((v: string) => v.length > 0);
}

// Two-tier precedence (explicit prop > ProductGrid context > Propeller infra >
// default) for the ~24 props ProductGrid otherwise cascades through here.
const RESOLVE_SPEC: ResolveSpec<ProductCardProps> = {
  graphqlClient: { infra: 'graphqlClient' },
  user: { infra: 'user', default: null },
  companyId: { infra: 'companyId' },
  language: { infra: 'language', default: 'NL' },
  includeTax: { infra: 'includeTax' },
  configuration: { infra: 'configuration' },
  columns: { grid: 'columns', default: 3 },
  showPrice: { grid: 'showPrice' },
  showStock: { grid: 'showStock' },
  showAvailability: { grid: 'showAvailability' },
  allowAddToCart: { grid: 'allowAddToCart' },
  enableAddFavorite: { grid: 'enableAddFavorite' },
  stockLabels: { grid: 'stockLabels' },
  cartId: { grid: 'cartId' },
  createCart: { grid: 'createCart' },
  showModal: { grid: 'showModal' },
  allowIncrDecr: { grid: 'allowIncrDecr' },
  enableStockValidation: { grid: 'enableStockValidation' },
  addToCartLabels: { grid: 'addToCartLabels' },
  childItems: { grid: 'childItems' },
  notes: { grid: 'notes' },
  price: { grid: 'price' },
  onCartCreated: { grid: 'onCartCreated' },
  afterAddToCart: { grid: 'afterAddToCart' },
  onProceedToCheckout: { grid: 'onProceedToCheckout' },
  onRequestQuoteClick: { grid: 'onRequestQuoteClick' },
  onProductClick: { grid: 'onProductClick' },
  onToggleFavorite: {
    grid: 'onToggleFavorite',
    transform: (fn) => (p: Product, fav: boolean) =>
      (fn as ProductGridConfig['onToggleFavorite'])!(p, fav),
  },
};

// ── Context (shared by compound subcomponents) ──────────────────────────────

/**
 * Internal context populated by the root `<ProductCard>`. Subcomponents read
 * `useProductCard()` to get the product + resolved props + derived values
 * (name, sku, imageUrl, productUrl) computed once. Not exported — consumers
 * compose subcomponents under `<ProductCard>` rather than reading the
 * context directly.
 */
interface ProductCardContextValue {
  product: Product;
  /** Fully resolved props (infra + grid context + explicit) — read instead of `props`. */
  resolved: ProductCardProps;
  /** Derived display values, computed once at the root and read by leaves. */
  derived: {
    name: string;
    sku: string;
    imageUrl: string;
    shortDescription: string;
    manufacturer: string;
    productUrl: string;
    imageLabelValues: string[];
    textLabelValues: string[];
    useTax: boolean;
    isRow: boolean;
    language: string;
  };
  /** Local UI state shared between Image (which renders the heart) and any sibling. */
  favorite: {
    isFavorite: boolean;
    toggle: (e: React.MouseEvent) => void;
  };
  /** Click handler shared by Image + Name. */
  handleProductClick: (e: React.MouseEvent) => void;
}

const ProductCardContext = createContext<ProductCardContextValue | null>(null);

/**
 * Internal hook used by compound subcomponents. Throws if called outside
 * `<ProductCard>` — the error is intentional, that's a developer mistake.
 */
function useProductCard(): ProductCardContextValue {
  const ctx = useContext(ProductCardContext);
  if (!ctx) {
    throw new Error(
      '<ProductCard.X> must be rendered inside <ProductCard>. ' +
        'Got null context — wrap your subcomponents in <ProductCard product={...}>...</ProductCard>.'
    );
  }
  return ctx;
}

// ── Root component ──────────────────────────────────────────────────────────

function ProductCardRoot(rawProps: ProductCardProps) {
  // Resolve infra (Tier 1) + grid config (Tier 2) declaratively so this
  // component no longer needs ~24 cascaded props.
  const props = useResolvedProps(rawProps, RESOLVE_SPEC);

  const [isFavorite, setIsFavorite] = useState(false);

  const language = (props.language as string) || 'NL';
  const product = props.product;
  const isRow = props.columns === 1;

  // Derived values — computed once per render.
  const name = getProductName(product, language);
  const sku = getProductSku(product);
  const imageUrl = getProductImageUrl(product);
  const shortDescription = getProductShortDescription(product, language);
  const manufacturer = getProductManufacturer(product);
  const productUrl = props.configuration?.urls?.getProductUrl?.(product, props.language) ?? '#';
  const imageLabelValues = resolveAttributeValues(product, props.imageLabels);
  const textLabelValues = resolveAttributeValues(product, props.textLabels);
  const useTax = props.includeTax !== undefined ? !!props.includeTax : false;

  function handleProductClick(e: React.MouseEvent): void {
    if (props.onProductClick) {
      e.preventDefault();
      props.onProductClick(product);
    }
  }

  function toggleFavorite(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    if (props.onToggleFavorite) {
      props.onToggleFavorite(product, isFavorite);
    }
  }

  const contextValue: ProductCardContextValue = {
    product,
    resolved: props,
    derived: {
      name,
      sku,
      imageUrl,
      shortDescription,
      manufacturer,
      productUrl,
      imageLabelValues,
      textLabelValues,
      useTax,
      isRow,
      language,
    },
    favorite: { isFavorite, toggle: toggleFavorite },
    handleProductClick,
  };

  // Compound mode: consumer supplied children. Render them inside a default
  // shell with the root layout classes, but the consumer controls the order
  // and which subcomponents appear. The shell can be replaced via
  // <ProductCard.Shell as="article"> in a future extension; for now the div
  // matches the legacy markup so styling stays identical.
  if (rawProps.children !== undefined) {
    return (
      <ProductCardContext.Provider value={contextValue}>
        <div
          className={`propeller-product-card group relative flex h-full overflow-hidden rounded-container border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-secondary/20 ${isRow ? 'flex-row flex-wrap md:flex-nowrap items-center' : 'flex-col'} ${props.className || ''}`}
          data-layout={isRow ? 'row' : 'grid'}
        >
          {rawProps.children}
        </div>
      </ProductCardContext.Provider>
    );
  }

  // Legacy / monolithic mode: render the original full layout based on the
  // show*/allow* toggles. Internally we still use the compound subcomponents
  // so there's one rendering path. Marked @deprecated in the prop docs;
  // planned removal in v2 once consumers have migrated.
  return (
    <ProductCardContext.Provider value={contextValue}>
      <div
        className={`propeller-product-card group relative flex h-full overflow-hidden rounded-container border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-secondary/20 ${isRow ? 'flex-row flex-wrap md:flex-nowrap items-center' : 'flex-col'} ${props.className || ''}`}
        data-layout={isRow ? 'row' : 'grid'}
      >
        {props.showImage !== false ? <ProductCardImage /> : null}
        {isRow ? (
          <>
            <div className="propeller-product-card__body flex flex-1 flex-row items-center gap-4 px-4 py-2 min-w-0">
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                {props.showSku !== false && sku ? <ProductCardSku /> : null}
                {props.showName !== false ? <ProductCardName linkable /> : null}
                {textLabelValues.length > 0 ? <ProductCardTextLabels /> : null}
                {props.showManufacturer && manufacturer ? <ProductCardManufacturer /> : null}
                {props.showShortDescription && shortDescription ? <ProductCardShortDescription /> : null}
              </div>
            </div>
            <div className="propeller-product-card__footer w-full md:w-auto flex items-center gap-3 px-4 py-2 md:py-0 border-t md:border-t-0 border-border-subtle">
              {props.showStock && !!product.inventory ? <ProductCardStock /> : null}
              {props.showPrice !== false && !!product?.price ? (
                <ProductCardPrice priceSize="text-sm" />
              ) : null}
              {props.allowAddToCart !== false ? (
                <div className="propeller-product-card__cta flex-shrink-0 ml-auto">
                  <ProductCardAddToCart />
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div className="propeller-product-card__body flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
              {props.showSku !== false && sku ? <ProductCardSku /> : null}
              {props.showName !== false ? <ProductCardName linkable /> : null}
              {textLabelValues.length > 0 ? <ProductCardTextLabels /> : null}
              {props.showStock && !!product.inventory ? <ProductCardStock /> : null}
              {props.showManufacturer && manufacturer ? <ProductCardManufacturer /> : null}
              {props.showShortDescription && shortDescription ? <ProductCardShortDescription /> : null}
              {props.showPrice !== false && !!product?.price ? (
                <div className="propeller-product-card__price mt-auto pt-1">
                  <ProductCardPrice priceSize="text-base sm:text-lg" />
                </div>
              ) : null}
            </div>
            {props.allowAddToCart !== false ? (
              <div className="propeller-product-card__cta px-3 pb-3 sm:px-4 sm:pb-4">
                <ProductCardAddToCart />
              </div>
            ) : null}
          </>
        )}
      </div>
    </ProductCardContext.Provider>
  );
}

// ── Compound subcomponents ──────────────────────────────────────────────────

/**
 * Product image with optional badge overlays and favourite button.
 * Reads `derived.imageUrl`, `derived.imageLabelValues`, `derived.productUrl`,
 * and the `favorite` state from context.
 */
function ProductCardImage(props: {
  /** Override the wrapper class. */
  className?: string;
  /** Render the favourite heart button. Defaults to context `enableAddFavorite`. */
  showFavorite?: boolean;
}) {
  const { derived, resolved, favorite, handleProductClick } = useProductCard();
  const showFavorite = props.showFavorite ?? !!resolved.enableAddFavorite;
  const isRow = derived.isRow;
  return (
    <div
      className={
        props.className ??
        `propeller-product-card__media relative overflow-hidden bg-surface-hover ${isRow ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-[4/3] sm:aspect-square p-2 sm:p-4'}`
      }
    >
      <a className="block h-full w-full" href={derived.productUrl} onClick={handleProductClick}>
        {derived.imageUrl ? (
          <img
            className="propeller-product-card__image h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            src={derived.imageUrl}
            alt={derived.name}
          />
        ) : (
          <div className="propeller-product-card__image-placeholder flex h-full w-full items-center justify-center text-foreground-subtle">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-16 w-16">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeWidth={1}
              />
            </svg>
          </div>
        )}
      </a>
      {derived.imageLabelValues.length > 0 ? <ProductCardBadges /> : null}
      {showFavorite ? <ProductCardFavorite /> : null}
    </div>
  );
}

/** Image-overlay badge list (e.g. "new", "sale" attributes). */
function ProductCardBadges(props: { className?: string }) {
  const { derived } = useProductCard();
  if (derived.imageLabelValues.length === 0) return null;
  return (
    <div className={props.className ?? 'propeller-product-card__badges pointer-events-none absolute left-2 top-2 flex flex-col gap-1'}>
      {derived.imageLabelValues.map((label) => (
        <span
          key={label}
          className="propeller-product-card__badge inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground shadow-sm"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** Favourite (heart) toggle button — typically placed inside `<ProductCard.Image>`. */
function ProductCardFavorite(props: { className?: string }) {
  const { resolved, favorite } = useProductCard();
  return (
    <button
      type="button"
      onClick={favorite.toggle}
      aria-label={
        favorite.isFavorite
          ? getLabel(resolved.labels, 'removeFromFavorites', 'Remove from favourites')
          : getLabel(resolved.labels, 'addToFavorites', 'Add to favourites')
      }
      data-favorite={favorite.isFavorite ? 'true' : 'false'}
      className={
        props.className ??
        `propeller-product-card__favorite-btn absolute right-2 top-2 rounded-full border bg-card p-1.5 shadow-sm transition-colors ${favorite.isFavorite ? 'border-destructive/30 text-destructive' : 'border-border-subtle text-foreground-subtle hover:text-destructive'}`
      }
    >
      <svg
        stroke="currentColor"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill={favorite.isFavorite ? 'currentColor' : 'none'}
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}

/** Product name. `linkable` (default true) wraps it in an `<a>` to the PDP. */
function ProductCardName(props: { linkable?: boolean; className?: string }) {
  const { derived, handleProductClick } = useProductCard();
  const linkable = props.linkable ?? true;
  const cls =
    props.className ??
    `propeller-product-card__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary ${derived.isRow ? 'line-clamp-1' : 'line-clamp-2'}`;
  if (linkable) {
    return (
      <a className={cls} href={derived.productUrl} onClick={handleProductClick}>
        {derived.name}
      </a>
    );
  }
  return <span className={cls}>{derived.name}</span>;
}

function ProductCardSku(props: { className?: string }) {
  const { derived } = useProductCard();
  if (!derived.sku) return null;
  return (
    <div className={props.className ?? 'propeller-product-card__sku font-mono text-xs text-foreground-subtle'}>
      {derived.sku}
    </div>
  );
}

function ProductCardShortDescription(props: { className?: string }) {
  const { derived } = useProductCard();
  if (!derived.shortDescription) return null;
  return (
    <p className={props.className ?? 'propeller-product-card__description line-clamp-2 text-xs text-muted-foreground'}>
      {derived.shortDescription}
    </p>
  );
}

function ProductCardManufacturer(props: { className?: string }) {
  const { derived } = useProductCard();
  if (!derived.manufacturer) return null;
  return (
    <div className={props.className ?? 'propeller-product-card__manufacturer text-xs text-muted-foreground'}>
      {derived.manufacturer}
    </div>
  );
}

function ProductCardTextLabels(props: { className?: string }) {
  const { derived } = useProductCard();
  if (derived.textLabelValues.length === 0) return null;
  return (
    <div className={props.className ?? 'propeller-product-card__labels flex flex-col gap-0.5'}>
      {derived.textLabelValues.map((value) => (
        <div key={value} className="propeller-product-card__label text-xs text-muted-foreground">
          {value}
        </div>
      ))}
    </div>
  );
}

function ProductCardStock(props: { showAvailability?: boolean }) {
  const { product, resolved } = useProductCard();
  if (!product.inventory) return null;
  return (
    <ItemStock
      inventory={product.inventory}
      showAvailability={props.showAvailability ?? (resolved.showAvailability !== false)}
      showStock
      labels={resolved.stockLabels}
    />
  );
}

function ProductCardPrice(props: { priceSize?: string; className?: string }) {
  const { product, derived } = useProductCard();
  if (!product?.price) return null;
  return (
    <div className={props.className ?? 'propeller-product-card__price'}>
      <ProductPriceDisplay
        price={product.price}
        includeTax={derived.useTax}
        priceSize={props.priceSize ?? 'text-base sm:text-lg'}
      />
    </div>
  );
}

function ProductCardAddToCart(props: { className?: string }) {
  const { product, resolved } = useProductCard();
  return (
    <AddToCartImpl
      className={props.className ?? 'flex w-full items-center gap-2'}
      graphqlClient={resolved.graphqlClient}
      user={resolved.user}
      product={product}
      cartId={resolved.cartId}
      configuration={resolved.configuration}
      childItems={resolved.childItems}
      notes={resolved.notes}
      price={resolved.price}
      createCart={resolved.createCart}
      onCartCreated={resolved.onCartCreated}
      onAddToCart={resolved.onAddToCart}
      afterAddToCart={resolved.afterAddToCart}
      showModal={resolved.showModal}
      allowIncrDecr={resolved.allowIncrDecr}
      enableStockValidation={resolved.enableStockValidation}
      language={resolved.language}
      onProceedToCheckout={resolved.onProceedToCheckout}
      labels={resolved.addToCartLabels}
      companyId={resolved.companyId}
      onRequestQuoteClick={resolved.onRequestQuoteClick}
    />
  );
}

// ── Compound default export ─────────────────────────────────────────────────

// Memoized: with ProductGrid passing only stable { product, allowAddToCart }
// and config flowing via context, shallow-equal props skip re-render of the
// whole card subtree.
const MemoizedRoot = React.memo(ProductCardRoot);

/**
 * Compound component. Use either:
 *
 *  **Compound mode (new — preferred):**
 *  ```tsx
 *  <ProductCard product={p}>
 *    <ProductCard.Image variant="grid" />
 *    <ProductCard.Name linkable />
 *    <ProductCard.Sku />
 *    <ProductCard.Price />
 *    <ProductCard.AddToCart />
 *  </ProductCard>
 *  ```
 *
 *  **Legacy mode (deprecated — kept for back-compat):**
 *  ```tsx
 *  <ProductCard product={p} showName showPrice allowAddToCart />
 *  ```
 *  All the show* / allow* toggles still work and render the canonical layout
 *  using the compound subcomponents internally.
 */
type ProductCardComponent = typeof MemoizedRoot & {
  Image: typeof ProductCardImage;
  Badges: typeof ProductCardBadges;
  Favorite: typeof ProductCardFavorite;
  Name: typeof ProductCardName;
  Sku: typeof ProductCardSku;
  ShortDescription: typeof ProductCardShortDescription;
  Manufacturer: typeof ProductCardManufacturer;
  TextLabels: typeof ProductCardTextLabels;
  Stock: typeof ProductCardStock;
  Price: typeof ProductCardPrice;
  AddToCart: typeof ProductCardAddToCart;
};

const ProductCard = MemoizedRoot as ProductCardComponent;
ProductCard.Image = ProductCardImage;
ProductCard.Badges = ProductCardBadges;
ProductCard.Favorite = ProductCardFavorite;
ProductCard.Name = ProductCardName;
ProductCard.Sku = ProductCardSku;
ProductCard.ShortDescription = ProductCardShortDescription;
ProductCard.Manufacturer = ProductCardManufacturer;
ProductCard.TextLabels = ProductCardTextLabels;
ProductCard.Stock = ProductCardStock;
ProductCard.Price = ProductCardPrice;
ProductCard.AddToCart = ProductCardAddToCart;

export default ProductCard;
