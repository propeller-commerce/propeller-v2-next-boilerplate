import { notFound } from 'next/navigation';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import DynamicBlockRenderer from '@/components/cms/DynamicBlockRenderer';
import { getPage, getAllPageSlugs } from '@/lib/cms';

interface CmsPageProps {
  params: Promise<{ slug: string[] }>;
}

// This catch-all is the lowest-priority route, so every unmatched path lands
// here. `generateStaticParams` prerenders the known CMS slugs; any other path
// must render on-demand so it can resolve to `notFound()` (the branded 404).
// Without forcing dynamic, Next statically evaluates the miss and the render
// throws DYNAMIC_SERVER_USAGE (via <HeaderServer/>'s request-scoped menu
// fetch), surfacing as a raw 500 instead of a 404.
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const slugs = await getAllPageSlugs();
  return slugs
    .filter((slug) => slug !== 'home')
    .map((slug) => ({ slug: slug.split('/') }));
}

export default async function CmsPage({ params }: CmsPageProps) {
  const { slug } = await params;
  const pageSlug = slug.join('/');

  const page = await getPage(pageSlug);

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderServer />
      <main className="flex-1">
        {page.blocks.length > 0 ? (
          <DynamicBlockRenderer blocks={page.blocks} />
        ) : (
          <section className="py-16">
            <div className="container-width">
              <h1 className="text-4xl font-bold mb-4">{page.title}</h1>
              {page.description && (
                <p className="text-muted-foreground text-lg">{page.description}</p>
              )}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
