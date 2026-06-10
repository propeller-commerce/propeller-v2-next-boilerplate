/**
 * Cluster Page — Server Component (hybrid SSR).
 *
 * The cluster detail UI is one continuous interactive unit: the price
 * reflects the configurator-selected product, the configurator mutates that
 * selection, and AddToCart consumes it. Splitting it into a static server
 * block + a separate client block would cause a layout flash when the
 * configured price replaced the static one.
 *
 * Instead this Server Component fetches the cluster up front (mirroring the
 * client `ClusterInfo` two-step config→cluster fetch) and hands it to
 * `ClusterDetailIsland` as `initialCluster`. The island seeds its state from
 * that data — `selectedProduct` starts as `cluster.defaultProduct` — so the
 * island's *first render is fully determined by the server-fetched data*.
 * That means:
 *   - The SSR HTML already contains the default product's title, price,
 *     short description and stock (crawlable, visible with JS disabled).
 *   - Hydration produces identical markup — no refetch, no flash.
 *   - Configurator interaction then updates the displayed product
 *     client-side as before.
 *
 * Caching: anonymous → cacheable (`revalidate`); authenticated → dynamic via
 * the auth-cookie read in `getServerInfra()`. See `lib/server.ts`.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import { ClusterJsonLd } from 'propeller-v2-react-ui/pure';
import {
  getListingInfra,
  getAnonymousInfra,
  fetchCluster,
} from '@/lib/server';
import {
  resolveSeoTitle,
  resolveSeoDescription,
  resolveCanonicalUrl,
  buildJsonLdContext,
} from '@/lib/seo';
import ClusterDetailIsland from './ClusterDetailIsland';

interface RouteParams {
  clusterId: string;
  slug: string;
}

/**
 * Per-cluster SEO metadata. Uses the cluster's curated `metadataTitles` /
 * `metadataDescriptions` / `metadataCanonicalUrls` when populated, falling
 * back to the cluster `names` / `shortDescriptions`. Fetched anonymously.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { clusterId: clusterIdStr } = await params;
  const clusterId = Number.parseInt(clusterIdStr, 10);
  if (!Number.isFinite(clusterId)) return {};

  const infra = getAnonymousInfra();
  const cluster = await fetchCluster(infra, clusterId);
  if (!cluster) return {};

  const title = resolveSeoTitle(
    cluster.metadataTitles,
    cluster.names,
    infra.language
  );
  const description = resolveSeoDescription(
    cluster.metadataDescriptions,
    [cluster.shortDescriptions, cluster.descriptions],
    infra.language
  );
  const canonical = resolveCanonicalUrl(
    cluster.metadataCanonicalUrls,
    infra.language
  );

  return {
    ...(title && { title }),
    ...(description && { description }),
    ...(canonical && { alternates: { canonical } }),
    openGraph: {
      ...(title && { title }),
      ...(description && { description }),
      type: 'website',
    },
  };
}

/** Anonymous variant is cacheable for 5 min; authenticated renders are dynamic. */
export const revalidate = 300;

export default async function ClusterPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { clusterId: clusterIdStr } = await params;
  const clusterId = Number.parseInt(clusterIdStr, 10);
  if (!Number.isFinite(clusterId)) notFound();

  const infra = await getListingInfra();
  const cluster = await fetchCluster(infra, clusterId);
  if (!cluster) notFound();

  const jsonLdContext = buildJsonLdContext(infra);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* schema.org structured data — emitted as `@type: "Product"` because
          schema.org has no `Cluster` type. Server-rendered in the body. */}
      <ClusterJsonLd cluster={cluster} context={jsonLdContext} />
      <HeaderServer />
      <main className="flex-1 py-12">
        <div className="container-width">
          {/* The cluster detail UI is one interactive unit. The island is
              seeded with the server-fetched cluster, so its first render
              (default product) matches the SSR HTML exactly — crawlable
              content, no hydration flash. */}
          {/* Suspense future-proofs the static shell against inner async
              (PPR-ready). Fallback is null because the island seeds
              synchronously today. */}
          <Suspense fallback={null}>
            <ClusterDetailIsland clusterId={clusterId} initialCluster={cluster} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
