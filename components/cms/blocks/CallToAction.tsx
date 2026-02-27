import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { CmsCallToAction } from '@/lib/cms/types';

export default function CallToAction({ block }: { block: CmsCallToAction }) {
  return (
    <section className="py-20 bg-primary/5">
      <div className="container-width text-center max-w-2xl mx-auto space-y-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{block.title}</h2>
        {block.description && (
          <p className="text-lg text-muted-foreground">{block.description}</p>
        )}
        <Button
          size="lg"
          variant={block.variant === 'secondary' ? 'outline' : 'default'}
          className="px-8 text-lg h-12"
          asChild
        >
          <Link href={block.buttonUrl}>{block.buttonText}</Link>
        </Button>
      </div>
    </section>
  );
}
