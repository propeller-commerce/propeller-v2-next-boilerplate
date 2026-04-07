import Link from 'next/link';
import type { CmsProductCards } from '@/lib/cms/types';

export default function ProductCardsBlock({ block }: { block: CmsProductCards }) {
  return (
    <section className="bg-primary/5 py-16 lg:py-20">
      <div className="container-width">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">{block.title}</h2>
          {block.subtitle && (
            <p className="text-muted-foreground mt-2">{block.subtitle}</p>
          )}
          {block.buttonText && block.buttonUrl && (
            <Link href={block.buttonUrl} className="inline-block mt-4 text-primary font-medium hover:underline">
              {block.buttonText}
            </Link>
          )}
        </div>

        {/* Parent page should hydrate this placeholder with Propeller ProductCard components,
            using the SKUs in data-product-skus to fetch product data from the Propeller API. */}
        <div data-product-skus={JSON.stringify(block.productSkus)}>
          <p className="text-muted-foreground text-center">Loading products...</p>
        </div>
      </div>
    </section>
  );
}
