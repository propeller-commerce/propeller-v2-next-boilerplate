'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient, ProductService, CrossupsellService, Product, Cluster, Contact, Customer, Cart, CartMainItem, Enums, CrossupsellSearchInput, CrossupsellsQueryVariables, Crossupsell } from 'propeller-sdk-v2';



  export interface ProductSliderProps {
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
interface ProductSliderState {
_items: any[];
_isLoading: boolean;
_scrollPosition: number;
_containerWidth: number;
_scrollWidth: number;
_includeTax: boolean;
_priceListener: any;
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
includeTax: () => boolean;
showIncrDecr: () => boolean;
stockValidation: () => boolean;
getLabel: (key: string, fallback: string) => string;
isCluster: (item: any) => boolean;
getItemId: (item: any) => number;
fetchCrossUpsells: () => Promise<void>;
fetchItems: () => Promise<void>;
doFetch: () => void;
scrollLeft: () => void;
scrollRight: () => void;
handleScroll: (e: any) => void;
handleProductClick: (product: Product) => void;
handleClusterClick: (cluster: Cluster) => void;
}




  function ProductSlider(props:ProductSliderProps) {

  const [_items, set_items] = useState<ProductSliderState["_items"]>(() => ([]))


const [_isLoading, set_isLoading] = useState<ProductSliderState["_isLoading"]>(() => (false))


const [_scrollPosition, set_scrollPosition] = useState<ProductSliderState["_scrollPosition"]>(() => (0))


const [_containerWidth, set_containerWidth] = useState<ProductSliderState["_containerWidth"]>(() => (0))


const [_scrollWidth, set_scrollWidth] = useState<ProductSliderState["_scrollWidth"]>(() => (0))


const [_includeTax, set_includeTax] = useState<ProductSliderState["_includeTax"]>(() => (true))


const [_priceListener, set_priceListener] = useState<ProductSliderState["_priceListener"]>(() => (null))


function items(): ReturnType<ProductSliderState["items"]>{
if (props.products && props.products.length > 0) {
return props.products;
}
return _items;
}


function isCrossUpsellMode(): ReturnType<ProductSliderState["isCrossUpsellMode"]>{
return !!(props.crossUpsellTypes && props.crossUpsellTypes.length > 0);
}


function crossUpsellTitle(): ReturnType<ProductSliderState["crossUpsellTitle"]>{
if (!props.crossUpsellTypes || props.crossUpsellTypes.length === 0) return '';
const typeLabels: Record<string, string> = {
ACCESSORIES: 'Accessories',
ALTERNATIVES: 'Alternatives',
RELATED: 'Related products',
OPTIONS: 'Options',
PARTS: 'Parts'
};
return props.crossUpsellTypes.map((t: string) => props.labels?.[t.toLowerCase()] || typeLabels[t] || t).join(' & ');
}


function sliderTitle(): ReturnType<ProductSliderState["sliderTitle"]>{
if (props.title !== undefined) return props.title;
if (isCrossUpsellMode()) return crossUpsellTitle();
return undefined;
}


function mobileCount(): ReturnType<ProductSliderState["mobileCount"]>{
return props.itemsPerView?.mobile || 1;
}


function tabletCount(): ReturnType<ProductSliderState["tabletCount"]>{
return props.itemsPerView?.tablet || 2;
}


function desktopCount(): ReturnType<ProductSliderState["desktopCount"]>{
return props.itemsPerView?.desktop || 4;
}


function canScrollLeft(): ReturnType<ProductSliderState["canScrollLeft"]>{
return _scrollPosition > 0;
}


function canScrollRight(): ReturnType<ProductSliderState["canScrollRight"]>{
return _scrollPosition < _scrollWidth - _containerWidth - 1;
}


function portalMode(): ReturnType<ProductSliderState["portalMode"]>{
return props.portalMode || 'open';
}


function includeTax(): ReturnType<ProductSliderState["includeTax"]>{
return props.includeTax !== undefined ? props.includeTax : _includeTax;
}


function showIncrDecr(): ReturnType<ProductSliderState["showIncrDecr"]>{
return props.showIncrDecr !== undefined ? props.showIncrDecr : true;
}


function stockValidation(): ReturnType<ProductSliderState["stockValidation"]>{
return props.stockValidation !== undefined ? props.stockValidation : false;
}


function getLabel(key: string, fallback: string): ReturnType<ProductSliderState["getLabel"]>{
return props.labels?.[key] || fallback;
}


function isCluster(item: any): ReturnType<ProductSliderState["isCluster"]>{
return 'clusterId' in item;
}


function getItemId(item: any): ReturnType<ProductSliderState["getItemId"]>{
return isCluster(item) ? item.clusterId : item.productId;
}


async function fetchCrossUpsells(): ReturnType<ProductSliderState["fetchCrossUpsells"]>{
if (!props.graphqlClient) return;
if (!props.crossUpsellTypes || props.crossUpsellTypes.length === 0) return;
if (!props.productId && !props.clusterId) return;
set_isLoading(true);
try {
const crossupsellService = new CrossupsellService(props.graphqlClient);
const searchInput: CrossupsellSearchInput = {
  types: props.crossUpsellTypes,
  page: 1,
  offset: 50,
  ...(props.productId && {
    productIdsFrom: [props.productId]
  }),
  ...(props.clusterId && {
    clusterIdsFrom: [props.clusterId]
  })
};
const crossupsellSearchVariables: CrossupsellsQueryVariables = {
  input: searchInput,
  language: props.language || 'NL',
  imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
  imageVariantFilters: props.configuration?.imageVariantFiltersMedium
};
const result = await (crossupsellService as any).executeQuery('crossupsells', crossupsellSearchVariables);
const crossupsells = result?.data?.crossupsells?.items || [] as Crossupsell[];
const items: Crossupsell[] = [];
for (let i = 0; i < crossupsells.length; i++) {
  const cu = crossupsells[i] as Crossupsell;
  if (cu.productTo) {
    items.push(cu);
  } else if (cu.clusterTo) {
    items.push(cu);
  }
}
set_items(items);
} catch (e) {
set_items([]);
} finally {
set_isLoading(false);
}
}


async function fetchItems(): ReturnType<ProductSliderState["fetchItems"]>{
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
    statuses: [Enums.ProductStatus.A, Enums.ProductStatus.P, Enums.ProductStatus.T, Enums.ProductStatus.S]
  },
  imageSearchFilters: {
    page: 1,
    offset: 1
  },
  imageVariantFilters: {
    transformations: [{
      name: 'grid',
      transformation: {
        format: Enums.Format.WEBP,
        height: 300,
        width: 300,
        fit: Enums.Fit.BOUNDS
      }
    }]
  },
  filterAvailableAttributeInput: {
    isSearchable: true
  }
});
set_items(response.items || []);
} catch (e) {
set_items([]);
} finally {
set_isLoading(false);
}
}


