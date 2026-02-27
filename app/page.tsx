import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import DynamicBlockRenderer from '@/components/cms/DynamicBlockRenderer';
import { getPage } from '@/lib/cms/strapi';
import HomeFallback from '@/components/cms/HomeFallback';

export default async function Home() {
  const page = await getPage('home');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {page && page.blocks.length > 0 ? (
          <DynamicBlockRenderer blocks={page.blocks} />
        ) : (
          <HomeFallback />
        )}
      </main>
      <Footer />
    </div>
  );
}
