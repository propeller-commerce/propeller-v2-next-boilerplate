'use client';

import { ProductSlider } from '@propeller-commerce/propeller-v2-react-ui';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { config, localizeHref } from '@/data/config';
import { useTranslations } from '@/lib/i18n/client';
import type { CmsProductSlider } from '@/lib/cms/types';
import type { Product, Cluster } from '@propeller-commerce/propeller-sdk-v2';

export default function ProductSliderBlock({ block }: { block: CmsProductSlider }) {
  const router = useRouter();
  const { cart, saveCart } = useCart();
  const { language } = useLanguage();
  const productSliderLabels = useTranslations('ProductSlider');
  const productCardLabels = useTranslations('ProductCard');
  const clusterCardLabels = useTranslations('ClusterCard');
  const addToCartLabels = useTranslations('AddToCart');
  const itemStockLabels = useTranslations('ItemStock');
  const productPriceLabels = useTranslations('ProductPrice');

  if (block.productIds.length === 0 && block.clusterIds.length === 0) {
    return null;
  }

  return (
    <section className="py-16">
      <div className="container-width">
        <ProductSlider
          labels={productSliderLabels}
          productCardLabels={productCardLabels}
          clusterCardLabels={clusterCardLabels}
          addToCartLabels={addToCartLabels}
          stockLabels={itemStockLabels}
          priceLabels={productPriceLabels}
          productIds={block.productIds}
          clusterIds={block.clusterIds}
          taxZone="NL"
          title={block.title}
          cartId={cart?.cartId}
          createCart={true}
          showModal={true}
          onCartCreated={(newCart) => saveCart(newCart)}
          afterAddToCart={(updatedCart) => saveCart(updatedCart)}
          onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
          onProductClick={(product: Product) => {
            router.push(config.urls.getProductUrl(product, language));
          }}
          onClusterClick={(cluster: Cluster) => {
            router.push(config.urls.getClusterUrl(cluster, language));
          }}
        />
      </div>
    </section>
  );
}
