/**
 * Product Detail Page — Server Component.
 *
 * Hybrid SSR pattern (Phase C0 demo):
 *   1. This file is a Server Component. It runs on the server, fetches the
 *      product directly via the upstream Propeller GraphQL API (no proxy
 *      round-trip), and renders the above-the-fold static markup
 *      (Breadcrumbs, name, price, bulk prices, short description, stock).
 *      That HTML is in the initial response — visible with JS disabled.
 *   2. Everything interactive (gallery, AddToCart, AddToFavorite, ProductTabs,
 *      bundles, cross-sell sliders) lives in client components rendered
 *      below. Each one is its own 'use client' boundary; Next.js stitches
 *      them into the server-rendered tree.
 *
 * Why split here: PDP is the highest-traffic page, the page where SEO bots
 * spend the most time, and the page where above-the-fold render quality
 * matters most. Server-rendering the price and name removes a hydration
 * round-trip and lets crawlers see the real content.
 *
 * Reference: the existing `app/page.tsx` already uses the same pattern
 * (server CMS fetch + client `<HomeFallback>`).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HeaderServer from '@/components/layout/HeaderServer';
// NOTE: Breadcrumbs reads `configuration.urls.getCategoryUrl` (a function),
// which is non-serializable across the RSC boundary. After Phase E the
// package is bundled with `"use client"`, so passing `config` from this
// Server Component throws. Keep Breadcrumbs in the client island below.
import Footer from '@/components/layout/Footer';
// Pure / RSC-safe display components — imported from the `/pure` entry, which
// is built WITHOUT the `"use client"` banner so they render in this Server
// Component without drawing a Client boundary or shipping the client bundle.
import {
  ProductShortDescription,
  ItemStock,
} from 'propeller-v2-react-ui/pure';
// ProductGallery is interactive (Swiper, state) — stays on the client entry.
import { ProductGallery } from 'propeller-v2-react-ui';
import { fetchProduct, getServerInfra, getAnonymousInfra } from '@/lib/server';
import { config } from '@/data/config';
import { getLanguageString } from 'propeller-v2-react-ui/shared';
import {
  resolveSeoTitle,
  resolveSeoDescription,
  resolveCanonicalUrl,
} from '@/lib/seo';
import { ProductPrice as ProductPriceSDK } from 'propeller-sdk-v2';
import AddToCartIsland, {
  ProductBelowFoldIsland,
  ProductBreadcrumbsIsland,
  ProductPriceIsland,
} from './ProductDetailIsland';

interface RouteParams {
  productId: string;
  slug: string;
}

/**
 * Per-product SEO metadata. Uses the product's curated `metadataTitles` /
 * `metadataDescriptions` / `metadataCanonicalUrls` when populated, falling
 * back to the product `names` / `shortDescriptions` otherwise.
 *
 * Fetched anonymously — SEO metadata is identical for every viewer, so this
 * avoids coupling it to the auth cookie. Without a curated canonical, Next.js
 * defaults `alternates.canonical` to the request URL.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { productId: productIdStr } = await params;
  const productId = Number.parseInt(productIdStr, 10);
  if (!Number.isFinite(productId)) return {};

  const infra = getAnonymousInfra();
  const product = await fetchProduct(infra, productId, infra.language);
  if (!product) return {};

  const title = resolveSeoTitle(
    product.metadataTitles,
    product.names,
    infra.language
  );
  const description = resolveSeoDescription(
    product.metadataDescriptions,
    [product.shortDescriptions, product.descriptions],
    infra.language
  );
  const canonical = resolveCanonicalUrl(
    product.metadataCanonicalUrls,
    infra.language
  );

  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      ...(title && { title }),
      ...(description && { description }),
      type: 'website',
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { productId: productIdStr } = await params;
  const productId = Number.parseInt(productIdStr, 10);
  if (!Number.isFinite(productId)) notFound();

  const infra = await getServerInfra();
  const product = await fetchProduct(infra, productId, infra.language);
  if (!product) notFound();

  const price = product.price as ProductPriceSDK;
  const title = getLanguageString(product.names, infra.language, '');
  const images: string[] = (product.media?.images?.items ?? [])
    .map((image: { imageVariants?: { url?: string }[] }) => image.imageVariants?.[0]?.url)
    .filter((url: string | undefined): url is string => !!url);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderServer />
      <main className="flex-1 py-12">
        <div className="container-width max-w-5xl">
          {/* Above the fold — pure RSC. Visible in initial HTML.
              Breadcrumbs is wrapped in a client island because its
              `configuration` prop holds function-valued URL builders that
              aren't serializable from a Server Component once the package is
              bundled with "use client". */}
          <div className="propeller-breadcrumbs mb-6">
            <ProductBreadcrumbsIsland
              categoryPath={product.categoryPath || []}
              currentCategory={product.category || undefined}
              language={infra.language}
              currentLabel={title}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left column — gallery (client island, but layout is server-controlled). */}
            <div className="bg-white rounded-lg shadow p-6">
              <ProductGallery images={images} />
            </div>

            {/* Right column — server-rendered name/price/desc/stock, then the
                interactive AddToCart+AddToFavorite card (client). */}
            <div className="flex flex-col">
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-4">{title}</h1>
                {/* Price + bulk prices live in a client island so the
                    Header's VAT toggle (PriceContext, localStorage-backed)
                    reactively flips the leading price. The pure components
                    themselves are unchanged — only the includeTax source. */}
                <ProductPriceIsland
                  price={price}
                  bulkPrices={(product.bulkPrices || []) as ProductPriceSDK[]}
                  surcharges={product.surcharges || []}
                  user={infra.user}
                  portalMode={infra.portalMode}
                />
                <div className="mt-6">
                  <ProductShortDescription product={product} language={infra.language} />
                </div>
                {product.inventory && (
                  <div className="mt-4">
                    <ItemStock inventory={product.inventory} showAvailability={false} />
                  </div>
                )}
              </div>

              {/* AddToCart + AddToFavorite — client island. */}
              <AddToCartIsland product={product} productId={productId} />
            </div>
          </div>

          {/* Below-the-fold — tabs, bundles, cross-sells (all client). */}
          <ProductBelowFoldIsland product={product} productId={productId} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