function doFetch(): ReturnType<ProductSliderState["doFetch"]>{
if (props.products && props.products.length > 0) return;
if (isCrossUpsellMode()) {
fetchCrossUpsells();
} else {
fetchItems();
}
}


function scrollLeft(): ReturnType<ProductSliderState["scrollLeft"]>{
const el = document.querySelector('[data-product-slider-track]') as HTMLElement;
if (el) {
const scrollAmount = el.clientWidth * 0.8;
el.scrollBy({
  left: -scrollAmount,
  behavior: 'smooth'
});
}
}


function scrollRight(): ReturnType<ProductSliderState["scrollRight"]>{
const el = document.querySelector('[data-product-slider-track]') as HTMLElement;
if (el) {
const scrollAmount = el.clientWidth * 0.8;
el.scrollBy({
  left: scrollAmount,
  behavior: 'smooth'
});
}
}


function handleScroll(e: any): ReturnType<ProductSliderState["handleScroll"]>{
const el = e.target as HTMLElement;
set_scrollPosition(el.scrollLeft);
set_containerWidth(el.clientWidth);
set_scrollWidth(el.scrollWidth);
}


function handleProductClick(product: Product): ReturnType<ProductSliderState["handleProductClick"]>{
if (props.onProductClick) {
props.onProductClick(product);
}
}


function handleClusterClick(cluster: Cluster): ReturnType<ProductSliderState["handleClusterClick"]>{
if (props.onClusterClick) {
props.onClusterClick(cluster);
}
}







useEffect(() => {
      doFetch();

// Initialize scroll dimensions after render
setTimeout(() => {
const el = document.querySelector('[data-product-slider-track]') as HTMLElement;
if (el) {
set_containerWidth(el.clientWidth);
set_scrollWidth(el.scrollWidth);
}
}, 100);

// Price toggle listener
if (typeof window !== 'undefined') {
const stored = localStorage.getItem('price_include_tax');
set_includeTax(stored === null ? true : stored === 'true');
set_priceListener(() => {
const val = localStorage.getItem('price_include_tax');
set_includeTax(val === null ? true : val === 'true');
});
window.addEventListener('priceToggleChanged', _priceListener);
}
    }, [])
