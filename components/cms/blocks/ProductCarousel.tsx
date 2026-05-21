'use client';

import { useEffect, useState } from 'react';
import { services } from '@/lib/api';
import { imageSearchFiltersGrid, imageVariantFiltersMedium } from '@/data/defaults';
import type { CmsProductCarousel } from '@/lib/cms/types';
import type { Product, Cluster } from 'propeller-sdk-v2';

export default function ProductCarousel({ block }: { block: CmsProductCarousel }) {
  const [products, setProducts] = useState<(Product | Cluster)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await services.category.getCategory({
          categoryId: parseInt(block.categoryId, 10),
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          imageSearchFilters: imageSearchFiltersGrid,
          imageVariantFilters: imageVariantFiltersMedium,
        });

        if (data.products?.items) {
          setProducts(data.products.items.slice(0, block.limit) as (Product | Cluster)[]);
        }
      } catch (error) {
        console.error('Failed to load carousel products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [block.categoryId, block.limit]);

  if (loading) {
    return (
      <section className="py-16">
        <div className="container-width">
          <h2 className="text-2xl font-bold mb-8">{block.title}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-slate-100 animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;
}
