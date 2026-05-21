'use client';

/**
 * Client islands for the PDP — split into two named slots:
 *   - AddToCartIsland: the right-column buy-button block, sits beneath
 *     the server-rendered price/description.
 *   - BelowFoldIsland: tabs + bundles + cross-sell rows below the main grid.
 *
 * Both receive the server-fetched `product` as a serializable prop (the
 * parent already pushed it through `toPlain()`). Re-fetching server data on
 * the client is unnecessary; the SDK is only invoked from within these
 * islands for their own UI needs (gallery zoom is its own component
 * imported directly by the page, bundle add-to-cart fires its own mutation,
 * cross-sell slider does its own search, etc.).
 *
 * Why two islands rather than one Fragment: the AddToCart card sits in the
 * grid's right column; the below-fold sections sit outside the grid, full
 * width. A single Fragment-returning component would force both into the
 * same parent slot. Two named exports let the page place them where the
 * layout actually wants them.
 *
 * URL slug sync (language → URL) also lives here, because it needs the
 * useEffect + useRouter + useLanguage that only work on the client.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Cart, CrossupsellType, Product } from 'propeller-sdk-v2';
import { Card } from '@/components/ui/Card';
import { AddToCart } from 'propeller-v2-react-ui';
import { Breadcrumbs } from 'propeller-v2-react-ui';
import { ProductTabs } from 'propeller-v2-react-ui';
import { ProductSlider } from 'propeller-v2-react-ui';
import { ProductBundles } from 'propeller-v2-react-ui';
import { AddToFavorite } from 'propeller-v2-react-ui';
import type { Category } from 'propeller-sdk-v2';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { config, localizeHref } from '@/data/config';

export interface ProductDetailIslandProps {
  /** Server-fetched product. Plain JSON (already `toPlain`'d). */
  product: Product;
  /** Numeric product ID from the route param. */
  productId: number;
}

/**
 * Default export = AddToCart card. Lives in the right column of the
 * main grid, beneath the server-rendered price+desc block. Also owns the
 * language→URL slug sync effect (a one-line side concern, kept here to
 * avoid a third island just for it).
 */
export default function AddToCartIsland({ product, productId }: ProductDetailIslandProps) {
  const router = useRouter();
  const { cart, saveCart } = useCart();
  const { refreshUser } = useAuth();
  const { language } = useLanguage();

  // Update URL slug when the user switches language. Uses replaceState to
  // avoid a Next router re-render cascade that would otherwise trigger a
  // double fetch of the (already-server-rendered) product.
  useEffect(() => {
    const match = product.slugs?.find((s: { language?: string; value?: string }) => s.language === language);
    const slug = match?.value || product.slugs?.[0]?.value || '';
    const currentSlug = window.location.pathname.split('/').pop();
    if (slug && slug !== currentSlug) {
      window.history.replaceState(null, '', localizeHref(`/product/${productId}/${slug}`, language));
    }
  }, [product, language, productId]);

  return (
    <Card className="p-6 bg-muted/30 border-none shadow-none mb-8">
      <div className="flex items-center gap-2">
        <AddToCart
          product={product}
          cartId={cart?.cartId}
          createCart={true}
          onCartCreated={(c: Cart) => saveCart(c)}
          className="flex items-center w-full gap-2"
          showModal={true}
          afterAddToCart={(c: Cart) => saveCart(c)}
          onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
          onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
        />
        <AddToFavorite
          productId={product.productId}
          onFavoriteChanged={refreshUser}
        />
      </div>
    </Card>
  );
}

/**
 * Above-the-fold breadcrumbs island. Lives in its own client component so the
 * non-serializable `configuration.urls.getCategoryUrl` function can be wired
 * up on the client — passing it directly from the Server Component would
 * throw at the RSC serialization step.
 */
export function ProductBreadcrumbsIsland({
  categoryPath,
  currentCategory,
  language,
  currentLabel,
}: {
  categoryPath: Category[];
  currentCategory?: Category;
  language: string;
  currentLabel: string;
}) {
  return (
    <Breadcrumbs
      categoryPath={categoryPath}
      currentCategory={currentCategory}
      language={language}
      configuration={config}
      currentLabel={currentLabel}
    />
  );
}

/**
 * Below-the-fold section — tabs, bundles, related/accessory sliders.
 * Sits outside the main 2-column grid, full width.
 */
export function ProductBelowFoldIsland({ product, productId }: ProductDetailIslandProps) {
  const router = useRouter();
  const { cart, saveCart } = useCart();
  const { language } = useLanguage();

  return (
    <>
      <ProductTabs product={product} productId={productId} />
      <div className="my-6">
        <ProductBundles
          productId={productId}
          cartId={cart?.cartId}
          taxZone="NL"
          createCart={true}
          showModal={true}
          onCartCreated={(newCart) => saveCart(newCart)}
          afterBundleAddToCart={(updatedCart) => saveCart(updatedCart)}
          onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
        />
      </div>
      <ProductSlider
        crossUpsellTypes={[CrossupsellType.ACCESSORIES]}
        productId={productId}
        taxZone="NL"
        showAvailability={false}
        showStock={true}
        cartId={cart?.cartId}
        createCart={true}
        onCartCreated={(newCart) => saveCart(newCart)}
        afterAddToCart={(updatedCart) => saveCart(updatedCart)}
        showModal={true}
        onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
        onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
        configuration={config}
        onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
        onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
      />
      <ProductSlider
        crossUpsellTypes={[CrossupsellType.RELATED]}
        productId={productId}
        taxZone="NL"
        showAvailability={false}
        showStock={true}
        cartId={cart?.cartId}
        createCart={true}
        onCartCreated={(newCart) => saveCart(newCart)}
        afterAddToCart={(updatedCart) => saveCart(updatedCart)}
        showModal={true}
        onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
        onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
        configuration={config}
        onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
        onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
      />
    </>
  );
}