useEffect(() => {
      doFetch()
    },
    [props.productIds, props.clusterIds]);useEffect(() => {
      doFetch()
    },
    [props.crossUpsellTypes, props.productId, props.clusterId])


return (
  <>

  {!(isCrossUpsellMode() && !_isLoading && items().length === 0) ? (
  <><div  className={props.containerClassName || 'mb-12'}>{sliderTitle() || items().length > 0 ? (
  <div className="flex items-center justify-between mb-6">{sliderTitle() ? (
  <h2 className="text-2xl font-bold">{sliderTitle()}</h2>
) : null}{items().length > desktopCount() ? (
  <div className="flex gap-2"><button className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"  onClick={(event) => scrollLeft() }  disabled={!canScrollLeft()}  aria-label={getLabel('scrollLeft', 'Scroll left')}><svg  fill="none"  stroke="currentColor"  viewBox="0 0 24 24"  strokeWidth="2"  strokeLinecap="round"  strokeLinejoin="round" className="w-5 h-5"><path  d="M15 19l-7-7 7-7"  /></svg></button><button className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"  onClick={(event) => scrollRight() }  disabled={!canScrollRight()}  aria-label={getLabel('scrollRight', 'Scroll right')}><svg  fill="none"  stroke="currentColor"  viewBox="0 0 24 24"  strokeWidth="2"  strokeLinecap="round"  strokeLinejoin="round" className="w-5 h-5"><path  d="M9 5l7 7-7 7"  /></svg></button></div>
) : null}</div>
) : null}{_isLoading ? (
  <div className="flex gap-6 overflow-hidden"><div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse"  /><div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse"  /><div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse"  /><div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse"  /></div>
) : null}{!_isLoading && items().length > 0 ? (
  <div className="flex gap-6 overflow-x-auto scroll-smooth pb-4"  data-product-slider-track  onScroll={(e) => handleScroll(e) }  style={{
scrollbarWidth: 'none',
msOverflowStyle: 'none'
}}>{items()?.map((item, index) => (
  <div className="flex-shrink-0"  key={getItemId(item) + '-' + index}  style={{
width: 'calc((100% - 4.5rem) / ' + desktopCount() + ')'
}}>{isCluster(item) ? (
  <div className="cursor-pointer"  onClick={(event) => handleClusterClick(item as Cluster) }><div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"><div className="relative aspect-square bg-gray-50">{(item as Cluster).defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl ? (
  <img className="w-full h-full object-contain p-2"  src={(item as Cluster).defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl || ''}  alt={item.names?.[0]?.value || 'Cluster'}  />
) : null}</div><div className="p-3"><div className="font-semibold text-sm truncate">{item.names?.[0]?.value || 'Cluster'}</div>{item.sku || (item as Cluster).defaultProduct?.sku ? (
  <div className="text-xs text-gray-500 mt-1">SKU: {item.sku || (item as Cluster).defaultProduct?.sku}</div>
) : null}{(item as Cluster).defaultProduct?.price ? (
  <div className="text-sm font-bold text-blue-600 mt-2">{'\u20AC' + Number(includeTax() ? (item as Cluster).defaultProduct?.price?.net || 0 : (item as Cluster).defaultProduct?.price?.gross || 0).toFixed(2)}</div>
) : null}<div className="mt-2"><span className="text-xs text-blue-600 font-medium">{getLabel('viewCluster', 'View options')}</span></div></div></div></div>
) : null}{!isCluster(item) ? (
  <div className="cursor-pointer"  onClick={(event) => handleProductClick(item as Product) }><div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"><div className="relative aspect-square bg-gray-50">{(item as Product).media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl ? (
  <img className="w-full h-full object-contain p-2"  src={(item as Product).media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl || ''}  alt={item.names?.[0]?.value || 'Product'}  />
) : null}</div><div className="p-3"><div className="font-semibold text-sm truncate">{item.names?.[0]?.value || 'Product'}</div>{(item as Product).sku ? (
  <div className="text-xs text-gray-500 mt-1">SKU: {(item as Product).sku}</div>
) : null}{(item as Product).price ? (
  <div className="text-sm font-bold text-blue-600 mt-2">{'\u20AC' + Number(includeTax() ? (item as Product).price?.net || 0 : (item as Product).price?.gross || 0).toFixed(2)}</div>
) : null}</div></div></div>
) : null}</div>
))}</div>
) : null}{!_isLoading && items().length === 0 && !props.products && !isCrossUpsellMode() ? (
  <div className="text-center text-gray-500 py-8">{getLabel('noProducts', 'No products found')}</div>
) : null}</div></>
) : null}

  </>
);
}




  export default ProductSlider;


