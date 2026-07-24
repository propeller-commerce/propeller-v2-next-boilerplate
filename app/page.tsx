import { cookies, draftMode } from 'next/headers';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import PersonalizedPage from '@/components/cms/PersonalizedPage';
import PreprTrack from '@/components/cms/PreprTrack';
import { getPage } from '@/lib/cms';
import { readForwardedPreprHeaders } from '@/lib/preprHeaders';
import HomeFallback from '@/components/cms/HomeFallback';
import { fetchMenu, getAnonymousInfra } from '@/lib/server';

const BASE_CATEGORY_ID = parseInt(
  process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '17',
  10
);

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('preferred_language')?.value;
  const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';

  // Prepr personalization signals proxy.ts forwarded onto this request
  // (Prepr-Segments from the editor preview switch, Prepr-Customer-Id for a
  // returning visitor, geo + UTM). Empty on non-Prepr providers.
  const preprHeaders = await readForwardedPreprHeaders();

  const { isEnabled: preview } = await draftMode();

  // In Prepr's in-editor preview the edited locale arrives as ?preview_lang;
  // only read in preview mode so live rendering keeps the default locale.
  let previewLocale: string | undefined;
  if (preview) {
    const pv = (await searchParams).preview_lang;
    previewLocale = typeof pv === 'string' ? pv : undefined;
  }

  // Run the page-data fetch and the menu fetch in parallel. The menu fetch
  // here looks duplicated against `HeaderServer` (which also calls
  // `fetchMenu`), but Next 16's data cache dedupes by request body — both
  // calls hit the same cache entry, so the upstream only sees one request.
  // We need the tree at the page level too because `HomeFallback`'s "Shop
  // by Category" icon grid renders from it; passing the seeded tree skips
  // the legacy client-side fetch and puts the grid in the initial HTML.
  const [page, menuTree] = await Promise.all([
    getPage('home', {
      locale: previewLocale || cookieLocale || defaultLocale,
      extraHeaders: preprHeaders,
      noStore: true,
      preview,
    }),
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
      {page?.id && <PreprTrack itemId={page.id} />}
    </div>
  );
}
