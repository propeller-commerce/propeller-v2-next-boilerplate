'use client';

import Link from 'next/link';
import type { CmsProductCards } from '@/lib/cms/types';
import ProductSlider from '@/components/propeller/ProductSlider';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePrice } from '@/context/PriceContext';
import { useCompany } from '@/context/CompanyContext';

export default function ProductCardsBlock({ block }: { block: CmsProductCards }) {
  const { state } = useAuth();
  const { cart, saveCart } = useCart();
  const { language } = useLanguage();
  const { includeTax } = usePrice();
  const { selectedCompany } = useCompany();

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
            graphqlClient={graphqlClient}
            productIds={productIds.map(Number)}
            configuration={config}
            language={language}
            user={state.user}
            cartId={cart?.cartId}
            companyId={selectedCompany?.companyId}
            includeTax={includeTax}
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
