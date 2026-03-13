'use client';
import * as React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { GraphQLClient, ProductService, Product, Cluster, Contact, Customer, Cart, CartMainItem, Enums } from 'propeller-sdk-v2';
import ProductCard from '@/components/propeller/ProductCard';
import ClusterCard from '@/components/propeller/ClusterCard';

export interface ProductSliderProps {
  /** Propeller SDK GraphQL client */
  graphqlClient: GraphQLClient;

  /** Pre-loaded products or clusters to display. When provided, skips internal fetching. */
  products?: (Product | Cluster)[];

  /** Product IDs to fetch internally when `products` is not provided */
  productIds?: number[];

  /** Cluster IDs to fetch internally when `products` is not provided */
  clusterIds?: number[];

  /** Language code for API requests and localized content */
  language: string;

  /** Tax zone for price calculations */
  taxZone: string;

  /** Portal mode controlling add-to-cart visibility */
  portalMode?: string;

  /** Authenticated user for cart operations */
  user?: Contact | Customer | null;

  /** When true, show tax-inclusive prices */
  includeTax?: boolean;

  /** Validate stock before adding to cart */
  stockValidation?: boolean;

  /** Show increment/decrement buttons on add-to-cart */
  showIncrDecr?: boolean;

  /** Items visible per breakpoint */
  itemsPerView?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };

  /** Slider title */
  title?: string;

  /** Fallback image URL when product has no image */
  noImageUrl?: string;

  /** ID of an existing cart */
  cartId?: string;

  /** Auto-create cart if none exists */
  createCart?: boolean;

  /** Called after a new cart is created */
  onCartCreated?: (cart: Cart) => void;

  /** Called after successful add-to-cart */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /** Called when a product card is clicked */
  onProductClick?: (product: Product) => void;

  /** Called when a cluster card is clicked */
  onClusterClick?: (cluster: Cluster) => void;

  /** URL pattern for product links */
  urlPattern?: string;

  /** Configuration object for cards */
  configuration?: any;

  /** Labels for UI strings */
  labels?: Record<string, string>;

  /** Additional CSS class for the container */
  containerClassName?: string;
}

