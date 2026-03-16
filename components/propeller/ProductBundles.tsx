'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient, BundleService, Contact, Customer } from 'propeller-sdk-v2';



  export interface ProductBundlesProps {
graphqlClient: GraphQLClient;
productId: number;
language: string;
taxZone: string;
includeTax?: boolean;
portalMode?: string;
user?: Contact | Customer | null;
stockValidation?: boolean;
showIndividualItems?: boolean;
layout?: 'vertical' | 'horizontal' | 'compact';
labels?: Record<string, string>;
onAddBundleToCart: (bundleId: string, quantity: number) => void;
className?: string;
}




  function ProductBundles(props:ProductBundlesProps) {

  const [_bundles, set_bundles] = useState(() => ([]))


const [_isLoading, set_isLoading] = useState(() => (false))


const [_includeTax, set_includeTax] = useState(() => (true))


const [_priceListener, set_priceListener] = useState(() => (null))


const [_isMounted, set_isMounted] = useState(() => (false))


const [_addingBundleId, set_addingBundleId] = useState(() => (null))


function includeTax() {
return props.includeTax !== undefined ? props.includeTax : _includeTax;
}


function showItems() {
return props.showIndividualItems !== undefined ? props.showIndividualItems : true;
}


function layout() {
return props.layout || 'horizontal';
}


function isAnonymous() {
return !props.user;
}


function hidePrices() {
return props.portalMode === 'semi-closed' && isAnonymous();
}


function getLabel(key: string, fallback: string) {
return props.labels?.[key] || fallback;
}


function formatPrice(value: number) {
return '\u20AC' + value.toFixed(2);
}


function getBundlePrice(bundle: any) {
return includeTax() ? bundle.price?.net || 0 : bundle.price?.gross || 0;
}


function getOriginalPrice(bundle: any) {
return includeTax() ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;
}


function getItemPrice(item: any) {
return includeTax() ? item.price?.net || 0 : item.price?.gross || 0;
}


function hasDiscount(bundle: any) {
const current = getBundlePrice(bundle);
const original = getOriginalPrice(bundle);
return original > 0 && current < original;
}


function getDiscountPercentage(bundle: any) {
const original = getOriginalPrice(bundle);
if (original <= 0) return 0;
return Math.round((original - getBundlePrice(bundle)) / original * 100);
}


function getProductImage(product: any) {
return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}


function getProductName(product: any) {
return product?.names?.[0]?.value || '';
}


async function fetchBundles() {
if (!props.graphqlClient || !props.productId) return;
set_isLoading(true);
try {
const bundleService = new BundleService(props.graphqlClient);
// SDK bug workaround: getBundles() doesn't pass language/image variables const result = await (bundleService as any).executeQuery('bundles', {   input: {     productIds: [props.productId],     taxZone: props.taxZone || 'NL',     page: 1,     offset: 20   },   language: props.language || 'NL',   imageSearchFilters: {     page: 1,     offset: 1   },   imageVariantFilters: {     transformations: [{       name: 'bundle',       transformation: {         format: 'WEBP',         height: 200,         width: 200,         fit: 'BOUNDS'       }     }]   } }); set_bundles(result?.data?.bundles?.items || []); } catch (e) { set_bundles([]); } finally { set_isLoading(false); } }   function handleAddToCart(bundleId: string) { if (_addingBundleId) return; set_addingBundleId(bundleId); props.onAddBundleToCart(bundleId, 1); setTimeout(() => { set_addingBundleId(null); }, 1500); }        useEffect(() => {       set_isMounted(true); fetchBundles(); if (typeof window !== 'undefined') { const stored = localStorage.getItem('price_include_tax'); set_includeTax(stored === null ? true : stored === 'true'); set_priceListener(() => { const val = localStorage.getItem('price_include_tax'); set_includeTax(val === null ? true : val === 'true'); }); window.addEventListener('priceToggleChanged', _priceListener); }     }, []) useEffect(() => {       fetchBundles()     },     [props.productId])   return (   <>    {_isMounted && !_isLoading && _bundles.length > 0 ? (   <><div  className={props.className || 'mb-12'}>{_bundles?.map((bundle, bundleIdx) => (   <div className="border rounded-lg overflow-hidden mb-6"  key={bundle.id || bundleIdx}><div className="flex items-center justify-between p-4 bg-gray-50 border-b"><div className="flex items-center gap-3"><h3 className="text-lg font-bold">{bundle.name || getLabel('title', 'Combo deal')}</h3>{!hidePrices() && hasDiscount(bundle) ? (   <span className="bg-red-100 text-red-700 text-sm font-semibold px-2 py-0.5 rounded">                                         -{getDiscountPercentage(bundle)}%                                     </span> ) : null}</div>{bundle.condition ? (   <span className="text-xs text-gray-500">{bundle.condition === 'ALL' ? (   <>{getLabel('condition_ALL', 'Discount on all items')}</> ) : <>{getLabel('condition_EP', 'Discount on extra items')}</>}</span> ) : null}</div>{showItems() && layout() !== 'compact' && bundle.items && bundle.items.length > 0 ? (   <div className="p-4">{bundle.items?.map((item, idx) => (   <div className="flex items-center gap-3 mb-3"  key={item.productId + '-' + idx}><div className="w-16 h-16 bg-gray-50 rounded overflow-hidden flex-shrink-0">{getProductImage(item.product) ? (   <img className="w-full h-full object-contain p-1"  src={getProductImage(item.product)}  alt={getProductName(item.product)}  /> ) : null}</div><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{getProductName(item.product) || 'Product ' + item.productId}</div>{item.product?.sku ? (   <div className="text-xs text-gray-500">SKU: {item.product.sku}</div> ) : null}{!hidePrices() && item.price ? (   <div className="text-sm text-gray-700 mt-0.5">{formatPrice(getItemPrice(item))}</div> ) : null}{item.isLeader === 'Y' ? (   <span className="text-xs text-blue-600 font-medium">{getLabel('leaderItem', 'Main product')}</span> ) : null}</div></div> ))}</div> ) : null}{!hidePrices() ? (   <div className="flex items-center justify-between p-4 border-t bg-white"><div className="flex items-center gap-4">{hasDiscount(bundle) ? (   <span className="text-gray-400 line-through text-sm">{formatPrice(getOriginalPrice(bundle))}</span> ) : null}<span className="text-xl font-bold text-blue-600">{formatPrice(getBundlePrice(bundle))}</span>{hasDiscount(bundle) ? (   <span className="text-sm text-green-600 font-medium">{getLabel('youSave', 'You save')}{formatPrice(getOriginalPrice(bundle) - getBundlePrice(bundle))}</span> ) : null}</div><button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"  onClick={(event) => handleAddToCart(bundle.id) }  disabled={_addingBundleId === bundle.id}>{_addingBundleId === bundle.id ? (   <>{getLabel('adding', 'Adding...')}</> ) : <>{getLabel('addToCart', 'Add bundle to cart')}</>}</button></div> ) : null}{hidePrices() ? (   <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">{getLabel('loginToSeePrices', 'Log in to see prices and add to cart')}</div> ) : null}</div> ))}</div></> ) : null}    </> ); }       export default ProductBundles;


