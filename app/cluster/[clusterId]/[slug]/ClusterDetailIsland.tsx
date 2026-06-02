'use client';

/**
 * ClusterDetailIsland — the interactive client half of the cluster page.
 *
 * The Server Component (`page.tsx`) fetches the cluster and passes it here as
 * `initialCluster`. This island seeds all of its state from that data:
 *   - `cluster` starts as `initialCluster` (no client refetch).
 *   - `selectedProduct` starts as `initialCluster.defaultProduct`.
 *   - `ClusterInfo` receives the `cluster` prop, so it skips its internal
 *     fetch and fires `onClusterLoaded` immediately.
 *
 * Because the first render is fully determined by the server-fetched data,
 * the island's SSR/hydration markup matches — the default product's title,
 * price, short description and stock are in the initial HTML. Configurator
 * interaction then updates the displayed product client-side, exactly as the
 * original page did.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClusterConfigurator,
  ClusterOptions,
  ClusterInfo,
  ProductGallery,
  Breadcrumbs,
  ProductPrice as ProductPriceDisplay,
  ProductBulkPrices,
  ProductShortDescription,
  ItemStock,
  AddToCart,
  AddToFavorite,
  ProductTabs,
  ProductSlider,
} from 'propeller-v2-react-ui';
import {
  Cart,
  Cluster,
  CrossupsellType,
  Product,
  ProductPrice as ProductPriceSDK,
} from 'propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { usePrice } from '@/context/PriceContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCompany } from '@/context/CompanyContext';
import { config, localizeHref } from '@/data/config';

interface ClusterDetailIslandProps {
  /** Numeric cluster ID from the route. */
  clusterId: number;
  /** The cluster fetched server-side. Seeds all initial state. */
  initialCluster: Cluster;
}

