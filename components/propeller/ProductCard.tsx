'use client';
import * as React from 'react';

import { useState } from 'react';
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
import AddToCart from './AddToCart';
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

export interface ProductCardProps {
  // === Core ===

  /** The product object to display */
  product: Product;

  // === Display toggles ===

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
   * Each code is resolved against `product.attributes.items[].attributeDescription.code`
   * (or `.name`). Attributes with no matching value are silently omitted.
   * Example: ['new', 'sale']
   */
  imageLabels?: string[];

  /**
   * Attribute codes/names to look up and display as extra text rows below the product name.
   * Resolved the same way as `imageLabels`.
   * Example: ['brand', 'color']
   */
  textLabels?: string[];

  // === UI string overrides ===

  /**
   * Override any UI string.
   * Available keys: addToFavorites, removeFromFavorites
   */
  labels?: Record<string, string>;

  // === Favourites ===

  /** Renders a heart-icon toggle button on the product image. Defaults to false. */
  enableAddFavorite?: boolean;

  /**
   * Called whenever the favourite state is toggled.
   * The second argument indicates the new state: `true` = added, `false` = removed.
   */
  onToggleFavorite?: (product: Product, isFavorite: boolean) => void;

  // === Navigation ===

  /**
   * Called when the product name or image is clicked.
   * When provided, the default `<a>` navigation is prevented so the consumer
   * can use framework-specific routing (e.g. Next.js `router.push`).
   */
  onProductClick?: (product: Product) => void;

  // === Pricing ===

  /**
   * When true, tax-inclusive price (net) is the leading price.
   * When false, tax-exclusive price (gross) is shown.
   * Defaults to false.
   */
  includeTax?: boolean;

  // === Appearance ===

  /** Number of grid columns — when 1 the card renders as a compact horizontal row. */
  columns?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /**
   * URL pattern controlling which segments appear in product links.
   * Tokens: page → 'product', id → productId, slug → slug value.
   * Examples: 'page/id/slug' (default) | 'page/slug' | 'page/id'
   * Defaults to 'page/id/slug' when omitted.
   */
  urlPattern?: string;

  // === AddToCart pass-through props ===

  /** Initialised Propeller SDK GraphQL client. Resolved from PropellerProvider when omitted. */
  graphqlClient?: GraphQLClient;

  /** Authenticated user — used for cart creation / lookup. Resolved from PropellerProvider when omitted. */
  user?: Contact | Customer | null;

  /** ID of an existing cart to add items to. */
  cartId?: string;

  /** Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall. */
  configuration?: any;

  /** Cluster ID for configurable products. */
  clusterId?: number;

  /** Product IDs of selected cluster child options. */
  childItems?: number[];

  /** Free-text notes attached to the cart item. */
  notes?: string;

  /** Custom unit price override. Omit to use calculated price. */
  price?: number;

  /**
   * When true and no cartId is available, the embedded AddToCart automatically
   * looks up or creates a cart. Always pair with onCartCreated.
   */
  createCart?: boolean;

  /** Called after a new cart is created internally by AddToCart. */
  onCartCreated?: (cart: Cart) => void;

  /**
   * Fully replaces the internal CartService.addItemToCart call inside AddToCart.
   * Must return a Cart object.
   */
  onAddToCart?: (
    product: Product,
    clusterId?: number,
    quantity?: number,
    childItems?: CartChildItemInput[],
    notes?: string,
    price?: number,
    showModal?: boolean
  ) => Cart;

  /** Called after every successful add-to-cart. Receives the updated cart and the added item. */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /**
   * When true the embedded AddToCart shows a modal after a successful add
   * instead of the default toast notification. Defaults to false.
   */
  showModal?: boolean;

  /**
   * Renders − and + buttons beside the quantity input in AddToCart.
   * Defaults to true.
   */
  allowIncrDecr?: boolean;

  /** Validate stock before adding to cart. Defaults to false. */
  enableStockValidation?: boolean;

  /** Language code forwarded to CartService operations. Defaults to 'NL'. */
  language?: string;

  /**
   * Active company ID from the company switcher.
   * When provided, overrides the user's default company for cart creation and lookup.
   */
  companyId?: number;

  /** Called when the user clicks "Proceed to checkout" inside the AddToCart modal. */
  onProceedToCheckout?: () => void;

  /** Called when the user clicks "Request a Quote" inside the AddToCart modal. */
  onRequestQuoteClick?: (cart: Cart) => void;

