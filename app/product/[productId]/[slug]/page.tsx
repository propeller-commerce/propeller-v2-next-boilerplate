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

import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumbs from '@/components/propeller/Breadcrumbs';
import ProductPrice from '@/components/propeller/ProductPrice';
import ProductBulkPrices from '@/components/propeller/ProductBulkPrices';
import ProductShortDescription from '@/components/propeller/ProductShortDescription';
import ItemStock from '@/components/propeller/ItemStock';
import ProductGallery from '@/components/propeller/ProductGallery';
import { fetchProduct, getServerInfra } from '@/lib/api/server';
import { config } from '@/data/config';
import { getLanguageString } from '@/composables/shared/utils/languageResolver';
import { ProductPrice as ProductPriceSDK } from 'propeller-sdk-v2';
import AddToCartIsland, { ProductBelowFoldIsland } from './ProductDetailIsland';

interface RouteParams {
  productId: string;
  slug: string;
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
  const images: string[] = product.media?.images?.items
    ?.map((image) => image.imageVariants?.[0]?.url)
    .filter((url): url is string => !!url) ?? [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-width max-w-5xl">
          {/* Above the fold — pure RSC. Visible in initial HTML. */}
          <div className="propeller-breadcrumbs mb-6">
            <Breadcrumbs
              categoryPath={product.categoryPath || []}
              currentCategory={product.category || undefined}
              language={infra.language}
              configuration={config}
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
                <ProductPrice
                  price={price}
                  includeTax={infra.includeTax}
                  user={infra.user}
                  portalMode={infra.portalMode}
                />
                <div className="mt-6">
                  <ProductBulkPrices
                    bulkPrices={product.bulkPrices || []}
                    includeTax={infra.includeTax}
                    user={infra.user}
                    portalMode={infra.portalMode}
                    labels={{ title: '' }}
                  />
                </div>
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