export default function ClusterDetailIsland({
  clusterId,
  initialCluster,
}: ClusterDetailIslandProps) {
  // Seeded from the server-fetched cluster — first render === SSR HTML.
  const [cluster, setCluster] = useState<Cluster | null>(initialCluster);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    (initialCluster.defaultProduct as Product | undefined) ?? null
  );
  const [selectedOptionProducts, setSelectedOptionProducts] = useState<
    Record<number, Product>
  >({});
  const [showClusterErrors, setShowClusterErrors] = useState(false);

  const { cart, saveCart } = useCart();
  const { state, refreshUser } = useAuth();
  const { selectedCompany } = useCompany();
  const { includeTax } = usePrice();
  const { language } = useLanguage();
  const router = useRouter();

  // ClusterInfo fires this once it has the cluster — immediately, since we
  // pass it the pre-fetched `cluster` prop.
  const handleClusterLoaded = (loadedCluster: Cluster) => {
    setCluster(loadedCluster);
    if (loadedCluster.defaultProduct) {
      setSelectedProduct(loadedCluster.defaultProduct as Product);
    }
  };

  const validateClusterOptions = (): boolean => {
    if (!cluster?.options) return true;
    const hasUnfilled = cluster.options.some(
      (opt) =>
        opt.hidden !== 'Y' &&
        opt.isRequired === 'Y' &&
        !(opt.id in selectedOptionProducts)
    );
    if (hasUnfilled) {
      setShowClusterErrors(true);
      return false;
    }
    return true;
  };

  const handleOptionSelect = (product: Product) => {
    const option = cluster?.options?.find((opt) =>
      opt.products?.some((p) => p.productId === product.productId)
    );
    if (option) {
      setSelectedOptionProducts((prev) => ({ ...prev, [option.id]: product }));
    }
  };

  const handleOptionClear = (optionId: number) => {
    setSelectedOptionProducts((prev) => {
      if (!(optionId in prev)) return prev;
      const next = { ...prev };
      delete next[optionId];
      return next;
    });
  };

  // Update URL slug when language or cluster changes — history.replaceState
  // to avoid a Next.js re-render cascade.
  //
  // IMPORTANT: pass the CURRENT `window.history.state`, not `null`. The App
  // Router keeps its navigation tree key in `history.state`; replacing it with
  // `null` desyncs the router from the real URL, which silently breaks
  // `<title>` / metadata updates on every subsequent soft navigation.
  useEffect(() => {
    if (!cluster) return;
    const slugs = cluster.slugs || cluster.defaultProduct?.slugs;
    const match = slugs?.find(
      (s: { language?: string; value?: string }) => s.language === language
    );
    const slug = match?.value || slugs?.[0]?.value || '';
    const currentSlug = window.location.pathname.split('/').pop();
    if (slug && slug !== currentSlug) {
      window.history.replaceState(
        window.history.state,
        '',
        localizeHref(`/cluster/${clusterId}/${slug}`, language)
      );
    }
  }, [cluster, language, clusterId]);

  const displayProduct = selectedProduct || cluster?.defaultProduct;
  const images: string[] =
    displayProduct?.media?.images?.items
      ?.map((image) => image.imageVariants?.[0]?.url)
      .filter((url): url is string => !!url) ?? [];

  return (
    <>
      <div className="propeller-breadcrumbs mb-6">
        <Breadcrumbs
          categoryPath={selectedProduct?.categoryPath || []}
          currentCategory={selectedProduct?.category || undefined}
          showCurrent={true}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Left: Image Gallery */}
        <div className="bg-white rounded-lg shadow p-6">
          <ProductGallery images={images} />
        </div>

        {/* Right: Product Info */}
        <div className="flex flex-col">
          <div className="mb-6">
            {/* ClusterInfo: receives the pre-fetched cluster, so it skips its
                internal fetch and fires onClusterLoaded immediately. */}
            <ClusterInfo
              cluster={cluster ?? undefined}
              clusterId={clusterId}
              onClusterLoaded={handleClusterLoaded}
              imageSearchFilters={config.imageSearchFilters}
              imageVariantFilters={config.imageVariantFiltersLarge}
            />

            {cluster && (
              <>
                <ProductPriceDisplay
                  price={
                    (selectedProduct?.price ??
                      cluster.defaultProduct?.price) as ProductPriceSDK
                  }
                  options={cluster.options}
                  selectedOptionProducts={Object.values(selectedOptionProducts)}
                />

                <ProductBulkPrices
                  bulkPrices={selectedProduct?.bulkPrices || []}
                />

                {/* Cluster owns the marketing description; variant products
                    typically ship with empty `shortDescriptions`. Prefer the
                    selected variant's text when present, otherwise fall back
                    to the cluster — mirrors the legacy PHP shop. */}
                <div className="mt-6">
                  <ProductShortDescription
                    product={
                      selectedProduct?.shortDescriptions?.length
                        ? (selectedProduct as Product)
                        : (cluster as Cluster)
                    }
                  />
                </div>

                {selectedProduct?.inventory && (
                  <div className="mt-4">
                    <ItemStock
                      inventory={selectedProduct.inventory}
                      showAvailability={false}
                    />
                  </div>
                )}

                {/* Cluster Configurator */}
                {cluster.products &&
                  cluster.products.length > 1 &&
                  cluster.config && (
                    <div className="mt-6 mb-6 pb-6 border-b border-gray-200">
                      <ClusterConfigurator
                        clusterId={clusterId}
                        products={cluster.products as Product[]}
                        config={cluster.config}
                        defaultProduct={cluster.defaultProduct as Product}
                        onConfigurationChange={(product: Product) =>
                          setSelectedProduct(product)
                        }
                      />
                    </div>
                  )}

                {/* Cluster Options */}
                {cluster.options && cluster.options.length > 0 && (
                  <div className="mb-6">
                    <ClusterOptions
                      clusterId={clusterId}
                      options={cluster.options}
                      onOptionSelect={handleOptionSelect}
                      onOptionClear={handleOptionClear}
                      showErrors={showClusterErrors}
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-2">
              <AddToCart
                product={selectedProduct as Product}
                cluster={cluster as Cluster}
                beforeAddToCart={validateClusterOptions}
                childItems={Object.values(selectedOptionProducts).map(
                  (p) => p.productId
                )}
                cartId={cart?.cartId}
                createCart={true}
                onCartCreated={(c: Cart) => {
                  saveCart(c);
                }}
                className="flex items-center w-full gap-2"
                showModal={true}
                afterAddToCart={(c: Cart) => {
                  saveCart(c);
                }}
                onProceedToCheckout={() =>
                  router.push(localizeHref('/checkout', language))
                }
                onRequestQuoteClick={() =>
                  router.push(localizeHref('/checkout?mode=quote', language))
                }
              />
              <AddToFavorite
                clusterId={clusterId}
                onFavoriteChanged={refreshUser}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Product Tabs — Description, Specifications, etc.
          Backfill `descriptions` / `shortDescriptions` from the cluster when
          the variant ships empty (the usual case — cluster owns the
          marketing copy, variants only carry SKU-specific differences). */}
      {displayProduct && (
        <ProductTabs
          product={
            {
              ...(displayProduct as Product),
              descriptions:
                (displayProduct as Product).descriptions?.length
                  ? (displayProduct as Product).descriptions
                  : cluster?.descriptions ?? [],
              shortDescriptions:
                (displayProduct as Product).shortDescriptions?.length
                  ? (displayProduct as Product).shortDescriptions
                  : cluster?.shortDescriptions ?? [],
            } as Product
          }
          productId={(displayProduct as Product).productId}
          className="pb-8"
        />
      )}

      {(
        [
          CrossupsellType.ACCESSORIES,
          CrossupsellType.ALTERNATIVES,
          CrossupsellType.RELATED,
          CrossupsellType.OPTIONS,
          CrossupsellType.PARTS,
        ] as CrossupsellType[]
      ).map((type) => (
        <ProductSlider
          key={type}
          crossUpsellTypes={[type]}
          clusterId={clusterId}
          taxZone="NL"
          showAvailability={false}
          showStock={true}
          cartId={cart?.cartId}
          createCart={true}
          onCartCreated={(newCart) => saveCart(newCart)}
          afterAddToCart={(updatedCart) => saveCart(updatedCart)}
          showModal={true}
          onProceedToCheckout={() =>
            router.push(localizeHref('/checkout', language))
          }
          onRequestQuoteClick={() =>
            router.push(localizeHref('/checkout?mode=quote', language))
          }
          onProductClick={(p) =>
            router.push(config.urls.getProductUrl(p, language))
          }
          onClusterClick={(c) =>
            router.push(config.urls.getClusterUrl(c, language))
          }
        />
      ))}
    </>
  );
}
