'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  GraphQLClient,
  ProductService,
  CrossupsellService,
  Product,
  Cluster,
  Contact,
  Customer,
  Cart,
  CartMainItem,
  Enums,
  CrossupsellsQueryVariables,
  Crossupsell,
} from 'propeller-sdk-v2';
import ProductCard from './ProductCard';
import ClusterCard from './ClusterCard';

export interface ProductSliderProps {
  // === Data source ===

  /** Propeller SDK GraphQL client */
  graphqlClient: GraphQLClient;

  /** Pre-loaded products or clusters to display. When provided, skips internal fetching. */
  products?: (Product | Cluster)[];

  /** Product IDs to fetch internally when `products` is not provided */
  productIds?: number[];

  /** Cluster IDs to fetch internally when `products` is not provided */
  clusterIds?: number[];

  /**
   * Cross-upsell types to fetch. When provided, fetches cross-upsells for the given
   * productId/clusterId instead of fetching products by IDs.
   * Values: 'ACCESSORIES' | 'ALTERNATIVES' | 'RELATED' | 'OPTIONS' | 'PARTS'
   */
  crossUpsellTypes?: Enums.CrossupsellType[];

  /** Source product ID for cross-upsell lookup. Required when crossUpsellTypes is set. */
  productId?: number;

  /** Source cluster ID for cross-upsell lookup. Required when crossUpsellTypes is set. */
  clusterId?: number;

  // === Locale / pricing ===

  /** Language code for API requests and localized content */
  language: string;

  /** Tax zone for price calculations */
  taxZone: string;

  /**
   * When true, net price (incl. tax) is the leading price.
   * Forwarded to each ProductCard / ClusterCard.
   */
  includeTax?: boolean;

  // === Portal / visibility ===

  /**
   * Controls portal visibility mode.
   * 'open' — AddToCart is shown on product cards.
   * 'semi-closed' — AddToCart is hidden (catalog-only view).
   * Defaults to 'open'.
   */
  portalMode?: string;

  /** Authenticated user for cart operations */
  user?: Contact | Customer | null;

