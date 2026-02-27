import type { CmsRichText } from '@/lib/cms/types';

export default function RichTextBlock({ block }: { block: CmsRichText }) {
  return (
    <section className="py-16">
      <div className="container-width">
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: block.body }}
        />
      </div>
    </section>
  );
}
