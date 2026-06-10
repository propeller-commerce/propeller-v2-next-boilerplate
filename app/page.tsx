import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import PersonalizedPage from '@/components/cms/PersonalizedPage';
import { getPage } from '@/lib/cms';
import HomeFallback from '@/components/cms/HomeFallback';
import { fetchMenu, getAnonymousInfra } from '@/lib/server';

const BASE_CATEGORY_ID = parseInt(
  process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '17',
  10
);

export default async function Home() {
  // Run the page-data fetch and the menu fetch in parallel. The menu fetch
  // here looks duplicated against `HeaderServer` (which also calls
  // `fetchMenu`), but Next 16's data cache dedupes by request body — both
  // calls hit the same cache entry, so the upstream only sees one request.
  // We need the tree at the page level too because `HomeFallback`'s "Shop
  // by Category" icon grid renders from it; passing the seeded tree skips
  // the legacy client-side fetch and puts the grid in the initial HTML.
  const [page, menuTree] = await Promise.all([
    getPage('home'),
    fetchMenu(getAnonymousInfra(), BASE_CATEGORY_ID),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderServer />
      <main className="flex-1">
        {page && page.blocks.length > 0 ? (
          <PersonalizedPage defaultPage={page} slug="home" />
        ) : (
          <HomeFallback menuTree={menuTree} />
        )}
      </main>
      <Footer />
    </div>
  );
}
