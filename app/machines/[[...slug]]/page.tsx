'use client';

/**
 * Machines route — a single optional-catch-all that matches BOTH the root
 * (`/machines`) and any drill-down (`/machines/a/b/…`, up to `MACHINE_MAX_DEPTH`),
 * because the package `<MachineGrid>` handles both modes. This page is a thin
 * host: it owns the Next-specific glue the framework-agnostic package can't —
 * reading the URL (`useParams`/`useSearchParams`), the depth cap (`notFound`),
 * the MY_INSTALLATIONS company read, and mapping listing changes back to the URL.
 *
 * All machine/parts fetching, rendering and navigation live in `<MachineGrid>`.
 * Currently CSR (queries visible in the network tab); the package already
 * supports an SSR seed for a later hybrid restoration.
 */

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter, notFound } from 'next/navigation';
import type { Product } from '@propeller-commerce/propeller-sdk-v2';
import { MachineGrid, type MachineListingState } from '@propeller-commerce/propeller-v2-react-ui';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { config, localizeHref } from '@/data/config';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { useTranslations } from '@/lib/i18n/client';
import { parseListingParams, buildListingSearchParams } from '@/lib/listingParams';
import {
  MACHINE_LANGUAGE,
  MACHINE_MAX_DEPTH,
  MACHINE_SORT_FIELD_DEFAULT,
  MACHINE_SORT_ORDER_DEFAULT,
  resolveInstallationIds,
} from '@/lib/machines';

export default function MachinesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { state: authState } = useAuth();
  const { selectedCompany } = useCompany();
  const { cart, saveCart } = useCart();

  const paginationLabels = useTranslations('GridPagination');
  const filtersLabels = useTranslations('GridFilters');
  const toolbarLabels = useTranslations('GridToolbar');

  // Guard: /machines is for logged-in contacts. `user` is null until getViewer
  // resolves, so key on isAuthenticated (which hydrates synchronously from the
  // userHint); wait for isLoading to settle before bouncing anonymous visitors
  // to login. Mirrors app/account/layout.tsx.
  useEffect(() => {
    if (!authState.isLoading && !authState.isAuthenticated) {
      router.push(localizeHref('/login', language));
    }
  }, [authState.isLoading, authState.isAuthenticated, router, language]);

  const raw = params.slug;
  const segments = Array.isArray(raw) ? raw : raw ? [raw] : [];
  // WP silently 404s past the last rewrite rule; be explicit.
  if (segments.length > MACHINE_MAX_DEPTH) notFound();

  const source = config.machines?.source;
  const sourceIds = resolveInstallationIds(authState.user, selectedCompany?.companyId);

  const parsed = parseListingParams(searchParams, MACHINE_SORT_FIELD_DEFAULT);
  const listing: MachineListingState = { ...parsed, term: searchParams.get('term') ?? '' };
  const basePath = localizeHref('/machines', language);

  const onListingChange = (next: MachineListingState) => {
    const query = buildListingSearchParams(next, {
      defaultSortField: MACHINE_SORT_FIELD_DEFAULT,
      defaultSortOrder: MACHINE_SORT_ORDER_DEFAULT,
    });
    const path = [basePath, ...segments].join('/');
    router.push(query ? `${path}?${query}` : path, { scroll: false });
  };

  // Anonymous visitors are redirected by the effect above; render nothing until
  // auth settles so no machine data flashes for a non-contact.
  if (authState.isLoading || !authState.isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width">
          {/* key forces a fresh mount per node so sibling nav re-seeds cleanly. */}
          <MachineGrid
            key={segments.join('/')}
            segments={segments}
            basePath={basePath}
            source={source}
            sourceIds={sourceIds}
            machineLanguage={MACHINE_LANGUAGE}
            listing={listing}
            onListingChange={onListingChange}
            configuration={{
              imageSearchFiltersGrid: config.imageSearchFiltersGrid,
              imageVariantFiltersMedium: config.imageVariantFiltersMedium,
            }}
            cartId={cart?.cartId}
            onCartCreated={(c) => saveCart(c)}
            afterAddToCart={(c) => saveCart(c)}
            onProductClick={(product: Product) =>
              router.push(config.urls.getProductUrl(product, language))
            }
            paginationLabels={paginationLabels}
            filtersLabels={filtersLabels}
            toolbarLabels={toolbarLabels}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