function ProductSlider(props: ProductSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [_items, set_items] = useState<any[]>([]);
  const [_isLoading, set_isLoading] = useState(false);
  const [_scrollPosition, set_scrollPosition] = useState(0);
  const [_containerWidth, set_containerWidth] = useState(0);
  const [_scrollWidth, set_scrollWidth] = useState(0);

  function items() {
    if (props.products && props.products.length > 0) {
      return props.products;
    }
    return _items;
  }

  const desktopCount = props.itemsPerView?.desktop || 4;

  function canScrollLeft() {
    return _scrollPosition > 0;
  }

  function canScrollRight() {
    return _scrollPosition < _scrollWidth - _containerWidth - 1;
  }

  function getLabel(key: string, fallback: string) {
    return props.labels?.[key] || fallback;
  }

  function isCluster(item: any) {
    return 'clusterId' in item;
  }

  function getItemId(item: any) {
    return isCluster(item) ? item.clusterId : item.productId;
  }

  const updateScrollDimensions = useCallback(() => {
    const el = trackRef.current;
    if (el) {
      set_containerWidth(el.clientWidth);
      set_scrollWidth(el.scrollWidth);
    }
  }, []);

  async function fetchItems() {
    if (!props.graphqlClient) return;
    const hasProductIds = props.productIds && props.productIds.length > 0;
    const hasClusterIds = props.clusterIds && props.clusterIds.length > 0;
    if (!hasProductIds && !hasClusterIds) return;
    set_isLoading(true);
    try {
      const productService = new ProductService(props.graphqlClient);
      const response = await productService.getProducts({
        input: {
          productIds: props.productIds || [],
          clusterIds: props.clusterIds || [],
          language: props.language || 'NL',
          page: 1,
          offset: 50,
        },
        imageSearchFilters: { page: 1, offset: 1 },
        imageVariantFilters: {
          transformations: [{
            name: 'grid',
            transformation: {
              format: Enums.Format.WEBP,
              height: 300,
              width: 300,
              fit: Enums.Fit.BOUNDS,
            },
          }],
        },
        filterAvailableAttributeInput: { isSearchable: true },
      });
      set_items(response.items || []);
    } catch (e) {
      set_items([]);
    } finally {
      set_isLoading(false);
    }
  }

  function scrollLeft() {
    const el = trackRef.current;
    if (el) {
      el.scrollBy({ left: -(el.clientWidth * 0.8), behavior: 'smooth' });
    }
  }

  function scrollRight() {
    const el = trackRef.current;
    if (el) {
      el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' });
    }
  }

  function handleScroll(e: any) {
    const el = e.target as HTMLElement;
    set_scrollPosition(el.scrollLeft);
    set_containerWidth(el.clientWidth);
    set_scrollWidth(el.scrollWidth);
  }

  // Fetch items on mount
  useEffect(() => {
    if (!props.products || props.products.length === 0) {
      fetchItems();
    }
  }, []);

  // Re-fetch when IDs change
  useEffect(() => {
    if (!props.products || props.products.length === 0) {
      fetchItems();
    }
  }, [props.productIds, props.clusterIds]);

  // Update scroll dimensions after items change (loaded or passed via props)
  useEffect(() => {
    // Wait for DOM to render the new items
    const timer = setTimeout(updateScrollDimensions, 50);
    return () => clearTimeout(timer);
  }, [_items, props.products, updateScrollDimensions]);

  // Also update on window resize
  useEffect(() => {
    window.addEventListener('resize', updateScrollDimensions);
    return () => window.removeEventListener('resize', updateScrollDimensions);
  }, [updateScrollDimensions]);

  const currentItems = items();
  const gapRem = 1.5; // gap-6 = 1.5rem
  const totalGapRem = (desktopCount - 1) * gapRem;
  const cardWidth = `calc((100% - ${totalGapRem}rem) / ${desktopCount})`;

  return (
    <div className={props.containerClassName || 'mb-12'}>
      {/* Header with title and navigation arrows */}
      {(props.title || currentItems.length > 0) && (
        <div className="flex items-center justify-between mb-6">
          {props.title && <h2 className="text-2xl font-bold">{props.title}</h2>}

          {currentItems.length > desktopCount && (
            <div className="flex gap-2">
              <button
                onClick={scrollLeft}
                disabled={!canScrollLeft()}
                className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={getLabel('scrollLeft', 'Scroll left')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={scrollRight}
                disabled={!canScrollRight()}
                className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={getLabel('scrollRight', 'Scroll right')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {_isLoading && (
        <div className="flex gap-6 overflow-hidden">
          {Array.from({ length: desktopCount }).map((_, i) => (
            <div key={i} className="flex-shrink-0 h-80 bg-gray-100 rounded-lg animate-pulse" style={{ width: cardWidth }} />
          ))}
        </div>
      )}

      {/* Slider track */}
      {!_isLoading && currentItems.length > 0 && (
        <div
          ref={trackRef}
          data-product-slider-track
          onScroll={handleScroll}
          className="flex gap-6 overflow-x-auto scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {currentItems.map((item, index) => (
            <div
              key={getItemId(item) + '-' + index}
              className="flex-shrink-0"
              style={{ width: cardWidth }}
            >
              {isCluster(item) ? (
                <ClusterCard
                  cluster={item as Cluster}
                  onClusterClick={props.onClusterClick}
                  showStock={true}
                  configuration={props.configuration}
                  labels={props.labels}
                />
              ) : (
                <ProductCard
                  product={item as Product}
                  graphqlClient={props.graphqlClient}
                  user={props.user || null}
                  onProductClick={props.onProductClick}
                  cartId={props.cartId}
                  createCart={props.createCart}
                  onCartCreated={props.onCartCreated}
                  afterAddToCart={props.afterAddToCart}
                  showStock={true}
                  showAvailability={true}
                  allowIncrDecr={props.showIncrDecr !== undefined ? props.showIncrDecr : true}
                  enableStockValidation={props.stockValidation}
                  urlPattern={props.urlPattern}
                  configuration={props.configuration}
                  labels={props.labels}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!_isLoading && currentItems.length === 0 && !props.products && (
        <div className="text-center text-gray-500 py-8">
          {getLabel('noProducts', 'No products found')}
        </div>
      )}
    </div>
  );
}

export default ProductSlider;
