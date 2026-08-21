import Image from 'next/image';
import type { CmsMedia } from '@/lib/cms/types';

export default function MediaBlock({ block }: { block: CmsMedia }) {
  if (!block.file) return null;

  return (
    <section className="py-16">
      <div className="container-width">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden">
          <Image
            src={block.file.url}
            alt={block.file.alternativeText || ''}
            fill
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
