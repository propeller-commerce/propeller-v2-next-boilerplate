import type { CmsQuote } from '@/lib/cms/types';

export default function QuoteBlock({ block }: { block: CmsQuote }) {
  return (
    <section className="py-16">
      <div className="container-width max-w-3xl mx-auto">
        <blockquote className="border-l-4 border-primary pl-6 py-2">
          {block.title && (
            <p className="text-lg font-semibold mb-2">{block.title}</p>
          )}
          <p className="text-xl italic text-muted-foreground leading-relaxed">
            {block.body}
          </p>
        </blockquote>
      </div>
    </section>
  );
}
