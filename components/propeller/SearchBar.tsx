'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient, ProductService, Product, Cluster, Enums } from 'propeller-sdk-v2';



  export interface SearchBarResult {
/** Unique identifier */
id: number | string;
/** Display name */
name: string;
/** SKU code */
sku?: string;
/** Price value */
price?: number;
/** Image URL */
imageUrl?: string;
/** URL path to navigate to */
url?: string;
/** Whether this is a cluster (vs product) */
isCluster?: boolean;
}
export interface SearchBarProps {
/** Propeller SDK GraphQL client */
graphqlClient: GraphQLClient;

/** Language code for search requests */
language?: string;

/** Placeholder text for the search input */
placeholder?: string;

/** Minimum characters before search triggers */
minSearchLength?: number;

/** Debounce delay in milliseconds */
debounceMs?: number;

/** Maximum number of results to show in dropdown */
maxResults?: number;

/** Fallback image URL when product has no image */
noImageUrl?: string;

/** Fires when the search form is submitted (Enter key). Receives the search term. */
onSubmit?: (term: string) => void;

/** Fires when a result item is clicked. Receives the result object. */
onResultClick?: (result: SearchBarResult) => void;

/** Fires when "View all results" is clicked. Receives the search term. */
onViewAllClick?: (term: string) => void;

/** Custom price formatting function */
formatPrice?: (price: number) => string;

/** Labels for the component */
labels?: Record<string, string>;

/** Additional class name for the container */
containerClassName?: string;
}




  function SearchBar(props:SearchBarProps) {

  const [searchTerm, setSearchTerm] = useState(() => (''))


const [results, setResults] = useState(() => ([]))


const [isLoading, setIsLoading] = useState(() => (false))


const [showDropdown, setShowDropdown] = useState(() => (false))


const [itemsFound, setItemsFound] = useState(() => (0))


const [_debounceTimer, set_debounceTimer] = useState(() => (null))


const [_clickOutsideListener, set_clickOutsideListener] = useState(() => (null))


function placeholder() {
return props.placeholder || 'Search products...';
}


function minLength() {
return props.minSearchLength !== undefined ? props.minSearchLength : 3;
}


function debounceMs() {
return props.debounceMs !== undefined ? props.debounceMs : 300;
}


function maxResults() {
return props.maxResults !== undefined ? props.maxResults : 8;
}


function noImageUrl() {
return props.noImageUrl || '';
}


function getLabel(key: string, fallback: string) {
return props.labels?.[key] || fallback;
}


function formatItemPrice(price: number) {
if (props.formatPrice) {
return props.formatPrice(price);
}
return '\u20AC' + Number(price || 0).toFixed(2);
}


function mapProductToResult(item: Product | Cluster) {
const isCluster = 'clusterId' in item;
const displayItem = isCluster ? (item as Cluster).defaultProduct : item;
const id = isCluster ? (item as Cluster).clusterId : (item as Product).productId;
const slug = item.slugs?.[0]?.value || '';
const url = isCluster ? '/cluster/' + id + '/' + slug : '/product/' + id + '/' + slug;
return {
id: id,
name: item.names?.[0]?.value || 'Product',
sku: item.sku || displayItem?.sku || '',
price: displayItem?.price?.gross || 0,
imageUrl: displayItem?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '',
url: url,
isCluster: isCluster
} as SearchBarResult;
}


function handleInputChange(value: string) {
setSearchTerm(value);
if (_debounceTimer) {
clearTimeout(_debounceTimer);
}
if (value.length < minLength()) {
setResults([]);
setShowDropdown(false);
return;
}
set_debounceTimer(setTimeout(() => {
fetchResults(value);
}, debounceMs()));
}


async function fetchResults(term: string) {
if (!props.graphqlClient) return;
setIsLoading(true);
try {
const productService = new ProductService(props.graphqlClient);
const response = await productService.getProducts({
  input: {
    term: term,
    language: props.language || 'NL',
    page: 1,
    offset: maxResults(),
    statuses: [Enums.ProductStatus.A, Enums.ProductStatus.P, Enums.ProductStatus.T, Enums.ProductStatus.S],
    hidden: false,
    sortInputs: [{
      field: Enums.ProductSortField.RELEVANCE,
      order: Enums.SortOrder.DESC
    }]
  },
  imageSearchFilters: {
    page: 1,
    offset: 1
  },
  imageVariantFilters: {
    transformations: [{
      name: 'thumb',
      transformation: {
        format: Enums.Format.WEBP,
        height: 100,
        width: 100,
        fit: Enums.Fit.BOUNDS
      }
    }]
  },
  filterAvailableAttributeInput: {
    isSearchable: true
  }
});
const items = response.items || [];
const mapped: SearchBarResult[] = [];
for (let i = 0; i < items.length && i < maxResults(); i++) {
  mapped.push(mapProductToResult(items[i] as Product | Cluster));
}
setResults(mapped);
setItemsFound(response.itemsFound || 0);
setShowDropdown(true);
} catch (e) {
setResults([]);
setShowDropdown(false);
} finally {
setIsLoading(false);
}
}


function handleSubmit(e: any) {
e.preventDefault();
const term = searchTerm.trim();
if (term && props.onSubmit) {
props.onSubmit(term);
setShowDropdown(false);
}
}


function handleResultClick(result: SearchBarResult) {
if (props.onResultClick) {
props.onResultClick(result);
}
setShowDropdown(false);
setSearchTerm('');
}


function handleViewAllClick() {
if (props.onViewAllClick) {
props.onViewAllClick(searchTerm);
}
setShowDropdown(false);
}







useEffect(() => {
      const listener = (e: MouseEvent) => {
const target = e.target as HTMLElement;
if (target && !target.closest('[data-search-bar]')) {
setShowDropdown(false);
}
};
set_clickOutsideListener(listener);
document.addEventListener('mousedown', listener)
    }, [])

useEffect(() => {
      return () => {
        if (_clickOutsideListener) {
document.removeEventListener('mousedown', _clickOutsideListener);
}
if (_debounceTimer) {
clearTimeout(_debounceTimer);
}
      }
    }, [])

return (


  <div  data-search-bar  className={props.containerClassName || 'relative flex-1 max-w-2xl mx-8'}><form  onSubmit={(e) => handleSubmit(e) }><div className="relative"><svg  fill="none"  stroke="currentColor"  viewBox="0 0 24 24" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"><circle  cx="11"  cy="11"  r="8"  /><path  d="m21 21-4.35-4.35"  /></svg><input  type="search"  autoComplete="off" className="w-full pl-10 pr-10 py-2 bg-white/95 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-500"  placeholder={placeholder()}  value={searchTerm}  onChange={(e) => handleInputChange((e.target as HTMLInputElement).value) }  />{isLoading ? (
  <div className="absolute right-3 top-1/2 transform -translate-y-1/2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"  /></div>
) : null}</div></form>{showDropdown ? (
  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border max-h-96 overflow-y-auto z-50">{results.length > 0 ? (
  <>{results?.map((result, index) => (
  <div className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"  key={result.id + '-' + index}  onClick={(event) => handleResultClick(result) }>{result.imageUrl || noImageUrl() ? (
  <div className="relative w-16 h-16 flex-shrink-0"><img className="w-full h-full object-contain"  src={result.imageUrl || noImageUrl()}  alt={result.name}  /></div>
) : null}<div className="flex-1 min-w-0"><div className="font-semibold truncate">{result.name}</div>{result.sku ? (
  <div className="text-sm text-gray-500">SKU: {result.sku}</div>
) : null}</div>{result.price !== undefined && result.price !== null ? (
  <div className="text-lg font-bold text-blue-600 flex-shrink-0">{formatItemPrice(result.price!)}</div>
) : null}</div>
))}
{itemsFound > maxResults() ? (
  <div className="p-3 text-center text-blue-600 hover:bg-blue-50 cursor-pointer font-semibold"  onClick={(event) => handleViewAllClick() }>{getLabel('viewAll', 'View all results')} ({itemsFound})
                        </div>
) : null}</>
) : null}{results.length === 0 && searchTerm.length >= minLength() && !isLoading ? (
  <div className="p-4 text-center text-gray-500">{getLabel('noResults', 'No products found for')} &quot;{searchTerm}&quot;
                    </div>
) : null}</div>
) : null}</div>


);
}




  export default SearchBar;


