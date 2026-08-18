'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { graphqlClient } from '@/lib/api';
import { useMenu, type MenuCategory } from '@propeller-commerce/propeller-v2-react-ui';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useBaseCategoryId } from '@/context/BaseCategoryContext';
import { useTranslations } from '@/lib/i18n/client';

interface CategoryDisplay {
  id: number;
  name: string;
  icon: string;
  categoryId: number;
  slug: string;
}

// One vertical-neutral placeholder for every category. This used to be a
// per-index list of laptop/keyboard/console emoji, right only for an
// electronics shop and hunted down by hand by everyone else (PWP-942 #19).
const CATEGORY_ICON = '\uD83D\uDCE6';

export interface HomeFallbackProps {
  /**
   * Pre-fetched menu tree (same shape `<Menu tree={...} />` accepts). When
   * supplied \u2014 typically by the home page Server Component via
   * `fetchMenu(getAnonymousInfra(), BASE_CATEGORY_ID)` \u2014 the "Shop by
   * Category" grid renders from this immediately with no client-side
   * roundtrip and no loading flash.
   *
   * Omitting the prop falls back to the legacy client-side `useMenu` fetch.
   */
  menuTree?: MenuCategory[];
}

export default function HomeFallback({ menuTree }: HomeFallbackProps = {}) {
  const { language } = useLanguage();
  const t = useTranslations('Home');
  // Same server-resolved id the header and `HeaderServer` use. This module used
  // to hardcode its own '17' fallback, which happened to be right on one tenant
  // and wrong everywhere else.
  const baseCategoryId = useBaseCategoryId();

  // Fallback fetch only when no pre-fetched tree was supplied.
  const { categories: fetchedCategories, fetchMenu } = useMenu({
    graphqlClient,
    language,
  });

  const hasPrefetchedTree = Array.isArray(menuTree);
  const menuCategories: MenuCategory[] = hasPrefetchedTree ? menuTree! : fetchedCategories;

  const categories: CategoryDisplay[] = menuCategories.slice(0, 6).map((cat, index) => ({
    id: cat.categoryId,
    name: cat.name,
    icon: CATEGORY_ICON,
    categoryId: cat.categoryId,
    slug: cat.slug,
  }));

  useEffect(() => {
    // Skip the client-side fetch when the host pre-fetched the tree. This
    // mirrors the pattern in propeller-v2-react-ui's <Menu tree={...} />
    // component \u2014 see TECH.md \u00A77 "Pre-fetched data prop pattern".
    if (hasPrefetchedTree) return;
    fetchMenu(baseCategoryId);
  }, [hasPrefetchedTree, fetchMenu, baseCategoryId]);

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-[600px] flex items-center">
        {/* Placeholder backdrop drawn from the theme tokens. This was a 750KB
            photo of server hardware, which every non-electronics shop had to
            replace before it could demo (PWP-942 #19). Drop your own image in
            here when you have one. */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/15 via-background to-secondary/10">
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        </div>

        <div className="container-width relative z-10 w-full">
          <div className="max-w-2xl space-y-6 animate-in slide-in-from-left duration-700">
            <Badge variant="secondary" className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
              {t.heroBadge}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground sm:text-7xl drop-shadow-sm">
              {t.heroTitleLine1} <br />
              <span className="text-primary mt-2 block">{t.heroTitleLine2}</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-xl font-medium">
              {t.heroDescription}
            </p>
            <div className="mt-10 flex items-center gap-x-6">
              <Button size="lg" className="px-8 text-lg h-12 shadow-lg shadow-primary/20">{t.shopNow}</Button>
              <Button variant="outline" size="lg" className="px-8 text-lg h-12 bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-background/80">{t.viewDetails}</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 border-b border-border/60 bg-slate-50/30">
        <div className="container-width">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: t.freeShippingTitle, text: t.freeShippingText, icon: "\uD83D\uDE9A" },
              { title: t.fastDeliveryTitle, text: t.fastDeliveryText, icon: "\u26A1" },
              { title: t.secureCheckoutTitle, text: t.secureCheckoutText, icon: "\uD83D\uDD12" },
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
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">{t.shopByCategory}</h2>
              <p className="text-muted-foreground text-lg">{t.categorySubtitle}</p>
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
