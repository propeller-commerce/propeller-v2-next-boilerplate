'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { graphqlClient, getServices } from 'propeller-v2-react-ui';
import { useMenu } from 'propeller-v2-react-ui';
import type { Cluster, Product } from 'propeller-sdk-v2';
import { CategoryQueryVariables } from 'propeller-sdk-v2';
import { imageSearchFiltersGrid, imageVariantFiltersMedium } from '@/data/defaults';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';

interface CategoryDisplay {
  id: number;
  name: string;
  icon: string;
  categoryId: number;
  slug: string;
}

const baseCategoryId = parseInt(process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '17', 10);
const categoryIcons = ['\uD83D\uDCBB', '\u2328\uFE0F', '\uD83C\uDF10', '\uD83D\uDDA5\uFE0F', '\uD83C\uDFAE', '\uD83D\uDD0C'];

export default function HomeFallback() {
  const [featuredProducts, setFeaturedProducts] = useState<(Product | Cluster)[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();

  const { categories: menuCategories, fetchMenu } = useMenu({
    graphqlClient,
    language,
  });

  const categories: CategoryDisplay[] = menuCategories.slice(0, 6).map((cat, index) => ({
    id: cat.categoryId,
    name: cat.name,
    icon: categoryIcons[index] || '\uD83D\uDCE6',
    categoryId: cat.categoryId,
    slug: cat.slug,
  }));

  useEffect(() => {
    fetchMenu(baseCategoryId);
  }, [fetchMenu]);

  useEffect(() => {
    if (menuCategories.length === 0) return;
    const firstCat = menuCategories[0];

    const loadProducts = async () => {
      setLoading(true);
      try {
        const lang = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
        const categoryQueryVariables: CategoryQueryVariables = {
          categoryId: firstCat.categoryId,
          language: lang,
          imageSearchFilters: imageSearchFiltersGrid,
          imageVariantFilters: imageVariantFiltersMedium,
        };
        const categoryData = await getServices().category.getCategory(categoryQueryVariables);
        if (categoryData.products?.items) {
          setFeaturedProducts(categoryData.products.items.slice(0, 8) as (Product | Cluster)[]);
        }
      } catch (error) {
        console.error('Failed to load featured products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [menuCategories]);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[600px] flex items-center">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-banner.png"
            alt="Industrial Background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        </div>

        <div className="container-width relative z-10 w-full">
          <div className="max-w-2xl space-y-6 animate-in slide-in-from-left duration-700">
            <Badge variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
              New Arrivals 2024
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground sm:text-7xl drop-shadow-sm">
              High-Performance <br />
              <span className="text-primary mt-2 block">Workstations</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-xl font-medium">
              Experience the power of next-gen computing. Built for professionals who demand speed, reliability, and silence.
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Button size="lg" className="px-8 text-lg h-12 shadow-lg shadow-primary/20">Shop Now</Button>
              <Button variant="outline" size="lg" className="px-8 text-lg h-12 bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80">View Details</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 border-b border-border/60 bg-slate-50/30">
        <div className="container-width">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "Free Shipping", text: "On orders over \u20AC99.00", icon: "\uD83D\uDE9A" },
              { title: "Fast Delivery", text: "Same-day shipping available", icon: "\u26A1" },
              { title: "Secure Checkout", text: "Protected by SSL encryption", icon: "\uD83D\uDD12" },
            ].map((item, i) => (
              <Card key={i} className="border-none shadow-none bg-transparent">
                <CardContent className="flex items-center gap-4 pt-6">
                  <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-sm text-primary">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      {categories.length > 0 && (
        <section className="py-24 bg-white border-b border-border/60">
          <div className="container-width">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Shop by Category</h2>
              <p className="text-muted-foreground text-lg">Browse our wide range of premium components and peripherals.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {categories.map((category) => (
                <Link
                  key={category.categoryId}
                  href={localizeHref(`/category/${category.categoryId}/${category.slug}`, language)}
                  className="group"
                >
                  <Card className="h-full border-border/60 hover:border-primary/30 transition-all duration-300 cursor-pointer hover:shadow-lg hover:-translate-y-1 bg-white">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full gap-5">
                      <div className="text-4xl group-hover:scale-110 transition-transform duration-300 p-4 bg-slate-50 rounded-full group-hover:bg-primary/5">{category.icon}</div>
                      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{category.name}</h4>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
