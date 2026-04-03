'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { imageSearchFilters, imageVariantFiltersLarge, imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import { Card } from '@/components/ui/Card';
import { Product, ProductPrice as ProductPriceSDK, CartService, Enums } from 'propeller-sdk-v2';
import AddToCart from '@/components/propeller/AddToCart';
import ItemStock from '@/components/propeller/ItemStock';
import ProductInfo from '@/components/propeller/ProductInfo';
import ProductGallery from '@/components/propeller/ProductGallery';
import ProductPrice from '@/components/propeller/ProductPrice';
import ProductShortDescription from '@/components/propeller/ProductShortDescription';
import ProductBulkPrices from '@/components/propeller/ProductBulkPrices';
import Breadcrumbs from '@/components/propeller/Breadcrumbs';
import ProductTabs from '@/components/propeller/ProductTabs';
import { usePrice } from '@/context/PriceContext';
import { graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { config, localizeHref } from '@/data/config';
import ProductSlider from '@/components/propeller/ProductSlider';
import ProductBundles from '@/components/propeller/ProductBundles';
import AddToFavorite from '@/components/propeller/AddToFavorite';
import { useLanguage } from '@/context/LanguageContext';
import { useCompany } from '@/context/CompanyContext';


export default function ProductPage() {
  const params = useParams();
  const { state, refreshUser } = useAuth();
  const { selectedCompany } = useCompany();
  const productId = parseInt(params.productId as string);
  const [product, setProduct] = useState<Product | null>(null);
  const { cart, saveCart } = useCart();
  const router = useRouter();
  const { includeTax } = usePrice();
  const { language } = useLanguage();
  const images: string[] = product?.media?.images?.items?.flatMap(
    image => image.imageVariants?.map(variant => variant.url).filter((url): url is string => !!url) ?? []
  ) ?? [];

  const price = product?.price as ProductPriceSDK;

  // Update URL slug when language or product changes — use history.replaceState
  // to avoid a Next.js re-render cascade that would trigger a second API fetch.
  useEffect(() => {
    if (!product) return;
    const match = product.slugs?.find((s: { language?: string; value?: string }) => s.language === language);
    const slug = match?.value || product.slugs?.[0]?.value || '';
    const currentSlug = window.location.pathname.split('/').pop();
    if (slug && slug !== currentSlug) {
      window.history.replaceState(null, '', localizeHref(`/product/${productId}/${slug}`, language));
    }
  }, [product, language, productId]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-width max-w-5xl">
          <div className="propeller-breadcrumbs mb-6">
            <Breadcrumbs categoryPath={product?.categoryPath || []} language={language} configuration={config} showCurrent={true} />
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Image Gallery */}
            <div className="bg-white rounded-lg shadow p-6">
              {/* Gallery Column */}
              <ProductGallery images={images} />
            </div>

            {/* Details Column */}
            <div className="flex flex-col">
              <div className="mb-6">
                <ProductInfo
                  user={state.user}
                  companyId={selectedCompany?.companyId}
                  productId={productId}
                  graphqlClient={graphqlClient}
                  language={language}
                  imageSearchFilters={imageSearchFilters}
                  imageVariantFilters={imageVariantFiltersLarge}
                  onProductLoaded={setProduct}
                  configuration={config}
                />

                <ProductPrice price={price} includeTax={includeTax} />
                <div className="mt-6">
                  <ProductBulkPrices bulkPrices={product?.bulkPrices || []} includeTax={includeTax} labels={{ title: '' }} />
                </div>
                <div className="mt-6">
                  <ProductShortDescription product={product as Product} language={language} />
                </div>

                {product?.inventory && (
                  <div className="mt-4">
                    <ItemStock inventory={product.inventory} showAvailability={false} />
                  </div>
                )}
              </div>

              {product && (
                <Card className="p-6 bg-muted/30 border-none shadow-none mb-8">
                  <div className="flex items-center gap-2">
                    <AddToCart
                      user={state.user}
                      companyId={selectedCompany?.companyId}
                      product={product}
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
                    <AddToFavorite
                      graphqlClient={graphqlClient}
                      user={state.user}
                      productId={product.productId}
                      onFavoriteChanged={refreshUser}
                    />
                  </div>
                </Card>
              )}

            </div>
          </div>
          <ProductTabs product={product as Product} productId={productId} graphqlClient={graphqlClient} language={language} />
          <div className="my-6">
            <ProductBundles
              graphqlClient={graphqlClient}
              productId={productId}
              language={language}
              cartId={cart?.cartId}
              taxZone="NL"
              includeTax={includeTax}
              configuration={config}
              user={state.user}
              createCart={true}
              showModal={true}
              onCartCreated={(newCart) => saveCart(newCart)}
              afterBundleAddToCart={(updatedCart) => saveCart(updatedCart)}
              onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            />
          </div>
          <ProductSlider
            graphqlClient={graphqlClient}
            crossUpsellTypes={[Enums.CrossupsellType.ACCESSORIES]}
            productId={productId}
            language={language}
            taxZone="NL"
            showAvailability={false}
            showStock={true}
            includeTax={includeTax}
            user={state.user}
            companyId={selectedCompany?.companyId}
            cartId={cart?.cartId}
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
            showModal={true}
            onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            configuration={config}
            onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
            onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
          />
          <ProductSlider
            graphqlClient={graphqlClient}
            crossUpsellTypes={[Enums.CrossupsellType.RELATED]}
            productId={productId}
            language={language}
            taxZone="NL"
            showAvailability={false}
            showStock={true}
            includeTax={includeTax}
            user={state.user}
            companyId={selectedCompany?.companyId}
            cartId={cart?.cartId}
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
            showModal={true}
            onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
            configuration={config}
            onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
            onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
