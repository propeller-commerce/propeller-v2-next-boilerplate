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

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import { GridTitle, ItemListJsonLd } from 'propeller-v2-react-ui/pure';
import {
  getListingInfra,
  getAnonymousInfra,
  fetchCategory,
} from '@/lib/server';
import { getCategoryBanner } from '@/lib/cms';
import type { CmsCategoryBanner } from '@/lib/cms/types';
import CategoryBanner from '@/components/cms/blocks/CategoryBanner';
import {
  resolveSeoTitle,
  resolveSeoDescription,
  resolveCanonicalUrl,
  resolveSeoKeywords,
  buildJsonLdContext,
} from '@/lib/seo';
import {
  parseListingParams,
  buildTextFilters,
  type RawSearchParams,
} from '@/lib/listingParams';
import { ProductSortField, type Product, type ProductsResponse } from '@propeller-commerce/propeller-sdk-v2';
import CategoryIsland, { CategoryBreadcrumbsIsland } from './CategoryIsland';

interface RouteParams {
  id: string;
  slug: string;
}

/**
 * Per-category SEO metadata. Uses the category's curated `metadataTitles` /
 * `metadataDescriptions` / `metadataCanonicalUrls` / `metadataKeywords` when
 * populated, falling back to the category `name` / `shortDescription`.
 *
 * Fetched anonymously with `offset: 1` — we only need the category's own
 * metadata fields here, not the full product page.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const categoryId = Number.parseInt(id, 10);
  if (!Number.isFinite(categoryId)) return {};

  const infra = getAnonymousInfra();
  const category = await fetchCategory(infra, categoryId, { offset: 1 });
  if (!category) return {};

  const title = resolveSeoTitle(
    category.metadataTitles,
    category.name,
    infra.language
  );
  const description = resolveSeoDescription(
    category.metadataDescriptions,
    [category.shortDescription, category.description],
    infra.language
  );
  const canonical = resolveCanonicalUrl(
    category.metadataCanonicalUrls,
    infra.language
  );
  const keywords = resolveSeoKeywords(
    category.metadataKeywords,
    infra.language
  );

  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(keywords && { keywords }),
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      ...(title && { title }),
      ...(description && { description }),
      type: 'website',
    },
  };
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
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { id, slug } = await params;
  const categoryId = Number.parseInt(id, 10);
  if (!Number.isFinite(categoryId)) notFound();

  // Parse the URL query so the server-rendered first page reflects any
  // active filters / sort / page — i.e. refreshing a filtered URL
  // server-renders the filtered result, not the unfiltered set.
  const listing = parseListingParams(
    await searchParams,
    ProductSortField.CATEGORY_ORDER
  );

  // Anonymous → cacheable infra; authenticated → dynamic, personalised infra.
  const infra = await getListingInfra();

  // Fetch the category + the (possibly filtered) first page in one
  // server round-trip — the fetch options come straight from the URL.
  const category = await fetchCategory(infra, categoryId, {
    page: listing.page,
    offset: listing.offset,
    sortField: listing.sortField,
    sortOrder: listing.sortOrder,
    textFilters: buildTextFilters(listing.filters),
    priceFilterMin: listing.minPrice,
    priceFilterMax: listing.maxPrice,
  });
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

  const jsonLdContext = buildJsonLdContext(infra);
  // First-page items only — schema.org/ItemList captures what's in the SSR
  // HTML; filter/sort/page navigation does NOT re-emit. Crawlers see this
  // snapshot.
  const firstPageItems =
    ((category.products as ProductsResponse | undefined)?.items ?? []) as Product[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* schema.org ItemList of the first-page products. Body-level script. */}
      <ItemListJsonLd products={firstPageItems} context={jsonLdContext} />
      <HeaderServer />
      <main className="flex-1 py-8">
        <div className="container-width">
          {/* CMS Category Banner — server-rendered. */}
          {banner && <CategoryBanner banner={banner} />}

          {/* Breadcrumbs — wrapped in a client island because `config` holds
              function-valued URL builders that aren't serializable from a
              Server Component. Rendered ABOVE the title so the page order is
              Breadcrumbs → Title → Description → Grid. */}
          <div className="propeller-breadcrumbs mb-6">
            <CategoryBreadcrumbsIsland category={category} />
          </div>

          {/* Category heading — server-rendered, pure RSC component. */}
          <GridTitle title={categoryName} />

          {/* Everything interactive — breadcrumbs (config has non-serializable
              URL builders), filters, toolbar, grid, pagination — lives in the
              client island, seeded with the server-fetched first page. */}
          {/* key={categoryId} forces a fresh mount on every category change.
              The island seeds all its state (filters, sort, page, category,
              facet sidebar) from `initialParams`/`initialCategory` via
              `useState` initializers, which only run on mount. Without the key,
              a soft navigation to another category reuses the same instance and
              carries the previous category's active filters into the new
              category's fetch — the backend then returns 0 products (a filter
              the new category's facets don't have), and only a full refresh
              fixes it. The key makes navigation behave like a refresh. */}
          {/* Suspense boundary streams the static shell (heading, banner,
              breadcrumbs) independently of the client island's own work.
              Today the island is seeded synchronously, but wrapping it now
              future-proofs the page for any inner async (PPR, deferred
              data fetches, etc.). The fallback is intentionally minimal —
              the seeded path is the dominant case. */}
          <Suspense fallback={null}>
            <CategoryIsland
              key={categoryId}
              categoryId={categoryId}
              initialSlug={slug}
              initialCategory={category}
              initialParams={listing}
            />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
