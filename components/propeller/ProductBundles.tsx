'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  GraphQLClient,
  Contact,
  Customer,
  Cart,
  Enums,
  Bundle,
  BundleItem,
  Product,
} from 'propeller-sdk-v2';
import { useProductBundles } from '@/composables/react/useProductBundles';

export interface ProductBundlesProps {
  // === Core ===

  /** GraphQL client instance used to fetch bundle data. */
  graphqlClient: GraphQLClient;

  /** ID of the product whose bundles should be fetched. */
  productId: number;

  /** Language code used for content (e.g. 'NL', 'EN'). */
  language: string;

  /** Tax zone code used for pricing (e.g. 'NL'). */
  taxZone: string;

  // === Pricing ===

  /**
   * When true, net price (incl. tax) is the leading price.
   * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
   */
  includeTax?: boolean;

  // === Portal / visibility ===

  /**
   * Controls portal visibility mode.
   * 'semi-closed' — prices and add-to-cart are hidden for anonymous users.
   * Defaults to 'open'.
   */
  portalMode?: string;

  /** Authenticated user — used for semi-closed visibility check. */
  user?: Contact | Customer | null;

  /** Cart ID — required when onAddToCart is not provided */
  cartId?: string;

  /**
   * Callback to handle a new cart being created.
   * WARNING: If not provided the component create new carts on every add-to-cart.
   */
  onCartCreated?: (cart: Cart) => void;

  /**
   * If true a new cart is created if no cart ID is provided.
   * Defaults to false.
   */
  createCart?: boolean;

  // === Display options ===

  /** When true, stock availability is validated before adding to cart. */
  stockValidation?: boolean;

  /**
   * When true, the individual bundle items are listed inside each bundle card.
   * Defaults to true.
   */
  showIndividualItems?: boolean;

  /** Additional configuration object passed through to the component. */
  configuration?: any;

  /**
   * Layout variant for the bundle display.
   * - 'vertical' — stacked layout
   * - 'horizontal' — side-by-side (default)
   * - 'compact' — condensed, hides individual items
   */
  layout?: 'vertical' | 'horizontal' | 'compact';

  /**
   * Override any UI string.
   * Available keys: title, condition_ALL, condition_EP, leaderItem,
   * youSave, adding, addToCart, loginToSeePrices, addedToCart,
   * modalTitle, continueShopping, proceedToCheckout, noCartId
   */
  labels?: Record<string, string>;

  // === Modal / feedback ===

  /**
   * When true a modal popup is shown after a successful add-to-cart
   * with buttons to continue shopping or proceed to checkout.
   * Defaults to false (only a brief inline toast is shown).
   */
  showModal?: boolean;

  /** Callback fired when the "Proceed to checkout" modal button is clicked */
  onProceedToCheckout?: () => void;

  // === Callbacks ===

  /**
   * Callback triggered before adding the bundle to cart.
   */
  beforeBundleAddToCart?: (bundleId: string, quantity: number) => boolean;

  /** Called when the user clicks "Add bundle to cart". Receives bundleId and quantity (always 1). */
  onAddBundleToCart?: (bundleId: string, quantity: number) => void;

  /**
   * Callback triggered after adding the bundle to cart.
   */
  afterBundleAddToCart?: (cart: Cart, bundle?: Bundle) => void;

  /** Extra CSS class applied to the root wrapper element. */
  className?: string;
}

