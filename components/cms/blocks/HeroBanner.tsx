import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { CmsHeroBanner } from '@/lib/cms/types';

export default function HeroBanner({ block }: { block: CmsHeroBanner }) {
  return (
    <section className="relative overflow-hidden min-h-[600px] flex items-center">
      {block.image && (
        <div className="absolute inset-0 z-0">
          <Image
            src={block.image.url}
            alt={block.image.alternativeText || block.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-transparent" />
        </div>
      )}

      <div className="container-width relative z-10 w-full">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground sm:text-7xl drop-shadow-sm">
            {block.title}
          </h1>
          {block.subtitle && (
            <p className="text-lg leading-8 text-muted-foreground max-w-xl font-medium">
              {block.subtitle}
            </p>
          )}
          <div className="flex items-center gap-x-4 pt-4">
            {block.ctaText && block.ctaUrl && (
              <Button size="lg" className="px-8 text-lg h-12 shadow-lg shadow-primary/20" asChild>
                <Link href={block.ctaUrl}>{block.ctaText}</Link>
              </Button>
            )}
            {block.secondaryCtaText && block.secondaryCtaUrl && (
              <Button variant="outline" size="lg" className="px-8 text-lg h-12" asChild>
                <Link href={block.secondaryCtaUrl}>{block.secondaryCtaText}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
