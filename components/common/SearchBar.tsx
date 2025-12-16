'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { productService } from '@/lib/api';
import { Product, Cluster, Enums } from 'propeller-sdk-v2';
import { imageSearchFiltersGrid, imageVariantFiltersMedium } from '@/data/defaults';

export default function SearchBar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<(Product | Cluster)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [itemsFound, setItemsFound] = useState(0);

  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results
  const fetchSearchResults = async (term: string) => {
    if (term.length < 3) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await productService.getProducts({
        input: {
          term,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          page: 1,
          offset: 8,
          statuses: [
            Enums.ProductStatus.A,
            Enums.ProductStatus.P,
            Enums.ProductStatus.T,
            Enums.ProductStatus.S
          ],
          hidden: false,
          sortInputs: [{
            field: Enums.ProductSortField.RELEVANCE,
            order: Enums.SortOrder.DESC
          }]
        },
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersMedium,
        filterAvailableAttributeInput: {
          isSearchable: true
        }
      });

      setResults(response.items.slice(0, 8) as (Product | Cluster)[]);
      setItemsFound(response.itemsFound);
      setShowDropdown(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSearchResults(value);
    }, 300);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search/${encodeURIComponent(searchTerm.trim())}`);
      setShowDropdown(false);
    }
  };

  // Handle product click
  const handleProductClick = (product: Product | Cluster) => {
    const isCluster = 'clusterId' in product;
    const id = isCluster ? product.clusterId : (product as Product).productId;
    const slug = product.slugs?.[0]?.value || '';
    const path = isCluster ? `/cluster/${id}/${slug}` : `/product/${id}/${slug}`;

    router.push(path);
    setShowDropdown(false);
    setSearchTerm('');
  };

  // Get product image URL
  const getProductImageUrl = (product: Product | Cluster): string => {
    // For clusters, use defaultProduct
    const item = 'defaultProduct' in product ? product.defaultProduct : product;

    return item?.media?.images?.items?.[0]?.imageVariants?.[0]?.url ||
      'https://playground2.dev.wp-propel.com/wp-content/plugins/propeller-ecommerce-v2/public/assets/img/no-image-card.webp';
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl mx-8">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="search"
            placeholder="Search products..."
            value={searchTerm}
            onChange={handleInputChange}
            className="w-full pl-10 pr-10 py-2 bg-white/95 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-500"
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border max-h-96 overflow-y-auto z-50">
          {results.length > 0 ? (
            <>
              {results.map((product, index) => {
                // For clusters, use defaultProduct for display data
                const displayItem = 'defaultProduct' in product ? product.defaultProduct : product;

                const name = product.names?.[0]?.value || 'Product';
                const sku = product.sku || displayItem?.sku || '';
                const price = displayItem?.price?.gross || 0;
                const id = 'productId' in product ? product.productId : product.clusterId;

                return (
                  <div
                    key={`${id}-${index}`}
                    onClick={() => handleProductClick(product)}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={getProductImageUrl(product)}
                        alt={name}
                        fill
                        sizes="64px"
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{name}</div>
                      <div className="text-sm text-gray-500">SKU: {sku}</div>
                    </div>
                    <div className="text-lg font-bold text-blue-600 flex-shrink-0">
                      €{price.toFixed(2)}
                    </div>
                  </div>
                );
              })}

              {itemsFound > 8 && (
                <div
                  onClick={() => {
                    router.push(`/search/${encodeURIComponent(searchTerm)}`);
                    setShowDropdown(false);
                  }}
                  className="p-3 text-center text-blue-600 hover:bg-blue-50 cursor-pointer font-semibold"
                >
                  View all results ({itemsFound})
                </div>
              )}
            </>
          ) : (
            searchTerm.length >= 3 && !isLoading && (
              <div className="p-4 text-center text-gray-500">
                No products found for &quot;{searchTerm}&quot;
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
