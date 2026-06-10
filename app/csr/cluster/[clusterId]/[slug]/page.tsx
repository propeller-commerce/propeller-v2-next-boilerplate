'use client';

/**
 * ──────────────────────────────────────────────────────────────────────────
 * LEGACY CSR variant of the Cluster page.
 *
 * The original fully client-side implementation, kept verbatim for
 * comparison and as a fallback. Reachable at `/csr/cluster/[clusterId]/[slug]`.
 *
 * The CANONICAL page is the hybrid-SSR version at
 * `app/cluster/[clusterId]/[slug]/page.tsx` (server shell + ClusterDetailIsland).
 *
 * Do not add features here — change the SSR page. This copy exists only so
 * the pre-SSR behaviour stays observable side-by-side.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ClusterConfigurator } from '@propeller-commerce/propeller-v2-react-ui';
import { ClusterOptions } from '@propeller-commerce/propeller-v2-react-ui';
import { ClusterInfo } from '@propeller-commerce/propeller-v2-react-ui';
import { Cart, Cluster, CrossupsellType, Product, ProductPrice as ProductPriceSDK } from '@propeller-commerce/propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { ProductGallery } from '@propeller-commerce/propeller-v2-react-ui';
import { Breadcrumbs } from '@propeller-commerce/propeller-v2-react-ui';
import { config, localizeHref } from '@/data/config';
import { useAuth } from '@/context/AuthContext';
import { ProductPrice as ProductPriceDisplay } from '@propeller-commerce/propeller-v2-react-ui';
import { ProductBulkPrices } from '@propeller-commerce/propeller-v2-react-ui';
import { ProductShortDescription } from '@propeller-commerce/propeller-v2-react-ui';
import { ItemStock } from '@propeller-commerce/propeller-v2-react-ui';
import { AddToCart } from '@propeller-commerce/propeller-v2-react-ui';
import { AddToFavorite } from '@propeller-commerce/propeller-v2-react-ui';
import { ProductTabs } from '@propeller-commerce/propeller-v2-react-ui';
import { usePrice } from '@/context/PriceContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCompany } from '@/context/CompanyContext';
import { ProductSlider } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';

// const clusterService = new ClusterService(graphqlClient); // ← moved to ClusterInfo

export default function ClusterPage() {
  const params = useParams();
  const clusterId = parseInt(params.clusterId as string);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptionProducts, setSelectedOptionProducts] = useState<Record<number, Product>>({});
  const [showClusterErrors, setShowClusterErrors] = useState(false);

  const { cart, saveCart } = useCart();
  const { state, refreshUser } = useAuth();
  const { selectedCompany } = useCompany();
  const { includeTax } = usePrice();
  const { language } = useLanguage();
  const router = useRouter();
  const breadcrumbsLabels = useTranslations('Breadcrumbs');
  const productBulkPricesLabels = useTranslations('ProductBulkPrices');
  const itemStockLabels = useTranslations('ItemStock');
  const clusterConfiguratorLabels = useTranslations('ClusterConfigurator');
  const clusterOptionsLabels = useTranslations('ClusterOptions');
  const addToCartLabels = useTranslations('AddToCart');
  const addToFavoriteLabels = useTranslations('AddToFavorite');
  const productTabsLabels = useTranslations('ProductTabs');
  const productSliderLabels = useTranslations('ProductSlider');
  const productGalleryLabels = useTranslations('ProductGallery');
  const productCardLabels = useTranslations('ProductCard');
  const clusterCardLabels = useTranslations('ClusterCard');
  const productPriceLabels = useTranslations('ProductPrice');

  // ── Old fetch effect — now handled by ClusterInfo via onClusterLoaded ──────
  /*
  useEffect(() => {
    const fetchCluster = async () => {
      setLoading(true);
      try {
        const clusterConfig = await clusterService.getClusterConfig(clusterId);
        console.log(clusterConfig);

        const clusterAttributesNames = clusterConfig?.config?.settings?.map((setting: ClusterConfigSetting) => setting.name) || [];

        const variables: ClusterQueryVariables = {
          clusterId,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          imageSearchFilters: imageSearchFiltersGrid,
          imageVariantFilters: imageVariantFiltersMedium,
          attributeResultSearchInput: {
            attributeDescription: {
              names: clusterAttributesNames
            }
          }
        };

        const data = await clusterService.getCluster(variables);
        setCluster(data);

        // Set default product as initially selected
        if (data.defaultProduct) {
          setSelectedProduct(data.defaultProduct as Product);
        }
      } catch (error) {
        console.error('Failed to load cluster:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCluster();
  }, [clusterId]);
  */

  // ── Cluster loaded callback (from ClusterInfo) ────────────────────────────
  const handleClusterLoaded = (loadedCluster: Cluster) => {
    setCluster(loadedCluster);
    if (loadedCluster.defaultProduct) {
      setSelectedProduct(loadedCluster.defaultProduct as Product);
    }
  };

  // ── Event handlers ─────────────────────────────────────────────────────────

  const validateClusterOptions = (): boolean => {
    if (!cluster?.options) return true;
    const hasUnfilled = cluster.options.some(
      opt => opt.hidden !== 'Y' && opt.isRequired === 'Y' && !(opt.id in selectedOptionProducts)
    );
    if (hasUnfilled) {
      setShowClusterErrors(true);
      return false;
    }
    return true;
  };

  const handleOptionSelect = (product: Product) => {
    const option = cluster?.options?.find(opt =>
      opt.products?.some(p => p.productId === product.productId)
    );
    if (option) {
      setSelectedOptionProducts(prev => ({ ...prev, [option.id]: product }));
    }
  };

  const handleOptionClear = (optionId: number) => {
    setSelectedOptionProducts(prev => {
      if (!(optionId in prev)) return prev;
      const next = { ...prev };
      delete next[optionId];
      return next;
    });
  };

  // Update URL slug when language or cluster changes — use history.replaceState
  // to avoid a Next.js re-render cascade that would trigger a second API fetch.
  useEffect(() => {
    if (!cluster) return;
    const slugs = cluster.slugs || cluster.defaultProduct?.slugs;
    const match = slugs?.find((s: { language?: string; value?: string }) => s.language === language);
    const slug = match?.value || slugs?.[0]?.value || '';
    const currentSlug = window.location.pathname.split('/').pop();
    if (slug && slug !== currentSlug) {
      window.history.replaceState(null, '', localizeHref(`/cluster/${clusterId}/${slug}`, language));
    }
  }, [cluster, language, clusterId]);

  // ── Derived display values ─────────────────────────────────────────────────

  const displayProduct = selectedProduct || cluster?.defaultProduct;
  const images: string[] = displayProduct?.media?.images?.items
    ?.map(image => image.imageVariants?.[0]?.url)
    .filter((url): url is string => !!url) ?? [];
  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-width">
          <div className="propeller-breadcrumbs mb-6">
            <Breadcrumbs
              categoryPath={selectedProduct?.categoryPath || []}
              currentCategory={selectedProduct?.category || undefined}
              showCurrent={true}
              labels={breadcrumbsLabels}
            />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Image Gallery */}
            <div className="bg-white rounded-lg shadow p-6">
              {/* Gallery Column */}
              <ProductGallery images={images} labels={productGalleryLabels} />
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col">
              <div className="mb-6">
                {/* ClusterInfo: fetches cluster config + cluster, fires onClusterLoaded, renders title + SKU */}
                <ClusterInfo
                  clusterId={clusterId}
                  onClusterLoaded={handleClusterLoaded}
                  imageSearchFilters={config.imageSearchFilters}
                  imageVariantFilters={config.imageVariantFiltersLarge}
                />

                {cluster && (
                  <>
                    <ProductPriceDisplay
                      price={(selectedProduct?.price ?? cluster.defaultProduct?.price) as ProductPriceSDK}
                      options={cluster.options}
                      selectedOptionProducts={Object.values(selectedOptionProducts)}
                    />

                    <ProductBulkPrices bulkPrices={selectedProduct?.bulkPrices || []} labels={productBulkPricesLabels} />

                    <div className="mt-6">
                      <ProductShortDescription product={selectedProduct as Product} />
                    </div>

                    {selectedProduct?.inventory && (
                      <div className="mt-4">
                        <ItemStock inventory={selectedProduct.inventory} showAvailability={false} labels={itemStockLabels} />
                      </div>
                    )}

                    {/* Cluster Configurator */}
                    {cluster.products && cluster.products.length > 1 && cluster.config && (
                      <div className="mt-6 mb-6 pb-6 border-b border-gray-200">
                        <ClusterConfigurator
                          clusterId={clusterId}
                          products={cluster.products as Product[]}
                          config={cluster.config}
                          defaultProduct={cluster.defaultProduct as Product}
                          onConfigurationChange={(product: Product) => setSelectedProduct(product)}
                          labels={clusterConfiguratorLabels}
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
                          labels={clusterOptionsLabels}
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
                    childItems={Object.values(selectedOptionProducts).map((p) => p.productId)}
                    cartId={cart?.cartId}
                    createCart={true}
                    onCartCreated={(cart: Cart) => {
                      saveCart(cart);
                    }}
                    className='flex items-center w-full gap-2'
                    showModal={true}
                    afterAddToCart={(cart: Cart) => {
                      saveCart(cart);
                    }}
                    onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
                    onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
                    labels={addToCartLabels} />
                  <AddToFavorite
                    clusterId={clusterId}
                    onFavoriteChanged={refreshUser}
                    labels={addToFavoriteLabels}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Product Tabs - Description, Specifications, etc. */}
          {displayProduct && (
            <ProductTabs product={displayProduct as Product} productId={(displayProduct as Product).productId} className='pb-8' labels={productTabsLabels} />
          )}

          <ProductSlider
            crossUpsellTypes={[CrossupsellType.ACCESSORIES]}
            clusterId={clusterId}
            taxZone="NL"
            showAvailability={false}
            showStock={true}
            cartId={cart?.cartId}
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
            showModal={true}
            onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
            onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
            onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
            labels={productSliderLabels}
            productCardLabels={productCardLabels}
            clusterCardLabels={clusterCardLabels}
            addToCartLabels={addToCartLabels}
            stockLabels={itemStockLabels}
            priceLabels={productPriceLabels}
          />
          <ProductSlider
            crossUpsellTypes={[CrossupsellType.ALTERNATIVES]}
            clusterId={clusterId}
            taxZone="NL"
            showAvailability={false}
            showStock={true}
            cartId={cart?.cartId}
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
            showModal={true}
            onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
            onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
            onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
            labels={productSliderLabels}
            productCardLabels={productCardLabels}
            clusterCardLabels={clusterCardLabels}
            addToCartLabels={addToCartLabels}
            stockLabels={itemStockLabels}
            priceLabels={productPriceLabels}
          />
          <ProductSlider
            crossUpsellTypes={[CrossupsellType.RELATED]}
            clusterId={clusterId}
            taxZone="NL"
            showAvailability={false}
            showStock={true}
            cartId={cart?.cartId}
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
            showModal={true}
            onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
            onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
            onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
            labels={productSliderLabels}
            productCardLabels={productCardLabels}
            clusterCardLabels={clusterCardLabels}
            addToCartLabels={addToCartLabels}
            stockLabels={itemStockLabels}
            priceLabels={productPriceLabels}
          />
          <ProductSlider
            crossUpsellTypes={[CrossupsellType.OPTIONS]}
            clusterId={clusterId}
            taxZone="NL"
            showAvailability={false}
            showStock={true}
            cartId={cart?.cartId}
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
            showModal={true}
            onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
            onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
            onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
            labels={productSliderLabels}
            productCardLabels={productCardLabels}
            clusterCardLabels={clusterCardLabels}
            addToCartLabels={addToCartLabels}
            stockLabels={itemStockLabels}
            priceLabels={productPriceLabels}
          />
          <ProductSlider
            crossUpsellTypes={[CrossupsellType.PARTS]}
            clusterId={clusterId}
            taxZone="NL"
            showAvailability={false}
            showStock={true}
            cartId={cart?.cartId}
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
            showModal={true}
            onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
            onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
            onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
            labels={productSliderLabels}
            productCardLabels={productCardLabels}
            clusterCardLabels={clusterCardLabels}
            addToCartLabels={addToCartLabels}
            stockLabels={itemStockLabels}
            priceLabels={productPriceLabels}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
