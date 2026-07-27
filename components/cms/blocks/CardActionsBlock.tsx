import Image from 'next/image';
import type { CmsCardActions } from '@/lib/cms/types';

export default function CardActionsBlock({ block }: { block: CmsCardActions }) {
  return (
    <section className="py-16 lg:py-20 bg-muted">
      <div className="container-width">
        {block.title && (
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            {block.title}
          </h2>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {block.items.map((item, i) => (
            <div key={i} className="flex flex-col">
              {/* Image */}
              <div className="relative aspect-[16/10] bg-secondary rounded-lg overflow-hidden">
                {item.image && (
                  <Image
                    src={item.image.url}
                    alt={item.image.alternativeText || item.title}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              {/* Content */}
              <div className="pt-6">
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-base text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
