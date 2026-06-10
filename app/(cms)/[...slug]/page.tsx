import { notFound } from 'next/navigation';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import DynamicBlockRenderer from '@/components/cms/DynamicBlockRenderer';
import { getPage, getAllPageSlugs } from '@/lib/cms';

interface CmsPageProps {
  params: Promise<{ slug: string[] }>;
}

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
