'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/context/CartContext';
import { imageSearchFilters, imageVariantFiltersLarge } from '@/data/defaults';
import { Card } from '@/components/ui/Card';
import { ImageVariant, Product, ProductPrice as ProductPriceSDK } from 'propeller-sdk-v2';
import AddToCart from '@/components/propeller/AddToCart';
import ItemStock from '@/components/propeller/ItemStock';
import ProductInfo from '@/components/propeller/ProductInfo';
import ProductGallery from '@/components/propeller/ProductGallery';
import ProductPrice from '@/components/propeller/ProductPrice';
import ProductShortDescription from '@/components/propeller/ProductShortDescription';
import ProductBulkPrices from '@/components/propeller/ProductBulkPrices';
import Breadcrumbs from '@/components/propeller/Breadcrumbs';
import ProductTabs from '@/components/propeller/ProductTabs';

import { graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { config } from '@/data/config';


export default function ProductPage() {
  const params = useParams();
  const { state } = useAuth();
  const productId = parseInt(params.productId as string);
  const [product, setProduct] = useState<Product | null>(null);
  const { cart, saveCart } = useCart();
  const router = useRouter();

  const images: string[] = product?.media?.images?.items?.flatMap(
    image => image.imageVariants?.map(variant => variant.url).filter((url): url is string => !!url) ?? []
  ) ?? [];

  const price = product?.price as ProductPriceSDK;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-width max-w-5xl">
          <div className="propeller-breadcrumbs mb-6">
            <Breadcrumbs categoryPath={product?.categoryPath || []} language="NL" configuration={config} showCurrent={true} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-12">
            {/* Gallery Column */}
            <ProductGallery images={images} />

            {/* Details Column */}
            <div className="flex flex-col">
              <div className="mb-6">
                <ProductInfo
                  user={state.user}
                  productId={productId}
                  graphqlClient={graphqlClient}
                  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'}
                  imageSearchFilters={imageSearchFilters}
                  imageVariantFilters={imageVariantFiltersLarge}
                  onProductLoaded={setProduct}
                  configuration={config}
                />

                <ProductPrice price={price} />

                <ProductBulkPrices bulkPrices={product?.bulkPrices || []} />

                <div className="mt-6">
                  <ProductShortDescription product={product as Product} language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'} />
                </div>

                {product?.inventory && (
                  <div className="mt-4">
                    <ItemStock inventory={product.inventory} />
                  </div>
                )}
              </div>

              {product && (
                <Card className="p-6 bg-muted/30 border-none shadow-none mb-8">
                  <AddToCart
                    user={state.user}
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
                    onProceedToCheckout={() => router.push('/checkout')} />
                </Card>
              )}

            </div>
          </div>
          <ProductTabs product={product as Product} productId={productId} graphqlClient={graphqlClient} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
