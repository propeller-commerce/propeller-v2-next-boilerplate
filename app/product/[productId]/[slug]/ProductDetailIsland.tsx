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
import { useTranslations } from '@/lib/i18n/client';
import { getTranslations } from '@/lib/i18n/server';
import { Cart, CrossupsellType, Contact, Customer, Product, ProductPrice as ProductPriceSDK, SurchargeType, type Surcharge } from '@propeller-commerce/propeller-sdk-v2';
import { Card } from '@/components/ui/Card';
import { AddToCart } from '@propeller-commerce/propeller-v2-react-ui';
import { Breadcrumbs } from '@propeller-commerce/propeller-v2-react-ui';
import { ProductTabs } from '@propeller-commerce/propeller-v2-react-ui';
import { ProductSlider } from '@propeller-commerce/propeller-v2-react-ui';
import { ProductBundles } from '@propeller-commerce/propeller-v2-react-ui';
import { AddToFavorite } from '@propeller-commerce/propeller-v2-react-ui';
import { ProductPrice, ProductBulkPrices } from '@propeller-commerce/propeller-v2-react-ui/pure';
import type { Category } from '@propeller-commerce/propeller-sdk-v2';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePrice } from '@/context/PriceContext';
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
  const addToCartLabels = useTranslations('AddToCart');
  const addToFavoriteLabels = useTranslations('AddToFavorite');

  // Update URL slug when the user switches language. Uses replaceState to
  // avoid a Next router re-render cascade that would otherwise trigger a
  // double fetch of the (already-server-rendered) product.
  //
  // IMPORTANT: pass the CURRENT `window.history.state`, not `null`. The App
  // Router keeps its navigation tree key in `history.state`; replacing it with
  // `null` desyncs the router from the real URL, which silently breaks
  // `<title>` / metadata updates on every subsequent soft navigation.
  useEffect(() => {
    const match = product.slugs?.find((s: { language?: string; value?: string }) => s.language === language);
    const slug = match?.value || product.slugs?.[0]?.value || '';
    const currentSlug = window.location.pathname.split('/').pop();
    if (slug && slug !== currentSlug) {
      window.history.replaceState(
        window.history.state,
        '',
        localizeHref(`/product/${productId}/${slug}`, language)
      );
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
          labels={addToCartLabels}
        />
        <AddToFavorite
          productId={product.productId}
          onFavoriteChanged={refreshUser}
          labels={addToFavoriteLabels}
        />
      </div>
    </Card>
  );
}

/**
 * Price + bulk-prices client island. The components themselves are pure /
 * rsc-safe, but the tax-mode preference is reactive — when the user toggles
 * the Header's VAT switch, this island re-reads `usePrice()` and re-renders
 * the prices in-place, no navigation required.
 *
 * The initial render still matches the server: `PriceProvider` is seeded
 * from the `price_include_tax` cookie in `app/layout.tsx`, and the server's
 * `getServerInfra()` reads the same cookie — so SSR HTML and this island's
 * first hydration snapshot agree (no flash for gross-price users on first
 * paint). The island only earns its keep on subsequent toggles within the
 * same page view.
 */
export function ProductPriceIsland({
  price,
  bulkPrices,
  surcharges,
  user,
  portalMode,
}: {
  price: ProductPriceSDK;
  bulkPrices: ProductPriceSDK[];
  surcharges?: Surcharge[];
  user: Contact | Customer | null;
  portalMode: string;
}) {
  const { includeTax } = usePrice();
  const { language } = useLanguage();
  const bulkPricesLabels = useTranslations('ProductBulkPrices');
  return (
    <>
      <ProductPrice
        price={price}
        includeTax={includeTax}
        user={user}
        portalMode={portalMode}
        currency={config.currency}
      />
      <ProductSurcharges surcharges={surcharges} language={language} />
      <div className="mt-6">
        <ProductBulkPrices
          bulkPrices={bulkPrices}
          includeTax={includeTax}
          user={user}
          portalMode={portalMode}
          labels={{ ...bulkPricesLabels, title: '' }}
        />
      </div>
    </>
  );
}

/**
 * Additional product surcharges (e.g. "Statiegeld" / deposit fees), shown
 * under the price. Mirrors playground-v2's `propeller-product-surcharges.php`:
 * a quantity (always 1 on the PDP) × value, formatted by surcharge `type` —
 * `FlatFee` → `1 x € 0,25 (Name)`, `Percentage` → `1 x 5% (Name)`.
 *
 * The surcharge data comes from the product query (`Product.surcharges`, fetched
 * by the SDK's `SurchargeFields` fragment) — no extra request. Renders nothing
 * when the product has no surcharges.
 */
function ProductSurcharges({
  surcharges,
  language,
}: {
  surcharges?: Surcharge[];
  language: string;
}) {
  const list = (surcharges ?? []).filter((s) => s.enabled !== false);
  if (list.length === 0) return null;
  const t = getTranslations(language, 'ProductDetail');

  // Localized surcharge name — match the active language, else the first entry.
  const surchargeName = (s: Surcharge): string =>
    s.name?.find((n) => n.language === language)?.value ?? s.name?.[0]?.value ?? '';

  // Match the PDP price block's Dutch number style (e.g. 0,25).
  const formatValue = (v: number): string =>
    new Intl.NumberFormat('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number(v || 0)
    );

  const quantity = 1; // PDP price block has no quantity selector — playground uses 1 here too.

  return (
    <div className="propeller-product-surcharges mt-2 text-sm text-muted-foreground">
      <span className="font-medium">{t.additionalSurcharges}</span>
      <ul className="propeller-product-surcharges__list mt-1 space-y-0.5">
        {list.map((s) => (
          <li key={s.id} className="propeller-product-surcharges__item">
            {s.type === SurchargeType.Percentage
              ? `${quantity} x ${s.value}% (${surchargeName(s)})`
              : `${quantity} x ${config.currency} ${formatValue(s.value)} (${surchargeName(s)})`}
          </li>
        ))}
      </ul>
    </div>
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
  currentLabel,
}: {
  categoryPath: Category[];
  currentCategory?: Category;
  currentLabel: string;
}) {
  const breadcrumbsLabels = useTranslations('Breadcrumbs');
  return (
    <Breadcrumbs
      categoryPath={categoryPath}
      currentCategory={currentCategory}
      currentLabel={currentLabel}
      labels={breadcrumbsLabels}
    />
  );
}

// Ordered list of cross-sell sections shown below the PDP fold. Each entry
// becomes one `<ProductSlider>` with its own title — passing multiple types to
// a single slider merges them into one section, which is NOT the UX we want.
const CROSS_SELLS = [
  CrossupsellType.ACCESSORIES,
  CrossupsellType.RELATED,
  CrossupsellType.ALTERNATIVES,
  CrossupsellType.OPTIONS,
  CrossupsellType.PARTS,
] as const;

/**
 * Below-the-fold section — tabs, bundles, related/accessory sliders.
 * Sits outside the main 2-column grid, full width.
 */
export function ProductBelowFoldIsland({ product, productId }: ProductDetailIslandProps) {
  const router = useRouter();
  const { cart, saveCart } = useCart();
  const { language } = useLanguage();
  const productTabsLabels = useTranslations('ProductTabs');
  const productBundlesLabels = useTranslations('ProductBundles');
  const productSliderLabels = useTranslations('ProductSlider');
  const productCardLabels = useTranslations('ProductCard');
  const clusterCardLabels = useTranslations('ClusterCard');
  const addToCartLabels = useTranslations('AddToCart');
  const itemStockLabels = useTranslations('ItemStock');
  const productPriceLabels = useTranslations('ProductPrice');

  return (
    <>
      <ProductTabs product={product} productId={productId} labels={productTabsLabels} />
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
          labels={productBundlesLabels}
        />
      </div>
      {CROSS_SELLS.map((type) => (
        <ProductSlider
          key={type}
          crossUpsellTypes={[type]}
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
          onProductClick={(p) => router.push(config.urls.getProductUrl(p, language))}
          onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, language))}
          labels={productSliderLabels}
          productCardLabels={productCardLabels}
          clusterCardLabels={clusterCardLabels}
          addToCartLabels={addToCartLabels}
          stockLabels={itemStockLabels}
          priceLabels={productPriceLabels}
        />
      ))}
    </>
  );
}
