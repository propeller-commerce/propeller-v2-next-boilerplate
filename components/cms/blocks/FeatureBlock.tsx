import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { CmsFeature } from '@/lib/cms/types';

export default function FeatureBlock({ block }: { block: CmsFeature }) {
  const imageLeft = block.imagePosition === 'left';

  return (
    <section className="bg-primary/5 py-16 lg:py-20">
      <div className="container-width">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${imageLeft ? '' : 'lg:[&>*:first-child]:order-2'}`}>
          {block.image && (
            <div className="relative aspect-[870/570] w-full overflow-hidden rounded-2xl">
              <Image
                src={block.image.url}
                alt={block.image.alternativeText || block.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {block.title}
            </h2>
            {block.description && (
              <p className="text-lg leading-relaxed text-muted-foreground">
                {block.description}
              </p>
            )}
            {block.buttonText && block.buttonUrl && (
              <Button size="lg" className="rounded-full px-8" asChild>
                <Link href={block.buttonUrl}>{block.buttonText}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
