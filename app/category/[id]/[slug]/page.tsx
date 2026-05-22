/**
 * Category Page — Server Component (hybrid SSR).
 *
 * Same pattern as the PDP (`app/product/[productId]/[slug]/page.tsx`):
 *   1. This file is a Server Component. It fetches the category — including
 *      its first page of products — directly from the upstream Propeller
 *      GraphQL API and server-renders the static above-the-fold markup
 *      (title, breadcrumbs, CMS banner). That HTML is in the initial
 *      response, so crawlers and a JS-disabled browser see real content.
 *   2. The interactive grid (filters, toolbar, pagination, the URL-driven
 *      state machine) lives in `CategoryIsland` — a `"use client"` boundary
 *      seeded with the server-fetched first page so the first paint already
 *      shows real product cards. After any filter/sort/page change the
 *      island re-fetches client-side.
 *
 * Caching: anonymous requests go through `getAnonymousInfra()` (no cookie
 * read → this route can be cached / `revalidate`d). Authenticated requests
 * go through `getServerInfra()` (the cookie read opts the route into dynamic
 * rendering → logged-in users always get fresh, contact-priced HTML).
 * `getListingInfra()` picks the right one. See `lib/server.ts`.
 */

import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { GridTitle } from 'propeller-v2-react-ui/pure';
import { getListingInfra, fetchCategory } from '@/lib/server';
import { getCategoryBanner } from '@/lib/cms';
import type { CmsCategoryBanner } from '@/lib/cms/types';
import CategoryBanner from '@/components/cms/blocks/CategoryBanner';
import CategoryIsland from './CategoryIsland';

interface RouteParams {
  id: string;
  slug: string;
}

/**
 * `revalidate` applies to the *anonymous*, statically-rendered variant.
 * Authenticated renders read the auth cookie via `getServerInfra()`, which
 * forces dynamic rendering and bypasses this window entirely.
 * 300s = catalog data is allowed to be up to 5 minutes stale for crawlers
 * and anonymous traffic; tune to the real catalog change rate.
 */
export const revalidate = 300;

export default async function CategoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id, slug } = await params;
  const categoryId = Number.parseInt(id, 10);
  if (!Number.isFinite(categoryId)) notFound();

  // Anonymous → cacheable infra; authenticated → dynamic, personalised infra.
  const infra = await getListingInfra();

  // Fetch the category + its first page of products in one server round-trip.
  const category = await fetchCategory(infra, categoryId);
  if (!category) notFound();

  // Resolve the localized category name for the server-rendered <h1>.
  const categoryName =
    (category.name?.find((n) => n.language === infra.language)?.value ??
      category.name?.[0]?.value ??
      'Category') as string;

  // CMS banner — fetched server-side so it is in the initial HTML.
  const banner: CmsCategoryBanner | null = await getCategoryBanner(
    String(categoryId)
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width">
          {/* CMS Category Banner — server-rendered. */}
          {banner && <CategoryBanner banner={banner} />}

          {/* Category heading — server-rendered, pure RSC component. */}
          <GridTitle title={categoryName} language={infra.language} />

          {/* Everything interactive — breadcrumbs (config has non-serializable
              URL builders), filters, toolbar, grid, pagination — lives in the
              client island, seeded with the server-fetched first page. */}
          <CategoryIsland
            categoryId={categoryId}
            initialSlug={slug}
            initialCategory={category}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
