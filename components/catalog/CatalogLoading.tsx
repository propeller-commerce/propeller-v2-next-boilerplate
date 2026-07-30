import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';

/**
 * Instant loading fallback for the catalog Server-Component shells
 * (category / search / cluster / product).
 *
 * Those pages `await` a cookie-dependent GraphQL fetch before returning any
 * HTML, so a client-side navigation (e.g. search results → a cluster PDP that
 * takes a moment to load) used to sit on the *previous* page until the new one
 * was fully built — no feedback that anything was happening. Dropping a
 * `loading.tsx` in each route makes Next wrap the page in a Suspense boundary
 * and paint this skeleton the instant the link is clicked, streaming the real
 * page in behind it.
 *
 * Header + Footer are re-rendered here because they live in the page, not a
 * shared layout — without them the chrome would blink out during the load. The
 * menu fetch inside `HeaderServer` is served from the Next data cache (warm on
 * every real navigation), so rendering it here is ~free.
 */

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-hover animate-pulse rounded ${className}`} />;
}

/** cluster / product — the two-column image + info detail layout. */
function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
      <Bar className="aspect-square w-full rounded-lg" />
      <div className="flex flex-col gap-4">
        <Bar className="h-8 w-3/4" />
        <Bar className="h-6 w-1/3" />
        <Bar className="h-4 w-full" />
        <Bar className="h-4 w-5/6" />
        <Bar className="h-4 w-2/3" />
        <Bar className="h-11 w-full mt-4" />
      </div>
    </div>
  );
}

/** category / search — toolbar + filter sidebar + product-card grid. */
function GridSkeleton() {
  return (
    <div>
      <Bar className="h-10 w-full mb-6" />
      <div className="flex gap-8">
        <div className="hidden lg:flex flex-col gap-3 w-64 flex-shrink-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bar key={`f-${i}`} className="h-8 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 flex-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={`c-${i}`} className="flex flex-col gap-2">
              <Bar className="aspect-square w-full" />
              <Bar className="h-3 w-1/4" />
              <Bar className="h-4 w-3/4" />
              <Bar className="h-5 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CatalogLoading({ variant }: { variant: 'detail' | 'grid' }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <HeaderServer />
      <main className="flex-1 py-12">
        <div className="container-width">
          {variant === 'detail' ? <DetailSkeleton /> : <GridSkeleton />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
