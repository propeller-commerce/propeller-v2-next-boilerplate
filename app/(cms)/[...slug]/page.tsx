import { notFound } from 'next/navigation';
import { cookies, draftMode } from 'next/headers';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import DynamicBlockRenderer from '@/components/cms/DynamicBlockRenderer';
import PreprTrack from '@/components/cms/PreprTrack';
import { getPage, getAllPageSlugs } from '@/lib/cms';
import { readForwardedPreprHeaders } from '@/lib/preprHeaders';

interface CmsPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// This catch-all is the lowest-priority route, so every unmatched path lands
// here. `generateStaticParams` prerenders the known CMS slugs; any other path
// must render on-demand so it can resolve to `notFound()` (the branded 404).
// Without forcing dynamic, Next statically evaluates the miss and the render
// throws DYNAMIC_SERVER_USAGE (via <HeaderServer/>'s request-scoped menu
// fetch), surfacing as a raw 500 instead of a 404.
export const dynamic = 'force-dynamic';

// Slugs that must NOT be prerendered by this catch-all: `home` is served at `/`,
// and `blog` is a real app route (`/blog`) — a CMS page saved with either slug
// would otherwise collide (e.g. a Prepr page `_slug: "/blog"` → `//blog` vs the
// real `/blog`, a build-time "page mismatch"). Reserve them here.
const RESERVED_SLUGS = new Set(['home', 'blog']);

export async function generateStaticParams() {
  const slugs = await getAllPageSlugs();
  return slugs
    .map((slug) => String(slug || '').replace(/^\/+/, '').replace(/\/+$/, ''))
    .filter((slug) => slug.length > 0 && !RESERVED_SLUGS.has(slug))
    .map((slug) => ({ slug: slug.split('/').filter(Boolean) }));
}

export default async function CmsPage({ params, searchParams }: CmsPageProps) {
  const { slug } = await params;
  const pageSlug = slug.join('/');

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('preferred_language')?.value;
  const defaultLocale = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
  const { isEnabled: preview } = await draftMode();
  // In preview, forward the segment switch (?prepr_preview_segment from Prepr's
  // preview bar) so editors can preview each segment's adaptive variant. Empty
  // off-Prepr. Previewed locale arrives as ?preview_lang (guarded by preview).
  const extraHeaders = preview ? await readForwardedPreprHeaders() : undefined;
  let previewLocale: string | undefined;
  if (preview) {
    const pv = (await searchParams).preview_lang;
    previewLocale = typeof pv === 'string' ? pv : undefined;
  }

  const page = await getPage(pageSlug, {
    locale: previewLocale || cookieLocale || defaultLocale,
    extraHeaders,
    noStore: preview,
    preview,
  });

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
      {page.id && <PreprTrack itemId={page.id} />}
    </div>
  );
}
