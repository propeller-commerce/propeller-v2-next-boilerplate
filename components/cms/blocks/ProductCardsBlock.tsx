import Image from 'next/image';
import Link from 'next/link';
import type { CmsProductCards } from '@/lib/cms/types';

export default function ProductCardsBlock({ block }: { block: CmsProductCards }) {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {block.products.map((product, i) => (
            <Link
              key={product.slug || i}
              href={`/product/${product.slug}`}
              className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-md transition"
            >
              <div className="relative aspect-video bg-muted">
                {product.image ? (
                  <Image
                    src={product.image.url}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-muted-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
                  {product.name}
                </h3>
                {product.price != null && (
                  <p className="text-primary font-bold mt-1">
                    &euro;{product.price.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                    {product.priceSuffix && <span className="text-muted-foreground font-normal text-xs ml-1">{product.priceSuffix}</span>}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