  /**
   * Active company ID from the company switcher.
   * Overrides the user's default company for price calculation in cross-upsell fetches  * and is forwarded to each embedded ProductCard / AddToCart.  * Triggers a re-fetch when changed.  */ companyId?: number;
  /* === Layout === */ /** Items visible per breakpoint */ itemsPerView?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Slider title displayed above the track */ title?: string;
  /** Additional CSS class for the outer container */ containerClassName?: string;
  /* === Card stock display === */ /**  * Show the stock / availability widget on each product card.  * Forwarded to `ProductCard.showStock`.  * Defaults to false.  */ showStock?: boolean;
  /**  * Show only the availability indicator (Available / Not available) inside the stock widget.  * Forwarded to `ProductCard.showAvailability`.  * Defaults to true.  */ showAvailability?: boolean;
  /**  * Label overrides forwarded to the embedded ItemStock component inside each card.  * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces  */ stockLabels?: Record<
    string,
    string
  >;
  /* === Card favourites === */ /** Show a heart-icon favourite toggle on each card. Defaults to false. */ enableAddFavorite?: boolean;
  /**  * Called when a favourite is toggled on any card.  * Receives the full Product or Cluster object and the new favourite state.  */ onToggleFavorite?: (
    item: Product | Cluster,
    isFavorite: boolean
  ) => void;
  /* === Card navigation === */ /** Called when a product card is clicked — use for SPA-style routing. */ onProductClick?: (
    product: Product
  ) => void;
  /** Called when a cluster card is clicked — use for SPA-style routing. */ onClusterClick?: (
    cluster: Cluster
  ) => void;
  /* === AddToCart pass-through === */ /** Validate stock before adding to cart. Defaults to false. */ stockValidation?: boolean;
  /** Show increment/decrement stepper buttons in AddToCart. Defaults to true. */ showIncrDecr?: boolean;
  /** ID of an existing cart to add items to. */ cartId?: string;
  /** Auto-create a cart when none is available. Pair with onCartCreated. */ createCart?: boolean;
  /** Called after AddToCart creates a new cart internally. */ onCartCreated?: (cart: Cart) => void;
  /** Called after every successful add-to-cart. Receives the updated cart and the added item. */ afterAddToCart?: (
    cart: Cart,
    item?: CartMainItem
  ) => void;
  /**  * When true, AddToCart shows a success modal instead of a toast.  * Defaults to false.  */ showModal?: boolean;
  /** Called when "Proceed to checkout" is clicked in the AddToCart modal. */ onProceedToCheckout?: () => void;
  /**  * Label overrides forwarded to the embedded AddToCart component.  * Keys: add, adding, addedToCart, outOfStock, noCartId, errorAdding,  *       modalTitle, quantity, continueShopping, proceedToCheckout  */ addToCartLabels?: Record<
    string,
    string
  >;
  /* === Misc === */ /** Configuration object providing imageSearchFiltersGrid, imageVariantFiltersMedium, urls */ configuration?: any;
  /**  * Label overrides for the slider UI.  * Available keys: scrollLeft, scrollRight, noProducts, viewCluster,  *                 ACCESSORIES, ALTERNATIVES, RELATED, OPTIONS, PARTS  */ labels?: Record<
    string,
    string
  >;
}
interface ProductSliderState {
  loadedItems: any[];
  isLoading: boolean;
  scrollPosition: number;
  containerWidth: number;
  scrollWidth: number;
  items: () => (Product | Cluster)[];
  isCrossUpsellMode: () => boolean;
  crossUpsellTitle: () => string;
  sliderTitle: () => string | undefined;
  mobileCount: () => number;
  tabletCount: () => number;
  desktopCount: () => number;
  canScrollLeft: () => boolean;
  canScrollRight: () => boolean;
  portalMode: () => string;
  getLabel: (key: string, fallback: string) => string;
  isCluster: (item: any) => boolean;
  getItemId: (item: any) => number;
  fetchCrossUpsells: () => Promise<void>;
  fetchItems: () => Promise<void>;
  doFetch: () => void;
  sliderId: string;
  scrollLeft: () => void;
  scrollRight: () => void;
  getTrackEl: () => HTMLElement | null;
  handleScroll: (e: any) => void;
  handleProductClick: (product: Product) => void;
  handleClusterClick: (cluster: Cluster) => void;
}
function ProductSlider(props: ProductSliderProps) {
  const [loadedItems, setLoadedItems] = useState<ProductSliderState['loadedItems']>(() => []);
  const [isLoading, setIsLoading] = useState<ProductSliderState['isLoading']>(() => false);
  const [scrollPosition, setScrollPosition] = useState<ProductSliderState['scrollPosition']>(
    () => 0
  );
  const [containerWidth, setContainerWidth] = useState<ProductSliderState['containerWidth']>(
    () => 0
  );
  const [scrollWidth, setScrollWidth] = useState<ProductSliderState['scrollWidth']>(() => 0);
  const [sliderId, setSliderId] = useState<ProductSliderState['sliderId']>(() => '');
  function items(): ReturnType<ProductSliderState['items']> {
    if (props.products && props.products.length > 0) {
      return props.products;
    }
    return loadedItems;
  }
  function isCrossUpsellMode(): ReturnType<ProductSliderState['isCrossUpsellMode']> {
    return !!(props.crossUpsellTypes && props.crossUpsellTypes.length > 0);
  }
  function crossUpsellTitle(): ReturnType<ProductSliderState['crossUpsellTitle']> {
    if (!props.crossUpsellTypes || props.crossUpsellTypes.length === 0) return '';
    const typeLabels: Record<string, string> = {
      ACCESSORIES: 'Accessories',
      ALTERNATIVES: 'Alternatives',
      RELATED: 'Related products',
      OPTIONS: 'Options',
      PARTS: 'Parts',
    };
    return props.crossUpsellTypes
      .map((t: string) => props.labels?.[t.toLowerCase()] || typeLabels[t] || t)
      .join(' & ');
  }
  function sliderTitle(): ReturnType<ProductSliderState['sliderTitle']> {
    if (props.title !== undefined) return props.title;
    if (isCrossUpsellMode()) return crossUpsellTitle();
    return undefined;
  }
  function mobileCount(): ReturnType<ProductSliderState['mobileCount']> {
    return props.itemsPerView?.mobile || 1;
  }
  function tabletCount(): ReturnType<ProductSliderState['tabletCount']> {
    return props.itemsPerView?.tablet || 2;
  }
  function desktopCount(): ReturnType<ProductSliderState['desktopCount']> {
    return props.itemsPerView?.desktop || 4;
  }
  function canScrollLeft(): ReturnType<ProductSliderState['canScrollLeft']> {
    return scrollPosition > 0;
  }
  function canScrollRight(): ReturnType<ProductSliderState['canScrollRight']> {
    return scrollPosition < scrollWidth - containerWidth - 1;
  }
  function portalMode(): ReturnType<ProductSliderState['portalMode']> {
    return (props.portalMode as string) || 'open';
  }
  function getLabel(key: string, fallback: string): ReturnType<ProductSliderState['getLabel']> {
    const val = (props.labels as Record<string, string>)?.[key];
    return val !== undefined ? val : fallback;
  }
  function isCluster(item: any): ReturnType<ProductSliderState['isCluster']> {
    return 'clusterId' in item && !('productId' in item);
  }
  function getItemId(item: any): ReturnType<ProductSliderState['getItemId']> {
    return isCluster(item) ? item.clusterId : item.productId;
  }
  async function fetchCrossUpsells(): ReturnType<ProductSliderState['fetchCrossUpsells']> {
    if (!props.graphqlClient) return;
    if (!props.crossUpsellTypes || props.crossUpsellTypes.length === 0) return;
    if (!props.productId && !props.clusterId) return;
    setIsLoading(true);
    try {
      const crossupsellService = new CrossupsellService(props.graphqlClient);
      const searchInput: CrossupsellsQueryVariables = {
        input: {
          types: props.crossUpsellTypes,
          page: 1,
          offset: 50,
          ...(props.productId && { productIdsFrom: [props.productId] }),
          ...(props.clusterId && { clusterIdsFrom: [props.clusterId] }),
        },
        language: props.language || 'NL',
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersMedium,
        priceCalculateProductInput: {
          taxZone: props.taxZone || 'NL',
          ...(props.companyId && { companyId: props.companyId }),
          ...(props.user &&
            'contactId' in props.user && { contactId: (props.user as Contact)?.contactId }),
          ...(props.user &&
            'customerId' in props.user && { customerId: (props.user as Customer)?.customerId }),
        },
      };
      const result = await crossupsellService.getCrossupsells(searchInput);
      const crossupsells: Crossupsell[] = result?.items || [];
      const items: any[] = [];
      for (let i = 0; i < crossupsells.length; i++) {
        const cu = crossupsells[i] as Crossupsell;
        if (cu.productTo) {
          items.push(cu.productTo);
        } else if (cu.clusterTo) {
          items.push(cu.clusterTo);
        }
      }
      setLoadedItems(items);
    } catch (e) {
      setLoadedItems([]);
    } finally {
      setIsLoading(false);
    }
  }
  async function fetchItems(): ReturnType<ProductSliderState['fetchItems']> {
    if (!props.graphqlClient) return;
    const hasProductIds = props.productIds && props.productIds.length > 0;
    const hasClusterIds = props.clusterIds && props.clusterIds.length > 0;
    if (!hasProductIds && !hasClusterIds) return;
    setIsLoading(true);
    try {
      const productService = new ProductService(props.graphqlClient);
      const response = await productService.getProducts({
        input: {
          productIds: props.productIds || [],
          clusterIds: props.clusterIds || [],
          language: props.language || 'NL',
          page: 1,
          offset: 50,
          statuses: [
            Enums.ProductStatus.A,
            Enums.ProductStatus.P,
            Enums.ProductStatus.T,
            Enums.ProductStatus.S,
          ],
        },
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid || { page: 1, offset: 1 },
        imageVariantFilters: props.configuration?.imageVariantFiltersMedium || {
          transformations: [
            {
              name: 'grid',
              transformation: {
                format: Enums.Format.WEBP,
                height: 300,
                width: 300,
                fit: Enums.Fit.BOUNDS,
              },
            },
          ],
        },
        filterAvailableAttributeInput: { isSearchable: true },
      });
      setLoadedItems(response.items || []);
    } catch (e) {
      setLoadedItems([]);
    } finally {
      setIsLoading(false);
    }
  }
  function doFetch(): ReturnType<ProductSliderState['doFetch']> {
    if (props.products && props.products.length > 0) return;
    if (isCrossUpsellMode()) {
      fetchCrossUpsells();
    } else {
      fetchItems();
    }
  }
  function getTrackEl(): ReturnType<ProductSliderState['getTrackEl']> {
    return document.querySelector(`[data-slider-id="${sliderId}"]`) as HTMLElement | null;
  }
  function scrollLeft(): ReturnType<ProductSliderState['scrollLeft']> {
    const el = getTrackEl();
    if (el) {
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
  }
  function scrollRight(): ReturnType<ProductSliderState['scrollRight']> {
    const el = getTrackEl();
    if (el) {
      const scrollAmount = el.clientWidth * 0.8;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
  function handleScroll(e: any): ReturnType<ProductSliderState['handleScroll']> {
    const el = e.target as HTMLElement;
    setScrollPosition(el.scrollLeft);
    setContainerWidth(el.clientWidth);
    setScrollWidth(el.scrollWidth);
  }
  function handleProductClick(
    product: Product
  ): ReturnType<ProductSliderState['handleProductClick']> {
    if (props.onProductClick) {
      props.onProductClick(product);
    }
  }
  function handleClusterClick(
    cluster: Cluster
  ): ReturnType<ProductSliderState['handleClusterClick']> {
    if (props.onClusterClick) {
      props.onClusterClick(cluster);
    }
  }
  useEffect(() => {
    setSliderId('slider-' + Math.random().toString(36).substring(2, 9));
  }, []);
  useEffect(() => {
    doFetch(); /* NOTE: arrays compared by value to avoid stale-reference refetches */
  }, [
    JSON.stringify(props.productIds),
    JSON.stringify(props.clusterIds),
    JSON.stringify(props.crossUpsellTypes),
    props.productId,
    props.clusterId,
    props.language,
    props.companyId,
  ]);
  useEffect(() => {
    /* Initialize scroll dimensions once sliderId is set and items are rendered */ if (
      sliderId &&
      items().length > 0
    ) {
      setTimeout(() => {
        const el = getTrackEl();
        if (el) {
          setContainerWidth(el.clientWidth);
          setScrollWidth(el.scrollWidth);
        }
      }, 50);
    }
  }, [sliderId, items().length]);
  return (
    <>
      {' '}
      {!(isCrossUpsellMode() && !isLoading && items().length === 0) ? (
        <>
          <div className={props.containerClassName || 'mb-12'}>
            {sliderTitle() || items().length > 0 ? (
              <div className="flex items-center justify-between mb-6">
                {sliderTitle() ? <h2 className="text-2xl font-bold">{sliderTitle()}</h2> : null}
                {items().length > desktopCount() ? (
                  <div className="flex gap-2">
                    <button
                      className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={(event) => scrollLeft()}
                      disabled={!canScrollLeft()}
                      aria-label={getLabel('scrollLeft', 'Scroll left')}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      onClick={(event) => scrollRight()}
                      disabled={!canScrollRight()}
                      aria-label={getLabel('scrollRight', 'Scroll right')}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {isLoading ? (
              <div className="flex gap-6 overflow-hidden">
                <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
              </div>
            ) : null}
            {!isLoading && items().length > 0 ? (
              <div
                className="flex gap-6 overflow-x-auto scroll-smooth pb-4"
                data-slider-id={sliderId}
                onScroll={(e) => handleScroll(e)}
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {items()?.map((item, index) => (
                  <div
                    className="flex-shrink-0 w-[calc((100%_-_1.5rem)_/_1.5)] md:w-[calc((100%_-_3rem)_/_2.5)] lg:w-[calc((100%_-_4.5rem)_/_4)]"
                    key={getItemId(item) + '-' + index}
                  >
                    {isCluster(item) ? (
                      <ClusterCard
                        cluster={item as Cluster}
                        configuration={props.configuration}
                        includeTax={props.includeTax}
                        language={props.language}
                        columns={3}
                        enableAddFavorite={props.enableAddFavorite}
                        showStock={props.showStock}
                        showAvailability={props.showAvailability}
                        stockLabels={props.stockLabels}
                        labels={props.labels}
                        onToggleFavorite={(cluster, isFav) => {
                          if (props.onToggleFavorite) {
                            props.onToggleFavorite(cluster, isFav);
                          }
                        }}
                        onClusterClick={(cluster) => handleClusterClick(cluster)}
                      />
                    ) : null}
                    {!isCluster(item) && portalMode() === 'open' ? (
                      <ProductCard
                        product={item as Product}
                        graphqlClient={props.graphqlClient}
                        user={(props.user as Contact | Customer | null) || null}
                        companyId={props.companyId as number}
                        cartId={props.cartId}
                        configuration={props.configuration}
                        includeTax={props.includeTax}
                        columns={3}
                        createCart={props.createCart}
                        onCartCreated={props.onCartCreated}
                        afterAddToCart={props.afterAddToCart}
                        showModal={props.showModal}
                        allowIncrDecr={props.showIncrDecr !== false}
                        enableStockValidation={props.stockValidation}
                        language={props.language}
                        onProceedToCheckout={props.onProceedToCheckout}
                        addToCartLabels={props.addToCartLabels}
                        enableAddFavorite={props.enableAddFavorite}
                        showStock={props.showStock}
                        showAvailability={props.showAvailability}
                        stockLabels={props.stockLabels}
                        labels={props.labels}
                        onToggleFavorite={(product, isFav) => {
                          if (props.onToggleFavorite) {
                            props.onToggleFavorite(product, isFav);
                          }
                        }}
                        onProductClick={(product) => handleProductClick(product)}
                      />
                    ) : null}
                    {!isCluster(item) && portalMode() !== 'open' ? (
                      <ProductCard
                        product={item as Product}
                        graphqlClient={props.graphqlClient}
                        user={(props.user as Contact | Customer | null) || null}
                        companyId={props.companyId as number}
                        configuration={props.configuration}
                        includeTax={props.includeTax}
                        language={props.language}
                        columns={3}
                        enableAddFavorite={props.enableAddFavorite}
                        showStock={props.showStock}
                        showAvailability={props.showAvailability}
                        stockLabels={props.stockLabels}
                        labels={props.labels}
                        onToggleFavorite={(product, isFav) => {
                          if (props.onToggleFavorite) {
                            props.onToggleFavorite(product, isFav);
                          }
                        }}
                        onProductClick={(product) => handleProductClick(product)}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {!isLoading && items().length === 0 && !props.products && !isCrossUpsellMode() ? (
              <div className="text-center text-gray-500 py-8">
                {getLabel('noProducts', 'No products found')}
              </div>
            ) : null}
          </div>
        </>
      ) : null}{' '}
    </>
  );
}
export default ProductSlider;