  /**
   * Label overrides for UI strings. Available labels: outOfStock, noCartId,
   * errorAdding, addedToCart, modalTitle, quantity, continueShopping,
   * proceedToCheckout, requestQuoteButton, add, adding
   */
  addToCartLabels?: Record<string, string>;
}

// ── Pure helpers (module scope — created once, not per render) ──────────────────

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
// default) for the ~24 props ProductGrid otherwise cascades through here. See
// useResolvedProps — declarative replacement for the old hand-written block.
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

function ProductCard(rawProps: ProductCardProps) {
  // Resolve infra (Tier 1) + grid config (Tier 2) declaratively so this
  // component no longer needs ~24 cascaded props. Non-throwing — standalone use
  // (no provider) falls back to explicit props / defaults.
  const props = useResolvedProps(rawProps, RESOLVE_SPEC);

  const [isFavorite, setIsFavorite] = useState(false);

  const language = (props.language as string) || 'NL';
  const product = props.product;
  const isRow = props.columns === 1;

  // Derived values — computed once per render (previously these helpers were
  // redefined every render and called up to 5× across the layout branches).
  const productName = getProductName(product, language);
  const productSku = getProductSku(product);
  const productImageUrl = getProductImageUrl(product);
  const shortDescription = getProductShortDescription(product, language);
  const manufacturer = getProductManufacturer(product);
  const productUrl = props.configuration.urls.getProductUrl(product, props.language);
  const imageLabelValues = resolveAttributeValues(product, props.imageLabels);
  const textLabelValues = resolveAttributeValues(product, props.textLabels).map((value) => ({
    value,
  }));

  const useTax = props.includeTax !== undefined ? !!props.includeTax : false;

  function handleProductClick(e: React.MouseEvent): void {
    if (props.onProductClick) {
      e.preventDefault();
      props.onProductClick(product);
    }
  }

  function handleToggleFavorite(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    if (props.onToggleFavorite) {
      props.onToggleFavorite(product, isFavorite);
    }
  }

  // Single AddToCart prop set — previously this 19-prop block was duplicated
  // verbatim across the row and grid layout branches.
  const addToCartProps = {
    className: 'flex w-full items-center gap-2',
    graphqlClient: props.graphqlClient,
    user: props.user,
    product: product,
    cartId: props.cartId,
    configuration: props.configuration,
    childItems: props.childItems,
    notes: props.notes,
    price: props.price,
    createCart: props.createCart,
    onCartCreated: props.onCartCreated,
    onAddToCart: props.onAddToCart,
    afterAddToCart: props.afterAddToCart,
    showModal: props.showModal,
    allowIncrDecr: props.allowIncrDecr,
    enableStockValidation: props.enableStockValidation,
    language: props.language,
    onProceedToCheckout: props.onProceedToCheckout,
    labels: props.addToCartLabels,
    companyId: props.companyId,
    onRequestQuoteClick: props.onRequestQuoteClick,
  };

  return (
    <div
      className={`propeller-product-card group relative flex h-full overflow-hidden rounded-container border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-secondary/20 ${isRow ? 'flex-row flex-wrap md:flex-nowrap items-center' : 'flex-col'} ${props.className || ''}`}
      data-layout={isRow ? 'row' : 'grid'}
    >
      {props.showImage !== false ? (
        <div
          className={`propeller-product-card__media relative overflow-hidden bg-surface-hover ${isRow ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-[4/3] sm:aspect-square p-2 sm:p-4'}`}
        >
          <a
            className="block h-full w-full"
            href={productUrl}
            onClick={(e) => handleProductClick(e)}
          >
            {productImageUrl ? (
              <img
                className="propeller-product-card__image h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                src={productImageUrl}
                alt={productName}
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
          {imageLabelValues.length > 0 ? (
            <div className="propeller-product-card__badges pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
              {imageLabelValues.map((label) => (
                <span
                  key={label}
                  className="propeller-product-card__badge inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground shadow-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          {props.enableAddFavorite ? (
            <button
              type="button"
              onClick={(e) => handleToggleFavorite(e)}
              aria-label={
                isFavorite
                  ? getLabel(props.labels, 'removeFromFavorites', 'Remove from favourites')
                  : getLabel(props.labels, 'addToFavorites', 'Add to favourites')
              }
              data-favorite={isFavorite ? 'true' : 'false'}
              className={`propeller-product-card__favorite-btn absolute right-2 top-2 rounded-full border bg-card p-1.5 shadow-sm transition-colors ${isFavorite ? 'border-destructive/30 text-destructive' : 'border-border-subtle text-foreground-subtle hover:text-destructive'}`}
            >
              <svg
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill={isFavorite ? 'currentColor' : 'none'}
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}

      {isRow ? (
        <>
          <div className="propeller-product-card__body flex flex-1 flex-row items-center gap-4 px-4 py-2 min-w-0">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              {props.showSku !== false && productSku ? (
                <div className="propeller-product-card__sku font-mono text-xs text-foreground-subtle">
                  {productSku}
                </div>
              ) : null}
              {props.showName !== false ? (
                <a
                  className="propeller-product-card__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary line-clamp-1"
                  href={productUrl}
                  onClick={(e) => handleProductClick(e)}
                >
                  {productName}
                </a>
              ) : null}
              {textLabelValues.length > 0 ? (
                <div className="propeller-product-card__labels flex flex-col gap-0.5">
                  {textLabelValues.map((item) => (
                    <div
                      key={item.value}
                      className="propeller-product-card__label text-xs text-muted-foreground"
                    >
                      {item.value}
                    </div>
                  ))}
                </div>
              ) : null}
              {props.showManufacturer && manufacturer ? (
                <div className="propeller-product-card__manufacturer text-xs text-muted-foreground">
                  {manufacturer}
                </div>
              ) : null}
              {props.showShortDescription && shortDescription ? (
                <p className="propeller-product-card__description line-clamp-2 text-xs text-muted-foreground">
                  {shortDescription}
                </p>
              ) : null}
            </div>
          </div>{' '}
          <div className="propeller-product-card__footer w-full md:w-auto flex items-center gap-3 px-4 py-2 md:py-0 border-t md:border-t-0 border-border-subtle">
            {props.showStock && !!product.inventory ? (
              <ItemStock
                inventory={product.inventory!}
                showAvailability={false}
                showStock
                labels={props.stockLabels}
              />
            ) : null}
            {props.showPrice !== false && !!product?.price ? (
              <div className="propeller-product-card__price">
                <ProductPriceDisplay
                  price={product.price}
                  includeTax={useTax}
                  priceSize="text-sm"
                />
              </div>
            ) : null}
            {props.allowAddToCart !== false ? (
              <div className="propeller-product-card__cta flex-shrink-0 ml-auto">
                <AddToCart {...addToCartProps} />
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="propeller-product-card__body flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
            {props.showSku !== false && productSku ? (
              <div className="propeller-product-card__sku font-mono text-xs text-foreground-subtle">
                {productSku}
              </div>
            ) : null}
            {props.showName !== false ? (
              <a
                className="propeller-product-card__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary line-clamp-2"
                href={productUrl}
                onClick={(e) => handleProductClick(e)}
              >
                {productName}
              </a>
            ) : null}
            {textLabelValues.length > 0 ? (
              <div className="propeller-product-card__labels flex flex-col gap-0.5">
                {textLabelValues.map((item) => (
                  <div
                    key={item.value}
                    className="propeller-product-card__label text-xs text-muted-foreground"
                  >
                    {item.value}
                  </div>
                ))}
              </div>
            ) : null}
            {props.showStock && !!product.inventory ? (
              <ItemStock
                inventory={product.inventory!}
                showAvailability={props.showAvailability !== false}
                showStock
                labels={props.stockLabels}
              />
            ) : null}
            {props.showManufacturer && manufacturer ? (
              <div className="propeller-product-card__manufacturer text-xs text-muted-foreground">
                {manufacturer}
              </div>
            ) : null}
            {props.showShortDescription && shortDescription ? (
              <p className="propeller-product-card__description line-clamp-2 text-xs text-muted-foreground">
                {shortDescription}
              </p>
            ) : null}
            {props.showPrice !== false && !!product?.price ? (
              <div className="propeller-product-card__price mt-auto pt-1">
                <ProductPriceDisplay
                  price={product.price}
                  includeTax={useTax}
                  priceSize="text-base sm:text-lg"
                />
              </div>
            ) : null}
          </div>{' '}
          {props.allowAddToCart !== false ? (
            <div className="propeller-product-card__cta px-3 pb-3 sm:px-4 sm:pb-4">
              <AddToCart {...addToCartProps} />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
// Memoized: with ProductGrid passing only stable { product, allowAddToCart }
// and config flowing via context, shallow-equal props skip re-render of the
// whole card subtree (rbp §5.2).
export default React.memo(ProductCard);
