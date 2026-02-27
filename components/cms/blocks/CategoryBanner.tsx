import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { CmsCategoryBanner } from '@/lib/cms/types';

export default function CategoryBanner({ banner }: { banner: CmsCategoryBanner }) {
  if (!banner.image) return null;

  return (
    <div className="relative w-full aspect-[4/1] min-h-[200px] max-h-[320px] rounded-lg overflow-hidden mb-8">
      <Image
        src={banner.image.url}
        alt={banner.image.alternativeText || banner.title || ''}
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
      {(banner.title || banner.subtitle || banner.ctaText) && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent flex items-center">
          <div className="px-8 md:px-12 max-w-xl space-y-3">
            {banner.title && (
              <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">
                {banner.title}
              </h2>
            )}
            {banner.subtitle && (
              <p className="text-sm md:text-base text-white/90 drop-shadow-sm">
                {banner.subtitle}
              </p>
            )}
            {banner.ctaText && banner.ctaUrl && (
              <Button size="sm" className="mt-2" asChild>
                <Link href={banner.ctaUrl}>{banner.ctaText}</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
