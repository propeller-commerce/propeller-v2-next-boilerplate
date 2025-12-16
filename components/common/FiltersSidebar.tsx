'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProductsResponse, AttributeFilter } from 'propeller-sdk-v2';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface FiltersSidebarProps {
  productsResponse: ProductsResponse;
  currentFilters: Record<string, string[]>;
  currentMinPrice?: number;
  currentMaxPrice?: number;
  onFilterChange: (filterName: string, values: string[]) => void;
  onPriceRangeChange: (minPrice?: number, maxPrice?: number) => void;
}

export default function FiltersSidebar({
  productsResponse,
  currentFilters,
  currentMinPrice,
  currentMaxPrice,
  onFilterChange,
  onPriceRangeChange
}: FiltersSidebarProps) {
  const [originalPriceBounds] = useState(() => {
    if (productsResponse.minPrice !== undefined && productsResponse.maxPrice !== undefined) {
      return {
        min: productsResponse.minPrice || 0,
        max: productsResponse.maxPrice || 1000
      };
    }

    const prices = productsResponse.items
      .map(item => (item as any).price?.gross)
      .filter(price => price != null && price > 0);

    return {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 1000
    };
  });

  const [priceRange, setPriceRange] = useState({
    min: currentMinPrice || originalPriceBounds.min,
    max: currentMaxPrice || originalPriceBounds.max
  });

  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPriceRange({
      min: currentMinPrice || originalPriceBounds.min,
      max: currentMaxPrice || originalPriceBounds.max
    });
  }, [currentMinPrice, currentMaxPrice, originalPriceBounds]);

  useEffect(() => {
    const filters = productsResponse.filters || [];
    const newExpanded = new Set<string>();

    if (Array.isArray(filters)) {
      filters.forEach((filter) => {
        const filterName = filter.attributeDescription?.name;
        if (filterName && currentFilters[filterName]?.length > 0) {
          newExpanded.add(filterName);
        }
      });
    }

    setExpandedFilters(newExpanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters]);

  const debouncedPriceChange = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (min: number, max: number) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onPriceRangeChange(min, max);
        }, 800);
      };
    })(),
    [onPriceRangeChange]
  );

  const handleSliderChange = (type: 'min' | 'max', value: number) => {
    const newRange = { ...priceRange, [type]: value };

    if (type === 'min' && value > newRange.max) {
      newRange.max = value;
    }
    if (type === 'max' && value < newRange.min) {
      newRange.min = value;
    }

    setPriceRange(newRange);
    debouncedPriceChange(newRange.min, newRange.max);
  };

  const toggleFilterAccordion = (filterName: string) => {
    const newExpanded = new Set(expandedFilters);
    if (newExpanded.has(filterName)) {
      newExpanded.delete(filterName);
    } else {
      newExpanded.add(filterName);
    }
    setExpandedFilters(newExpanded);
  };

  const handleCheckboxChange = (filterName: string, value: string, checked: boolean) => {
    const currentValues = currentFilters[filterName] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);

    onFilterChange(filterName, newValues);
  };

  const getCheckboxCount = (filter: any, textFilter: any): number => {
    let count = textFilter.count || 0;

    // Check if this filter is active
    const isActiveFilter = currentFilters['active_filter'] && currentFilters['active_filter'][0] === filter.attributeDescription?.name;

    if (isActiveFilter && textFilter.countActive > 0) {
      count = textFilter.countActive;
    } else if (textFilter.count === 0 && textFilter.countActive > 0) {
      count = textFilter.countActive;
    }

    return count;
  };

  const filters = productsResponse.filters || [];
  const { min: minPrice, max: maxPrice } = originalPriceBounds;

  return (
    <div className="space-y-6 sticky top-24">
      {/* Price Range */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Price Range</h3>
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              <Input
                type="number"
                value={priceRange.min}
                min={minPrice}
                max={maxPrice}
                onChange={(e) => handleSliderChange('min', parseFloat(e.target.value) || minPrice)}
                className="pl-6 h-8 text-sm"
              />
            </div>
            <span className="text-muted-foreground">-</span>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
              <Input
                type="number"
                value={priceRange.max}
                min={minPrice}
                max={maxPrice}
                onChange={(e) => handleSliderChange('max', parseFloat(e.target.value) || maxPrice)}
                className="pl-6 h-8 text-sm"
              />
            </div>
          </div>

          <div className="relative h-4 pt-1">
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceRange.min}
              onChange={(e) => handleSliderChange('min', parseFloat(e.target.value))}
              className="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary z-20"
            />
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceRange.max}
              onChange={(e) => handleSliderChange('max', parseFloat(e.target.value))}
              className="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary z-20"
            />
            {/* Track background */}
            <div className="absolute top-1.5 left-0 right-0 h-1.5 bg-muted rounded z-10"></div>
          </div>
        </div>
      </div>

      <div className="h-px bg-border my-6" />

      {/* Attribute Filters */}
      {filters.map((filter: AttributeFilter, index: number) => {
        const filterName = filter.attributeDescription?.name || '';
        const filterTitle = filter.attributeDescription?.descriptions?.[0]?.value || filterName;
        const isExpanded = expandedFilters.has(filterName);

        if (!filter.textFilters || filter.textFilters.length === 0) return null;

        // Filter out options with 0 count
        const validOptions = filter.textFilters.filter(textFilter => getCheckboxCount(filter, textFilter as any) > 0);

        if (validOptions.length === 0) return null;

        return (
          <div key={filter.id || index} className="border-b border-border pb-4 last:border-b-0 space-y-2">
            <button
              onClick={() => toggleFilterAccordion(filterName)}
              className="w-full flex items-center justify-between text-left font-semibold text-sm hover:text-primary transition-colors py-1"
            >
              <span>{filterTitle}</span>
              <svg
                className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
                {validOptions.map((textFilter, tfIndex) => {
                  const count = getCheckboxCount(filter, textFilter as any);
                  const isChecked = currentFilters[filterName]?.includes(textFilter.value) || false;
                  // Use a stable ID based on filter ID and option value
                  // Fallback to index if value is not unique enough (though value should be unique per filter)
                  const safeValue = textFilter.value.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
                  const checkboxId = `filter-${filter.id}-${safeValue}`;

                  return (
                    <div key={textFilter.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={checkboxId}
                        checked={isChecked}
                        onChange={(e) => handleCheckboxChange(filterName, textFilter.value, e.target.checked)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20 cursor-pointer"
                      />
                      <label
                        htmlFor={checkboxId}
                        className="text-sm text-foreground/80 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none"
                      >
                        {textFilter.value} <span className="text-muted-foreground text-xs">({count})</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filters.length === 0 && (
        <div className="text-sm text-muted-foreground italic">No filters available</div>
      )}
    </div>
  );
}
