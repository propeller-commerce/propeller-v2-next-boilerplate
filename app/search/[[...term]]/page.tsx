/**
 * Search Page — Server Component (hybrid SSR).
 *
 * Mirrors the category page: this Server Component resolves the search term
 * from the route, fetches the first page of matching products directly from
 * the upstream Propeller GraphQL API, server-renders the static heading, and
 * delegates the interactive grid/filters/toolbar/pagination to `SearchIsland`
 * — seeded with the server-fetched first page so the first paint shows real
 * product cards (and crawlers see indexable results).
 *
 * Caching: anonymous → cacheable (`revalidate`); authenticated → dynamic via
 * the auth-cookie read in `getServerInfra()`. See `lib/server.ts`.
 *
 * The `[[...term]]` optional catch-all means this route also serves the
 * "all products" listing when no term is present — in that case we fetch the
 * base category instead of running a term search.
 */

import { Suspense } from 'react';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import { GridTitle, ItemListJsonLd } from 'propeller-v2-react-ui/pure';
import {
  ProductSortField,
  type Product,
  type ProductsResponse,
} from 'propeller-sdk-v2';
import { getListingInfra, fetchSearch, fetchCategory } from '@/lib/server';
import { buildJsonLdContext } from '@/lib/seo';
import { config } from '@/data/config';
import {
  parseListingParams,
  buildTextFilters,
  type RawSearchParams,
} from '@/lib/listingParams';
import SearchIsland from './SearchIsland';

interface RouteParams {
  term?: string[];
}

/** Anonymous variant is cacheable for 5 min; authenticated renders are dynamic. */
export const revalidate = 300;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { term: termSegments } = await params;
  const term = termSegments?.[0] ? decodeURIComponent(termSegments[0]) : '';
  const isAllProducts = !term;

  // Parse the URL query so the server-rendered first page reflects active
  // filters / sort / page — a refreshed filtered search URL restores.
  const listing = parseListingParams(
    await searchParams,
    ProductSortField.RELEVANCE
  );

  const infra = await getListingInfra();

  // The (possibly filtered) fetch options, straight from the URL.
  const fetchOpts = {
    page: listing.page,
    offset: listing.offset,
    sortField: listing.sortField,
    sortOrder: listing.sortOrder,
    textFilters: buildTextFilters(listing.filters),
    priceFilterMin: listing.minPrice,
    priceFilterMax: listing.maxPrice,
  };

  // Term search → query the base category with a search term + boosted
  // fields. No term → plain base-category listing ("all products").
  let initialProducts: ProductsResponse | null = null;
  if (isAllProducts) {
    const category = await fetchCategory(
      infra,
      config.baseCategoryId,
      fetchOpts
    );
    initialProducts =
      (category?.products as ProductsResponse | undefined) ?? null;
  } else {
    initialProducts = await fetchSearch(
      infra,
      config.baseCategoryId,
      term,
      fetchOpts
    );
  }

  const heading = isAllProducts
    ? 'All products'
    : `Search results for "${term}"`;

  const jsonLdContext = buildJsonLdContext(infra);
  const firstPageItems = (initialProducts?.items ?? []) as Product[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* schema.org ItemList of the first-page search results. Body-level. */}
      <ItemListJsonLd products={firstPageItems} context={jsonLdContext} />
      <HeaderServer />
      <main className="flex-1 py-8">
        <div className="container-width">
          {/* Search heading — server-rendered, pure RSC component. */}
          <GridTitle title={heading} language={infra.language} />

          {/* key forces a fresh mount when the search term changes. The island
              seeds all its state (filters, sort, page) from `initialParams` via
              `useState` initializers, which only run on mount. Without the key,
              changing the term (or going term → all-products) reuses the same
              instance and carries the previous term's active filters into the
              new fetch, returning 0 products until a full refresh. Mirrors the
              category page fix. */}
          {/* Suspense future-proofs the static shell against inner async
              (PPR-ready). Fallback is null because the island seeds
              synchronously today. */}
          <Suspense fallback={null}>
            <SearchIsland
              key={term || '__all__'}
              term={term}
              isAllProducts={isAllProducts}
              initialProducts={initialProducts}
              initialParams={listing}
            />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
