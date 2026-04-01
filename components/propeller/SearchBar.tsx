'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { GraphQLClient, ProductService, Product, Cluster, Enums } from 'propeller-sdk-v2';

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

  /**
   * Active company ID from the company switcher.
   * When provided, can be forwarded to price calculation in search results
   * if the underlying SDK call supports priceCalculateProductInput.
   */
  companyId?: number;
}
interface SearchBarState {
  searchTerm: string;
  results: SearchBarResult[];
  isLoading: boolean;
  showDropdown: boolean;
  itemsFound: number;
  debounceTimer: any;
  clickOutsideListener: {
    fn: ((e: MouseEvent) => void) | null;
  };
  placeholder: () => string;
  minLength: () => number;
  debounceMs: () => number;
  maxResults: () => number;
  noImageUrl: () => string;
  getLabel: (key: string, fallback: string) => string;
  formatItemPrice: (price: number) => string;
  mapProductToResult: (item: Product | Cluster) => SearchBarResult;
  handleInputChange: (value: string) => void;
  fetchResults: (term: string) => Promise<void>;
  handleSubmit: (e: any) => void;
  handleResultClick: (result: SearchBarResult) => void;
  handleViewAllClick: () => void;
}
function SearchBar(props: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState<SearchBarState['searchTerm']>(() => '');
  const [results, setResults] = useState<SearchBarState['results']>(() => []);
  const [isLoading, setIsLoading] = useState<SearchBarState['isLoading']>(() => false);
  const [showDropdown, setShowDropdown] = useState<SearchBarState['showDropdown']>(() => false);
  const [itemsFound, setItemsFound] = useState<SearchBarState['itemsFound']>(() => 0);
  const [debounceTimer, setDebounceTimer] = useState<SearchBarState['debounceTimer']>(() => null);
  const [clickOutsideListener, setClickOutsideListener] = useState<
    SearchBarState['clickOutsideListener']
  >(() => ({
    fn: null as any,
  }));
  function placeholder(): ReturnType<SearchBarState['placeholder']> {
    return props.placeholder || 'Search products...';
  }
  function minLength(): ReturnType<SearchBarState['minLength']> {
    return props.minSearchLength !== undefined ? props.minSearchLength : 3;
  }
  function debounceMs(): ReturnType<SearchBarState['debounceMs']> {
    return props.debounceMs !== undefined ? props.debounceMs : 300;
  }
  function maxResults(): ReturnType<SearchBarState['maxResults']> {
    return props.maxResults !== undefined ? props.maxResults : 8;
  }
  function noImageUrl(): ReturnType<SearchBarState['noImageUrl']> {
    return props.noImageUrl || '';
  }
  function getLabel(key: string, fallback: string): ReturnType<SearchBarState['getLabel']> {
    return props.labels?.[key] || fallback;
  }
  function formatItemPrice(price: number): ReturnType<SearchBarState['formatItemPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '\u20AC' + Number(price || 0).toFixed(2);
  }
  function mapProductToResult(
    item: Product | Cluster
  ): ReturnType<SearchBarState['mapProductToResult']> {
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
      isCluster: isCluster,
    } as SearchBarResult;
  }
  function handleInputChange(value: string): ReturnType<SearchBarState['handleInputChange']> {
    setSearchTerm(value);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    if (value.length < minLength()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setDebounceTimer(
      setTimeout(() => {
        fetchResults(value);
      }, debounceMs())
    );
  }
  async function fetchResults(term: string): ReturnType<SearchBarState['fetchResults']> {
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
          statuses: [
            Enums.ProductStatus.A,
            Enums.ProductStatus.P,
            Enums.ProductStatus.T,
            Enums.ProductStatus.S,
          ],
          hidden: false,
          sortInputs: [
            {
              field: Enums.ProductSortField.RELEVANCE,
              order: Enums.SortOrder.DESC,
            },
          ],
        },
        imageSearchFilters: {
          page: 1,
          offset: 1,
        },
        imageVariantFilters: {
          transformations: [
            {
              name: 'thumb',
              transformation: {
                format: Enums.Format.WEBP,
                height: 100,
                width: 100,
                fit: Enums.Fit.BOUNDS,
              },
            },
          ],
        },
        filterAvailableAttributeInput: {
          isSearchable: true,
        },
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
  function handleSubmit(e: any): ReturnType<SearchBarState['handleSubmit']> {
    e.preventDefault();
    const term = searchTerm.trim();
    if (props.onSubmit) {
      props.onSubmit(term);
      setShowDropdown(false);
    }
  }
  function handleResultClick(
    result: SearchBarResult
  ): ReturnType<SearchBarState['handleResultClick']> {
    if (props.onResultClick) {
      props.onResultClick(result);
    }
    setShowDropdown(false);
    setSearchTerm('');
  }
  function handleViewAllClick(): ReturnType<SearchBarState['handleViewAllClick']> {
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
    setClickOutsideListener({
      fn: listener,
    });
    document.addEventListener('mousedown', listener);
  }, []);
  useEffect(() => {
    return () => {
      if (clickOutsideListener.fn) {
        document.removeEventListener('mousedown', clickOutsideListener.fn);
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, []);
  return (
    <div data-search-bar className={props.containerClassName || 'relative flex-1 max-w-2xl mx-8'}>
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
            placeholder={placeholder()}
            value={searchTerm}
            onChange={(e) => handleInputChange((e.target as HTMLInputElement).value)}
          />
          {isLoading ? (
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
              {itemsFound > maxResults() ? (
                <div
                  className="p-3 text-center text-primary hover:bg-primary/5 cursor-pointer font-semibold"
                  onClick={(event) => handleViewAllClick()}
                >
                  {getLabel('viewAll', 'View all results')} ({itemsFound})
                </div>
              ) : null}
            </>
          ) : null}
          {results.length === 0 && searchTerm.length >= minLength() && !isLoading ? (
            <div className="p-4 text-center text-gray-500">
              {getLabel('noResults', 'No products found for')} &quot;{searchTerm}&quot;
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default SearchBar;