function ProductBundles(props: ProductBundlesProps) {
  const [isMounted, setIsMounted] = useState<boolean>(() => false);
  const [addingBundleId, setAddingBundleId] = useState<string | null>(() => null);
  const [lastAddedBundle, setLastAddedBundle] = useState<Bundle | null>(() => null);
  const [toastMessage, setToastMessage] = useState<string>(() => '');
  const [toastType, setToastType] = useState<string>(() => '');
  const [toastVisible, setToastVisible] = useState<boolean>(() => false);
  const [modalVisible, setModalVisible] = useState<boolean>(() => false);

  const {
    bundles: fetchedBundles,
    loading: isLoading,
    cartId: composableCartId,
    fetchBundles,
    addBundleToCart: composableAddBundleToCart,
  } = useProductBundles({
    graphqlClient: props.graphqlClient,
    user: (props.user as any) || null,
    language: props.language,
    configuration: props.configuration || {},
    onCartCreated: props.onCartCreated,
  });

  // Cast fetched bundles back to SDK Bundle type for display
  const bundles = fetchedBundles as unknown as Bundle[];

  function getIncludeTax(): boolean {
    return props.includeTax !== undefined ? !!props.includeTax : false;
  }

  function getShowItems(): boolean {
    return props.showIndividualItems !== undefined ? !!props.showIndividualItems : true;
  }

  function getLayout(): string {
    return (props.layout as string) || 'horizontal';
  }

  function getIsAnonymous(): boolean {
    return !props.user;
  }

  function getHidePrices(): boolean {
    return (props.portalMode as string) === 'semi-closed' && getIsAnonymous();
  }

  function getLabel(key: string, fallback: string): string {
    const val = (props.labels as Record<string, string>)?.[key];
    return val !== undefined ? val : fallback;
  }

  function formatPrice(value: number): string {
    return '\u20AC' + Number(value).toFixed(2);
  }

  function getBundlePrice(bundle: Bundle): number {
    return getIncludeTax() ? bundle.price?.net || 0 : bundle.price?.gross || 0;
  }

  function getOriginalPrice(bundle: Bundle): number {
    return getIncludeTax() ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;
  }

  function getItemPrice(item: BundleItem): number {
    return getIncludeTax() ? item.price?.net || 0 : item.price?.gross || 0;
  }

  function hasDiscount(bundle: Bundle): boolean {
    const current: number = getBundlePrice(bundle);
    const original: number = getOriginalPrice(bundle);
    return original > 0 && current < original;
  }

  function getDiscountPercentage(bundle: Bundle): number {
    const original: number = getOriginalPrice(bundle);
    if (original <= 0) return 0;
    return Math.round(((original - getBundlePrice(bundle)) / original) * 100);
  }

  function getProductImage(product: Product): string {
    return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }

  function getProductName(product: Product): string {
    return product?.names?.[0]?.value || '';
  }

  function showToast(message: string, type: string): void {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  }

  function dismissToast(): void {
    setToastVisible(false);
  }

  function closeModal(): void {
    setModalVisible(false);
    setLastAddedBundle(null);
  }

  async function handleAddToCart(bundle: Bundle): Promise<void> {
    if (addingBundleId) return;
    setAddingBundleId(bundle.id);
    try {
      if (props.onAddBundleToCart) {
        props.onAddBundleToCart(bundle.id, 1);
      } else {
        if (!props.graphqlClient) return;
        if (props.beforeBundleAddToCart) {
          props.beforeBundleAddToCart(bundle.id, 1);
        }

        const existingCartId = props.cartId || composableCartId;
        const result = await composableAddBundleToCart(bundle.id as unknown as number, existingCartId || undefined);

        if (!result.success) {
          showToast(result.error || getLabel('noCartId', 'No cart ID provided'), 'error');
          return;
        }

        if (result.cart && props.afterBundleAddToCart) {
          props.afterBundleAddToCart(result.cart, bundle);
        }
      }
      if (props.showModal) {
        setLastAddedBundle(bundle);
        setModalVisible(true);
      } else {
        const bundleName = bundle.name || getLabel('title', 'Bundle');
        showToast(`${bundleName} ${getLabel('addedToCart', 'added to cart')}`, 'success');
      }
    } catch (error) {
      console.error('Error adding bundle to cart:', error);
      showToast(getLabel('errorAdding', 'Failed to add bundle to cart'), 'error');
    } finally {
      setAddingBundleId(null);
    }
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchBundles(props.productId);
  }, [props.productId]);

  return (
    <>
      {isMounted && !isLoading && bundles.length > 0 ? (
        <>
          <div className={props.className || 'mb-12'}>
            {bundles?.map((bundle, bundleIdx) => (
              <div
                className="border border-gray-200 rounded-xl bg-white shadow-sm mb-6 p-6"
                key={bundle.id || bundleIdx}
              >
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {getShowItems() &&
                  getLayout() !== 'compact' &&
                  bundle.items &&
                  bundle.items.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-center gap-2 flex-1">
                      {bundle.items?.map((item, idx) => (
                        <div className="flex items-center gap-2" key={item.productId + '-' + idx}>
                          {idx > 0 ? (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                              <svg
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                className="w-5 h-5 text-white"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 4.5v15m7.5-7.5h-15"
                                />
                              </svg>
                            </div>
                          ) : null}
                          <div className="flex flex-col items-center text-center w-40">
                            <div className="w-32 h-32 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 mb-2">
                              {getProductImage(item.product) ? (
                                <img
                                  className="w-full h-full object-contain p-2"
                                  src={getProductImage(item.product)}
                                  alt={getProductName(item.product)}
                                />
                              ) : null}
                            </div>
                            <div className="text-sm font-medium text-gray-600 leading-tight mb-1">
                              {getProductName(item.product) || 'Product ' + item.productId}
                            </div>
                            {!getHidePrices() && item.price ? (
                              <div className="text-sm font-semibold text-gray-900">
                                {formatPrice(getItemPrice(item))}
                                <span className="text-xs font-normal text-gray-500 ml-1">
                                  {getIncludeTax() ? (
                                    <>{getLabel('inclTax', 'incl. VAT')}</>
                                  ) : (
                                    <>{getLabel('exclTax', 'excl. VAT')}</>
                                  )}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-5 h-5 text-white"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 12h16.5M3.75 7.5h16.5"
                      />
                    </svg>
                  </div>
                  <div className="flex-shrink-0 w-full lg:w-72 pl-0 lg:pl-6">
                    <h3 className="text-xl font-bold text-gray-700 mb-1">
                      {bundle.name || getLabel('title', 'Combo deal')}
                    </h3>
                    {bundle.description ? (
                      <p className="text-sm text-gray-600 mb-3">{bundle.description}</p>
                    ) : null}
                    {bundle.condition ? (
                      <p className="text-xs text-gray-500 mb-3">
                        {bundle.condition === Enums.BundleCondition.ALL ? (
                          <>{getLabel('condition_ALL', 'Discount on all items')}</>
                        ) : (
                          <>{getLabel('condition_EP', 'Discount on extra items')}</>
                        )}
                      </p>
                    ) : null}
                    {!getHidePrices() ? (
                      <>
                        <div className="mb-3">
                          {hasDiscount(bundle) ? (
                            <span className="text-gray-400 line-through text-sm">
                              {formatPrice(getOriginalPrice(bundle))}
                            </span>
                          ) : null}
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">
                              {formatPrice(getBundlePrice(bundle))}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getIncludeTax() ? (
                                <>{getLabel('inclTax', 'incl. VAT')}</>
                              ) : (
                                <>{getLabel('exclTax', 'excl. VAT')}</>
                              )}
                            </span>
                          </div>
                          {hasDiscount(bundle) ? (
                            <div className="mt-2 inline-block bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-md">
                              {getLabel('youSave', 'Your savings:')}
                              {formatPrice(getOriginalPrice(bundle) - getBundlePrice(bundle))}
                            </div>
                          ) : null}
                        </div>
                        <button
                          className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
                          onClick={(event) => handleAddToCart(bundle)}
                          disabled={addingBundleId === bundle.id}
                        >
                          {addingBundleId === bundle.id ? (
                            <>{getLabel('adding', 'Adding...')}</>
                          ) : (
                            <>{getLabel('addToCart', 'In cart')}</>
                          )}
                        </button>
                      </>
                    ) : null}
                    {getHidePrices() ? (
                      <div className="text-center text-sm text-gray-500 py-2">
                        {getLabel('loginToSeePrices', 'Log in to see prices and add to cart')}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {toastVisible ? (
              <div
                className={`fixed top-4 right-4 z-50 flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 ${toastType === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
              >
                <div
                  className={`flex-shrink-0 w-5 h-5 mt-0.5 ${toastType === 'success' ? 'text-green-500' : 'text-red-500'}`}
                >
                  {toastType === 'success' ? (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                  {toastType === 'error' ? (
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                      />
                    </svg>
                  ) : null}
                </div>
                <p
                  className={`flex-1 text-sm font-medium ${toastType === 'success' ? 'text-green-800' : 'text-red-800'}`}
                >
                  {toastMessage}
                </p>
                <button
                  type="button"
                  onClick={(event) => dismissToast()}
                  className={`flex-shrink-0 rounded focus:outline-none ${toastType === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="h-4 w-4"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : null}
            {modalVisible ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="fixed inset-0 bg-gray-500/20" onClick={(event) => closeModal()} />
                <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-5 w-5 flex-shrink-0 text-green-500"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <h3 className="flex-1 text-base font-semibold text-gray-900">
                      {getLabel('modalTitle', 'Added to cart')}
                    </h3>
                    <button
                      type="button"
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
                      onClick={(event) => closeModal()}
                    >
                      <svg
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="h-5 w-5"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="px-6 py-5">
                    <div className="flex items-start gap-4">
                      {lastAddedBundle &&
                      lastAddedBundle.items &&
                      lastAddedBundle.items.length > 0 &&
                      getProductImage(lastAddedBundle.items[0].product) ? (
                        <img
                          className="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                          src={
                            lastAddedBundle?.items?.[0]
                              ? getProductImage(lastAddedBundle.items[0].product)
                              : ''
                          }
                          alt={lastAddedBundle?.name || 'Bundle'}
                        />
                      ) : null}
                      {!lastAddedBundle ||
                      !lastAddedBundle.items ||
                      lastAddedBundle.items.length === 0 ||
                      !getProductImage(lastAddedBundle.items[0].product) ? (
                        <div className="w-16 h-16 flex items-center justify-center rounded border border-gray-100 flex-shrink-0 bg-gray-50">
                          <svg
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            className="w-8 h-8 text-gray-300"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                            />
                          </svg>
                        </div>
                      ) : null}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {lastAddedBundle?.name || getLabel('title', 'Bundle')}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-xs text-gray-500">
                          {getLabel('quantity', 'Quantity')}: 1
                        </p>
                        {!getHidePrices() && lastAddedBundle ? (
                          <p className="text-sm font-semibold text-gray-900 mt-0.5">
                            {formatPrice(getBundlePrice(lastAddedBundle!))}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {lastAddedBundle &&
                    lastAddedBundle.items &&
                    lastAddedBundle.items.length > 0 ? (
                      <div className="mt-3 ml-20 space-y-1 border-l-2 border-secondary/10 pl-2">
                        {lastAddedBundle?.items?.map((item, idx) => (
                          <div
                            className="flex justify-between items-center text-xs text-gray-600"
                            key={item.productId + '-' + idx}
                          >
                            <span className="line-clamp-1">
                              {getProductName(item.product) || 'Product'}
                            </span>
                            {!getHidePrices() && item.price ? (
                              <span className="text-gray-400 whitespace-nowrap ml-2">
                                {formatPrice(getItemPrice(item))}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                    <button
                      type="button"
                      className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      onClick={(event) => closeModal()}
                    >
                      {getLabel('continueShopping', 'Continue shopping')}
                    </button>
                    <button
                      type="button"
                      className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      onClick={(event) => {
                        closeModal();
                        if (props.onProceedToCheckout) props.onProceedToCheckout();
                      }}
                    >
                      {getLabel('proceedToCheckout', 'Proceed to checkout')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}

export default ProductBundles;
