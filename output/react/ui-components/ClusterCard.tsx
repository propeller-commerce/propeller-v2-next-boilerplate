'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { Cluster, AttributeResult } from 'propeller-sdk-v2';



  export interface ClusterCardProps {
// === Core ===

/** The cluster object to display */
cluster: Cluster;

// === Display toggles ===

/** Show the cluster name. Defaults to true. */
showName?: boolean;

/** Show the default product image. Defaults to true. */
showImage?: boolean;

/** Show the cluster short description. Defaults to false. */
showShortDescription?: boolean;

/**
 * Show the SKU. Displays the cluster SKU; falls back to the default product SKU
 * if the cluster SKU is empty. Defaults to true.
 */
showSku?: boolean;

/** Show the default product manufacturer. Defaults to false. */
showManufacturer?: boolean;

/**
 * Show default product stock information (quantity badge).
 * Reads `defaultProduct.inventory.totalQuantity`. Defaults to true.
 */
showStock?: boolean;

// === Attribute labels ===

/**
 * Attribute codes/names to look up on the default product and display as
 * badge overlays on the image. Resolved against
 * `defaultProduct.attributes.items[].attributeDescription.name`.
 * Attributes with no matching value are silently omitted.
 * Example: ['new', 'sale']
 */
imageLabels?: string[];

/**
 * Attribute codes/names to look up on the default product and display as
 * extra text rows below the cluster name. Resolved the same way as `imageLabels`.
 * Example: ['brand', 'color']
 */
textLabels?: string[];

// === Favourites ===

/** Renders a heart-icon toggle button on the cluster image. Defaults to false. */
enableAddFavorite?: boolean;

/**
 * Called whenever the favourite state is toggled.
 * The second argument indicates the new state: `true` = added, `false` = removed.
 */
onToggleFavorite?: (cluster: Cluster, isFavorite: boolean) => void;

// === Navigation ===

/**
 * Called when the cluster name, image, or "View cluster" button is clicked.
 * When provided, the default `<a>` navigation is prevented so the consumer
 * can use framework-specific routing (e.g. Next.js `router.push`).
 */
onClusterClick?: (cluster: Cluster) => void;

// === UI string overrides ===

/**
 * Override any UI string.
 * Available keys: addToFavorites, removeFromFavorites, viewCluster,
 *                 inStock, lowStock, outOfStock
 */
labels?: Record<string, string>;

// === Pricing ===

/**
 * When true, tax-inclusive price (net) is the leading price.
 * When false, tax-exclusive price (gross) is shown.
 * Defaults to false.
 */
includeTax?: boolean;

/** Number of grid columns — when 1 the card renders as a compact horizontal row. */
columns?: number;

/** Extra CSS class applied to the root element. */
className?: string;

/** Configuration object passed to the component */
configuration?: any;
}
interface ClusterCardState {
isFavorite: boolean;
_includeTax: boolean;
_priceListener: any;
isRow: () => boolean;
getClusterName: () => string;
getClusterSku: () => string;
getClusterImageUrl: () => string;
getClusterPrice: () => string;
getClusterUrl: () => string;
getClusterShortDescription: () => string;
getClusterManufacturer: () => string;
getStockQuantity: () => number;
getStockStatusLabel: () => string;
getStockStatusClass: () => string;
getLabel: (key: string, fallback: string) => string;
handleClusterClick: (e: any) => void;
handleToggleFavorite: (e: any) => void;
computedImageLabels: () => string[];
computedTextLabels: () => {
  name: string;
  value: string;
}[];
}




  function ClusterCard(props:ClusterCardProps) {

  const [isFavorite, setIsFavorite] = useState<ClusterCardState["isFavorite"]>(() => (false))


const [_includeTax, set_includeTax] = useState<ClusterCardState["_includeTax"]>(() => (false))


const [_priceListener, set_priceListener] = useState<ClusterCardState["_priceListener"]>(() => (null))


function isRow(): ReturnType<ClusterCardState["isRow"]>{
return props.columns as number === 1;
}


function getClusterName(): ReturnType<ClusterCardState["getClusterName"]>{
return (props.cluster as Cluster)?.names?.[0]?.value || (props.cluster as Cluster)?.defaultProduct?.names?.[0]?.value || 'Cluster';
}


function getClusterSku(): ReturnType<ClusterCardState["getClusterSku"]>{
return (props.cluster as Cluster)?.sku || (props.cluster as Cluster)?.defaultProduct?.sku || '';
}


function getClusterImageUrl(): ReturnType<ClusterCardState["getClusterImageUrl"]>{
return (props.cluster as Cluster)?.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}


function getClusterPrice(): ReturnType<ClusterCardState["getClusterPrice"]>{
const priceObj = (props.cluster as Cluster)?.defaultProduct?.price;
const useTax: boolean = props.includeTax !== undefined ? !!props.includeTax : _includeTax;
const value: number | undefined = useTax ? priceObj?.net : priceObj?.gross;
if (!value && value !== 0) return '';
return `\u20AC${Number(value).toFixed(2)}`;
}


function getClusterUrl(): ReturnType<ClusterCardState["getClusterUrl"]>{
return props.configuration.urls.getClusterUrl(props.cluster);
}


function getClusterShortDescription(): ReturnType<ClusterCardState["getClusterShortDescription"]>{
return (props.cluster as Cluster)?.shortDescriptions?.[0]?.value || (props.cluster as Cluster)?.defaultProduct?.shortDescriptions?.[0]?.value || '';
}


function getClusterManufacturer(): ReturnType<ClusterCardState["getClusterManufacturer"]>{
return (props.cluster as Cluster)?.defaultProduct?.manufacturer || '';
}


function getStockQuantity(): ReturnType<ClusterCardState["getStockQuantity"]>{
const qty = (props.cluster as Cluster)?.defaultProduct?.inventory?.totalQuantity;
return qty !== undefined && qty !== null ? qty : -1;
}


function getStockStatusLabel(): ReturnType<ClusterCardState["getStockStatusLabel"]>{
const qty = getStockQuantity();
if (qty < 0) return '';
if (qty === 0) return getLabel('outOfStock', 'Out of stock');
if (qty <= 5) return getLabel('lowStock', 'Low stock');
return getLabel('inStock', 'In stock');
}


function getStockStatusClass(): ReturnType<ClusterCardState["getStockStatusClass"]>{
const qty = getStockQuantity();
if (qty <= 0) return 'text-red-600 bg-red-50';
if (qty <= 5) return 'text-amber-600 bg-amber-50';
return 'text-green-600 bg-green-50';
}


function getLabel(key: string, fallback: string): ReturnType<ClusterCardState["getLabel"]>{
return (props.labels as Record<string, string>)?.[key] || fallback;
}


function handleClusterClick(e: any): ReturnType<ClusterCardState["handleClusterClick"]>{
if (props.onClusterClick) {
e.preventDefault();
props.onClusterClick(props.cluster);
}
}


function handleToggleFavorite(e: any): ReturnType<ClusterCardState["handleToggleFavorite"]>{
e.preventDefault();
e.stopPropagation();
setIsFavorite(!isFavorite);
if (props.onToggleFavorite) {
props.onToggleFavorite(props.cluster, isFavorite);
}
}


function computedImageLabels(): ReturnType<ClusterCardState["computedImageLabels"]>{
if (!props.imageLabels || (props.imageLabels as string[]).length === 0) return [];
const attrs = (props.cluster as Cluster)?.defaultProduct?.attributes?.items || [];
return (props.imageLabels as string[]).map((code: string) => {
const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
return found?.value?.value || '';
}).filter((v: string) => v.length > 0);
}


function computedTextLabels(): ReturnType<ClusterCardState["computedTextLabels"]>{
if (!props.textLabels || (props.textLabels as string[]).length === 0) return [];
const attrs = (props.cluster as Cluster)?.defaultProduct?.attributes?.items || [];
return (props.textLabels as string[]).map((code: string) => {
const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
return {
  name: code,
  value: found?.value?.value || ''
};
}).filter((item: {
name: string;
value: string;
}) => item.value.length > 0);
}







useEffect(() => {
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



return (


  <div  className={`group relative flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 ${isRow() ? 'flex-row items-center' : 'flex-col'} ${props.className || ''}`}>{props.showImage !== false ? (
  <div  className={`relative overflow-hidden bg-gray-50 ${isRow() ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-square p-4'}`}><a className="block h-full w-full"  href={getClusterUrl()}  onClick={(e) => handleClusterClick(e) }>{!!getClusterImageUrl() ? (
  <img className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"  src={getClusterImageUrl()}  alt={getClusterName()}  />
) : null}{!getClusterImageUrl() ? (
  <div className="flex h-full w-full items-center justify-center text-gray-200"><svg  fill="none"  stroke="currentColor"  viewBox="0 0 24 24" className="h-16 w-16"><path  strokeLinecap="round"  strokeLinejoin="round"  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"  strokeWidth={1}  /></svg></div>
) : null}</a>{!!props.imageLabels && props.imageLabels.length > 0 && computedImageLabels().length > 0 ? (
  <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">{computedImageLabels()?.map((label) => (
  <span className="inline-block rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm">{label}</span>
))}</div>
) : null}{props.enableAddFavorite ? (
  <button  type="button"  onClick={(e) => handleToggleFavorite(e) }  aria-label={isFavorite ? getLabel('removeFromFavorites', 'Remove from favourites') : getLabel('addToFavorites', 'Add to favourites')}  className={`absolute right-2 top-2 rounded-full border bg-white p-1.5 shadow-sm transition-colors ${isFavorite ? 'border-red-200 text-red-500' : 'border-gray-100 text-gray-300 hover:text-red-400'}`}><svg  stroke="currentColor"  viewBox="0 0 24 24" className="h-4 w-4"  fill={isFavorite ? 'currentColor' : 'none'}  strokeWidth={2}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"  /></svg></button>
) : null}</div>
) : null}<div  className={`flex flex-1 ${isRow() ? 'flex-row items-center gap-4 px-4 py-2 min-w-0' : 'flex-col gap-2 p-4'}`}>{props.showSku !== false && !!getClusterSku() ? (
  <div className="font-mono text-xs text-gray-400">{getClusterSku()}</div>
) : null}{props.showName !== false ? (
  <a  href={getClusterUrl()}  onClick={(e) => handleClusterClick(e) }  className={`text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-violet-600 ${isRow() ? 'line-clamp-1 flex-1 min-w-0' : 'line-clamp-2'}`}>{getClusterName()}</a>
) : null}{!!props.textLabels && props.textLabels.length > 0 && computedTextLabels().length > 0 ? (
  <div className="flex flex-col gap-0.5">{computedTextLabels()?.map((item) => (
  <div className="text-xs text-gray-500">{item.value}</div>
))}</div>
) : null}{props.showManufacturer && !!getClusterManufacturer() ? (
  <div className="text-xs text-gray-500">{getClusterManufacturer()}</div>
) : null}{props.showShortDescription && !!getClusterShortDescription() ? (
  <p className="line-clamp-2 text-xs text-gray-500">{getClusterShortDescription()}</p>
) : null}{!!getClusterPrice() ? (
  <div  className={isRow() ? '' : 'mt-auto pt-2'}><span  className={`font-bold text-gray-900 ${isRow() ? 'text-sm whitespace-nowrap' : 'text-lg'}`}>{getClusterPrice()}</span></div>
) : null}{props.showStock !== false && getStockQuantity() >= 0 ? (
  <div className="flex items-center gap-1.5"><span  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStockStatusClass()}`}>{getStockStatusLabel()}</span>{getStockQuantity() > 0 ? (
  <span className="text-xs text-gray-400">
                            ({getStockQuantity()})
                        </span>
) : null}</div>
) : null}</div><div  className={isRow() ? 'flex-shrink-0 pr-4' : 'px-4 pb-4'}><a className="flex w-full items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"  href={getClusterUrl()}  onClick={(e) => handleClusterClick(e) }>{getLabel('viewCluster', 'View cluster')}</a></div></div>


);
}




  export default ClusterCard;


