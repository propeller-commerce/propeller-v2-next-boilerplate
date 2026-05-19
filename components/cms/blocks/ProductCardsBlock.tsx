'use client';

import Link from 'next/link';
import type { CmsProductCards } from '@/lib/cms/types';
import ProductSlider from '@/components/propeller/ProductSlider';
import { useCart } from '@/context/CartContext';

export default function ProductCardsBlock({ block }: { block: CmsProductCards }) {
  const { cart, saveCart } = useCart();

  const productIds = block.products
    .map((p) => typeof p.productId === 'string' ? parseInt(p.productId, 10) : p.productId)
    .filter((id): id is number => id != null && !isNaN(id) && id > 0);

  return (
    <section className="bg-primary/5 py-16 lg:py-20">
      <div className="container-width">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">{block.title}</h2>
          {block.subtitle && (
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{block.subtitle}</p>
          )}
          {block.buttonText && block.buttonUrl && (
            <Link href={block.buttonUrl} className="inline-block mt-4 text-primary font-medium hover:underline">
              {block.buttonText}
            </Link>
          )}
        </div>

        {productIds.length > 0 ? (
          <ProductSlider
            productIds={productIds.map(Number)}
            cartId={cart?.cartId}
            taxZone="NL"
            createCart={true}
            onCartCreated={(newCart) => saveCart(newCart)}
            afterAddToCart={(updatedCart) => saveCart(updatedCart)}
          />
        ) : (
          <p className="text-muted-foreground text-center">No products configured.</p>
        )}
      </div>
    </section>
  );
}
