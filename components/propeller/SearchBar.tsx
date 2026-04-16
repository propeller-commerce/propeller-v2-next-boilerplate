'use client';
import * as React from 'react';

import { useState, useEffect, useRef } from 'react';
import { GraphQLClient, Product, Cluster, Contact, Customer } from 'propeller-sdk-v2';
import { useProductSearch } from '@/composables/react/useProductSearch';

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

  /** The currently logged in user (Contact or Customer) */
  user?: Contact | Customer | null;

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

  /** Tax zone used for price calculation. Defaults to 'NL'. */
  taxZone?: string;

  /**
   * Configuration object providing:
   *   imageSearchFiltersGrid, imageVariantFiltersMedium — passed to CategoryService
   *   baseCategoryId — used when querying by term or brand
   *   urls.getProductUrl / urls.getClusterUrl — for card URL generation
   */
  configuration?: any;

  /**
   * Active company ID from the company switcher.
   */
  companyId?: number;
}

function mapToSearchBarResult(item: Product | Cluster): SearchBarResult {
  const isCluster = 'clusterId' in item;
  const displayItem = isCluster ? (item as Cluster).defaultProduct : item;
  const id = isCluster ? (item as Cluster).clusterId : (item as Product).productId;
  const slug = item.slugs?.[0]?.value || '';
  const url = isCluster ? '/cluster/' + id + '/' + slug : '/product/' + id + '/' + slug;
  return {
    id,
    name: item.names?.[0]?.value || 'Product',
    sku: item.sku || displayItem?.sku || '',
    price: displayItem?.price?.gross || 0,
    imageUrl: displayItem?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '',
    url,
    isCluster,
  };
}

function SearchBar(props: SearchBarProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [localTerm, setLocalTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const minLength = props.minSearchLength !== undefined ? props.minSearchLength : 3;
  const maxResults = props.maxResults !== undefined ? props.maxResults : 8;

  const { search, searchResults, searchLoading } = useProductSearch({
    graphqlClient: props.graphqlClient,
    language: props.language,
    configuration: props.configuration || {},
    companyId: props.companyId,
  });

  const results: SearchBarResult[] = searchResults
    .slice(0, maxResults)
    .map((item) => mapToSearchBarResult(item as Product | Cluster));

  const itemsFound = searchResults.length;

  function getLabel(key: string, fallback: string): string {
    return props.labels?.[key] || fallback;
  }

  function formatItemPrice(price: number): string {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '\u20AC' + Number(price || 0).toFixed(2);
  }

  function noImageUrl(): string {
    return props.noImageUrl || '';
  }

  function handleInputChange(value: string) {
    setLocalTerm(value);
    if (value.length < minLength) {
      setShowDropdown(false);
      return;
    }
    search(value);
    setShowDropdown(true);
  }

  // Keep dropdown open when results arrive
  useEffect(() => {
    if (searchResults.length > 0) {
      setShowDropdown(true);
    }
  }, [searchResults]);

  function handleSubmit(e: any) {
    e.preventDefault();
    const term = localTerm.trim();
    if (props.onSubmit) {
      props.onSubmit(term);
      setShowDropdown(false);
    }
  }

  function handleResultClick(result: SearchBarResult) {
    if (props.onResultClick) {
      props.onResultClick(result);
    }
    setShowDropdown(false);
    setLocalTerm('');
  }

  function handleViewAllClick() {
    if (props.onViewAllClick) {
      props.onViewAllClick(localTerm);
    }
    setShowDropdown(false);
  }

  // Click-outside to close dropdown
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  return (
    <div
      ref={containerRef}
      data-search-bar
      className={props.containerClassName || 'relative flex-1 max-w-2xl mx-8'}
    >
      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="relative">
          <button
            type="submit"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 p-0 bg-transparent border-none cursor-pointer"
          >
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="w-5 h-5 text-gray-400 hover:text-gray-600"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
          <input
            type="search"
            autoComplete="off"
            className="w-full pl-10 pr-10 py-2 bg-white/95 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary placeholder:text-gray-500"
            placeholder={props.placeholder || 'Search products...'}
            value={localTerm}
            onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
          />
          {searchLoading ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : null}
        </div>
      </form>
      {showDropdown ? (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border max-h-96 overflow-y-auto z-50">
          {results.length > 0 ? (
            <>
              {results?.map((result, index) => (
                <div
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                  key={result.id + '-' + index}
                  onClick={(event) => handleResultClick(result)}
                >
                  {result.imageUrl || noImageUrl() ? (
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <img
                        className="w-full h-full object-contain"
                        src={result.imageUrl || noImageUrl()}
                        alt={result.name}
                      />
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{result.name}</div>
                    {result.sku ? (
                      <div className="text-sm text-gray-500">SKU: {result.sku}</div>
                    ) : null}
                  </div>
                  {result.price !== undefined && result.price !== null ? (
                    <div className="text-sm font-semibold text-foreground flex-shrink-0">
                      {formatItemPrice(result.price!)}
                    </div>
                  ) : null}
                </div>
              ))}
              {itemsFound > maxResults ? (
                <div
                  className="p-3 text-center text-primary hover:bg-primary/5 cursor-pointer font-semibold"
                  onClick={(event) => handleViewAllClick()}
                >
                  {getLabel('viewAll', 'View all results')} ({itemsFound})
                </div>
              ) : null}
            </>
          ) : null}
          {results.length === 0 && localTerm.length >= minLength && !searchLoading ? (
            <div className="p-4 text-center text-gray-500">
              {getLabel('noResults', 'No products found for')} &quot;{localTerm}&quot;
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default SearchBar;
