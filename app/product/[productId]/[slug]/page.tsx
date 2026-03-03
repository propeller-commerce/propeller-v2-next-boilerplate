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
import ProductInfo from '@/output/react/ui-components/ProductInfo';
import ProductGallery from '@/output/react/ui-components/ProductGallery';
import ProductPrice from '@/output/react/ui-components/ProductPrice';
import ProductTabs from '@/output/react/ui-components/ProductTabs';

import { graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { config } from '@/data/config';
import ProductShortDescription from '@/output/react/ui-components/ProductShortDescription';
import ProductBulkPrices from '@/output/react/ui-components/ProductBulkPrices';
import Breadcrumbs from '@/output/react/ui-components/Breadcrumbs';

export default function ProductPage() {
  const params = useParams();
  const { state } = useAuth();
  const productId = parseInt(params.productId as string);
  const [product, setProduct] = useState<Product | null>(null);
  const { cart, saveCart } = useCart();
  const router = useRouter();

  const images = product?.media?.images?.items?.[0]?.imageVariants?.map((v: ImageVariant) => v.url) || [];
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
                />

                <ProductPrice price={price} />

                {product?.bulkPrices?.length && (
                  <ProductBulkPrices bulkPrices={product.bulkPrices} />
                )}

                <div className="mt-6">
                  <ProductShortDescription product={product as Product} language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'} />
                </div>
              </div>

              {product && (
                <Card className="p-6 bg-muted/30 border-none shadow-none mb-8">
                  <AddToCart
                    user={state.user}
                    product={product}
                    cartId={cart?.cartId}
                    graphqlClient={graphqlClient}
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
          <ProductTabs product={product as Product} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
