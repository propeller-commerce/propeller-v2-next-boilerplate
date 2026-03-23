'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClusterConfigurator from '@/components/propeller/ClusterConfigurator';
import ClusterOptions from '@/components/propeller/ClusterOptions';
import ClusterInfo from '@/components/propeller/ClusterInfo';
import { Cluster, Product, ProductPrice as ProductPriceSDK } from 'propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import ProductGallery from '@/components/propeller/ProductGallery';
import Breadcrumbs from '@/components/propeller/Breadcrumbs';
import { config, localizeHref } from '@/data/config';
import { useAuth } from '@/context/AuthContext';
import ProductPriceDisplay from '@/components/propeller/ProductPrice';
import ProductBulkPrices from '@/components/propeller/ProductBulkPrices';
import ProductShortDescription from '@/components/propeller/ProductShortDescription';
import ItemStock from '@/components/propeller/ItemStock';
import AddToCart from '@/components/propeller/AddToCart';
import ProductTabs from '@/components/propeller/ProductTabs';
import { usePrice } from '@/context/PriceContext';
import { useLanguage } from '@/context/LanguageContext';

// const clusterService = new ClusterService(graphqlClient); // ← moved to ClusterInfo

export default function ClusterPage() {
  const params = useParams();
  const clusterId = parseInt(params.clusterId as string);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOptionProducts, setSelectedOptionProducts] = useState<Record<number, Product>>({});
  const [showClusterErrors, setShowClusterErrors] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { cart, saveCart, addToCart } = useCart();
  const { state } = useAuth();
  const { includeTax } = usePrice();
  const { language } = useLanguage();
  const router = useRouter();

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

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    const childItems: { productId: number; quantity: number }[] = Object.values(
      selectedOptionProducts
    ).map((p: Product) => ({ productId: p.productId, quantity }));

    const mainProductName = selectedProduct.names?.[0]?.value || cluster?.names?.[0]?.value || 'Product';

    await addToCart(
      selectedProduct.productId,
      quantity,
      mainProductName,
      clusterId,
      childItems.length > 0 ? childItems : undefined
    );
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
  const images: string[] = displayProduct?.media?.images?.items?.flatMap(
    image => image.imageVariants?.map(variant => variant.url).filter((url): url is string => !!url) ?? []
  ) ?? [];
  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-width">
          <div className="propeller-breadcrumbs mb-6">
            <Breadcrumbs categoryPath={selectedProduct?.categoryPath || []} language={language} configuration={config} showCurrent={true} />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Image Gallery */}
            <div className="bg-white rounded-lg shadow p-6">
              {/* Gallery Column */}
              <ProductGallery images={images} />
            </div>

            {/* Right: Product Info */}
            <div className="flex flex-col">
              <div className="mb-6">
                {/* ClusterInfo: fetches cluster config + cluster, fires onClusterLoaded, renders title + SKU */}
                <ClusterInfo
                  user={state.user}
                  clusterId={clusterId}
                  graphqlClient={graphqlClient}
                  onClusterLoaded={handleClusterLoaded}
                  language={language}
                  configuration={config}
                />

                {cluster && (
                  <>
                    <ProductPriceDisplay
                      price={(selectedProduct?.price ?? cluster.defaultProduct?.price) as ProductPriceSDK}
                      includeTax={includeTax}
                      options={cluster.options}
                      selectedOptionProducts={Object.values(selectedOptionProducts)}
                    />

                    <ProductBulkPrices bulkPrices={selectedProduct?.bulkPrices || []} includeTax={includeTax} />

                    <div className="mt-6">
                      <ProductShortDescription product={selectedProduct as Product} language={language} />
                    </div>

                    {selectedProduct?.inventory && (
                      <div className="mt-4">
                        <ItemStock inventory={selectedProduct.inventory} />
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
                          showErrors={showClusterErrors}
                        />
                      </div>
                    )}
                  </>
                )}

                <AddToCart
                  user={state.user}
                  product={selectedProduct as Product}
                  cluster={cluster as Cluster}
                  beforeAddToCart={validateClusterOptions}
                  childItems={Object.values(selectedOptionProducts).map((p) => p.productId)}
                  cartId={cart?.cartId}
                  graphqlClient={graphqlClient}
                  createCart={true}
                  onCartCreated={(cart) => {
                    saveCart(cart);
                  }}
                  className='flex items-center w-full gap-2'
                  configuration={config}
                  showModal={true}
                  afterAddToCart={(cart) => {
                    saveCart(cart);
                  }}
                  onProceedToCheckout={() => router.push(localizeHref('/checkout', language))} />
              </div>
            </div>
          </div>
          {/* Product Tabs - Description, Specifications, etc. */}
          <ProductTabs product={selectedProduct as Product} language={language} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
