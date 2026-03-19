'use client';

import ProductSlider from '@/components/propeller/ProductSlider';
import { graphqlClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { usePrice } from '@/context/PriceContext';
import { config } from '@/data/config';
import type { CmsProductSlider } from '@/lib/cms/types';
import type { Product, Cluster } from 'propeller-sdk-v2';

export default function ProductSliderBlock({ block }: { block: CmsProductSlider }) {
  const router = useRouter();
  const { state } = useAuth();
  const { cart, saveCart } = useCart();
  const { includeTax } = usePrice();

  if (block.productIds.length === 0 && block.clusterIds.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container-width">
        <ProductSlider
          graphqlClient={graphqlClient}
          productIds={block.productIds}
          clusterIds={block.clusterIds}
          language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'}
          taxZone="NL"
          title={block.title}
          user={state.user}
          cartId={cart?.cartId}
          createCart={true}
          showModal={true}
          onCartCreated={(newCart) => saveCart(newCart)}
          afterAddToCart={(updatedCart) => saveCart(updatedCart)}
          onProceedToCheckout={() => router.push('/checkout')}
          includeTax={includeTax}
          configuration={config}
          onProductClick={(product: Product) => {
            router.push(config.urls.getProductUrl(product));
          }}
          onClusterClick={(cluster: Cluster) => {
            router.push(config.urls.getClusterUrl(cluster));
          }}
        />
      </div>
    </section>
  );
}
