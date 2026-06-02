'use client';

/**
 * Phase C compound-API demo page.
 *
 * Not linked from anywhere in the live navigation — exists as a reference
 * for developers adopting the new compound APIs. Visit
 * `/examples/compound-api?categoryId=1793` to see all three patterns
 * (ProductCard, ProductGrid, AddToCart) wired up.
 *
 * The legacy / monolithic APIs of the same three components still work
 * unchanged — every other page in the app is on them. This file is the
 * canonical proof that the new shape works end-to-end.
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product } from 'propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import { ProductCard } from 'propeller-v2-react-ui';
import { ProductGrid } from 'propeller-v2-react-ui';

function CompoundApiDemoInner() {
  const search = useSearchParams();
  const categoryId = Number.parseInt(search.get('categoryId') ?? '1793', 10);

  return (
    <>
      <section>
        <h2 className="text-xl font-semibold mb-2">
          <code>&lt;ProductGrid&gt;</code> with compound subcomponents
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          The grid owns the data fetch (categoryId, pagination, filters). Items and pagination
          are explicit children — no <code>renderProductCard</code> render-prop. Each item
          gets a compound <code>&lt;ProductCard&gt;</code> with consumer-controlled layout.
        </p>
        <ProductGrid
          categoryId={categoryId}
          pageSize={6}
          allowAddToCart={true}
          showPrice={true}
          showStock={false}
          createCart={true}
        >
          <ProductGrid.Items
            renderItem={(item) => {
              // We get a Product | Cluster — narrow to Product for this demo.
              if ('clusterId' in item && item.clusterId) {
                // For brevity skip clusters here; in real code render <ClusterCard /> or its
                // future compound equivalent.
                return null;
              }
              const product = item as Product;
              return (
                <ProductCard product={product}>
                  <ProductCard.Image showFavorite={false} />
                  <div className="p-3 flex flex-col gap-1">
                    <ProductCard.Sku />
                    <ProductCard.Name linkable />
                    <div className="mt-2">
                      <ProductCard.Price priceSize="text-base" />
                    </div>
                  </div>
                  <div className="px-3 pb-3">
                    <ProductCard.AddToCart />
                  </div>
                </ProductCard>
              );
            }}
          />
          <ProductGrid.Pagination />
        </ProductGrid>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">
          <code>&lt;ProductCard&gt;</code> rearranged for a list view
        </h2>
        <p className="text-muted-foreground mb-4 text-sm">
          The same compound parts in a different order: image right, name first, no AddToCart.
          Shows how the compound shape lets consumers redesign the card without forking it.
        </p>
        <p className="text-sm text-muted-foreground italic">
          (Requires a parent ProductGrid to supply a product. In practice you'd render this
          inside <code>&lt;ProductGrid.Items renderItem&gt;</code>.)
        </p>
      </section>
    </>
  );
}

export default function CompoundApiDemo() {
  // `useSearchParams` lives inside the inner component so Next 16 can defer
  // its evaluation behind a Suspense boundary at build time. Without this the
  // static-prerender step bails out per the missing-csr-bailout warning.
  return (
    <main className="container-width max-w-6xl py-12 space-y-12">
      <h1 className="text-3xl font-bold">Phase C compound-API demo</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <CompoundApiDemoInner />
      </Suspense>
    </main>
  );
}
