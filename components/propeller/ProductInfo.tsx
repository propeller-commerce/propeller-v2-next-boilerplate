'use client';
import * as React from 'react';

import { useEffect } from 'react';
import {
  GraphQLClient,
  Product,
  ProductService,
  LocalizedString,
  Contact,
  Customer,
  OrderlistService,
  Orderlist,
} from 'propeller-sdk-v2';
import { useProductInfo } from '@/composables/react/useProductInfo';

export interface ProductInfoProps {
  // ── Data source ──────────────────────────────────────────────────────────
  /** The authenticated user (Contact or Customer) */
  user: Contact | Customer | null;

  /** Active company ID from the company switcher.
   * Overrides default company for price calculation.
   * Triggers a re-fetch when changed. */
  companyId?: number;

  /**
   * Pre-fetched product object to display.
   * When provided the component skips internal fetching.
   */
  product?: Product;

  /**
   * Product ID to fetch data for when no `product` prop is provided.
   * Requires `graphqlClient` to be set.
   */
  productId?: number;

  /**
   * Initialised Propeller SDK GraphQL client.
   * Required when `productId` is provided for internal data fetching.
   */
  graphqlClient?: GraphQLClient;

  /**
   * Image search filter passed to ProductService.getProduct().
   * Controls how many image items are returned.
   * Example: { page: 1, offset: 20 }
   */
  imageSearchFilters?: any;

  /**
   * Image variant transformation filter passed to ProductService.getProduct().
   * Controls image size/format variants returned with the product.
   * Example: imageVariantFiltersLarge from @/data/defaults
   * Defaults to { transformations: [] } when omitted.
   */
  imageVariantFilters?: any;

  /**
   * Tax zone to use for price calculation.
   */
  taxZone?: string;

  /**
   * Called once the product data is loaded — either immediately (when
   * `product` prop is supplied) or after the internal fetch completes.
   * Use this to hydrate sibling components (gallery, price, descriptions, etc.).
   */
  onProductLoaded?: (product: Product) => void;

  // ── Display toggles ───────────────────────────────────────────────────────

  /** Show the product name. Defaults to true. */
  showTitle?: boolean;

  /** Show the product SKU. Defaults to true. */
  showSku?: boolean;

  // ── Locale ────────────────────────────────────────────────────────────────

  /** Language code used to resolve localised names. Defaults to 'NL'. */
  language?: string;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /**
   * Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall.
   */
  configuration?: any;

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
}

function ProductInfo(props: ProductInfoProps) {
  const { product: fetchedProduct, loading, fetchProduct } = useProductInfo(
    props.graphqlClient
      ? { graphqlClient: props.graphqlClient, language: props.language, configuration: props.configuration }
      : { graphqlClient: {} as GraphQLClient, language: props.language, configuration: props.configuration }
  );

  const activeProduct: Product | null = props.product || fetchedProduct;

  function getProductName(): string {
    if (!activeProduct) return '';
    const lang = props.language || 'NL';
    const match = activeProduct.names?.find((n: LocalizedString) => n.language === lang);
    return match?.value || activeProduct.names?.[0]?.value || '';
  }

  function getProductSku(): string {
    return activeProduct?.sku || '';
  }

  useEffect(() => {
    if (props.product) {
      if (props.onProductLoaded) {
        props.onProductLoaded(props.product);
      }
      return;
    }
    if (!props.productId || !props.graphqlClient) return;
    fetchProduct(props.productId, props.imageSearchFilters, props.imageVariantFilters);
  }, [props.productId, props.product, props.language, props.user, props.companyId]);

  useEffect(() => {
    if (fetchedProduct && props.onProductLoaded) {
      props.onProductLoaded(fetchedProduct);
    }
  }, [fetchedProduct]);

  return (
    <div className={`propeller-product-info ${(props.className as string) || ''}`} data-loading={loading ? 'true' : 'false'}>
      {loading && !props.product ? (
        <div className="propeller-product-info__skeleton animate-pulse space-y-3">
          <div className="propeller-product-info__skeleton-line h-4 bg-surface-hover rounded w-1/4" />
          <div className="propeller-product-info__skeleton-line h-8 bg-surface-hover rounded w-3/4" />
        </div>
      ) : null}
      {!loading || !!props.product ? (
        <>
          {props.showSku !== false && !!getProductSku() ? (
            <div className="text-sm font-mono text-muted-foreground mb-2">
              SKU: {getProductSku()}
            </div>
          ) : null}
          {props.showTitle !== false && !!getProductName() ? (
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
              {getProductName()}
            </h1>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default ProductInfo;
