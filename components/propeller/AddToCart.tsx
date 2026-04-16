'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  GraphQLClient,
  Product,
  Cart,
  Contact,
  Customer,
  MediaImageProductSearchInput,
  TransformationsInput,
  CartMainItem,
  CartBaseItem,
  CartChildItemInput,
  Cluster,
} from 'propeller-sdk-v2';
import { useCart } from '@/composables/react/useCart';

export interface AddToCartProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The authenticated user (Contact or Customer) */
  user: Contact | Customer | null;

  /** The product to be added to cart */
  product: Product;

  /** Cart ID — required when onAddToCart is not provided */
  cartId?: string;

  /** The cluster to be added to cart */
  cluster?: Cluster;

  /** IDs of the cluster child items, e.g. cluster options */
  childItems?: number[];

  /** Called before adding to cart. Return false to abort (e.g. failed validation). */
  beforeAddToCart?: () => boolean;

  /** Notes for the cart item */
  notes?: string;

  /** Custom price for the product (overrides calculated price) */
  price?: number;

  /** Label overrides for UI strings
   *
   * available labels:
   * - outOfStock
   * - noCartId
   * - errorAdding
   * - addedToCart
   * - modalTitle
   * - quantity
   * - continueShopping
   * - proceedToCheckout
   * - requestQuoteButton
   * - add
   * - adding
   */
  labels?: Record<string, string>;

  /**
   * If true a new cart is created if no cart ID is provided.
   * Defaults to false.
   */
  createCart?: boolean;

  /**
   * Callback to handle a new cart being created.
   * WARNING: If not provided the component create new carts on every add-to-cart.
   */
  onCartCreated?: (cart: Cart) => void;

  /**
   * Callback to handle adding the product to cart.
   * If not provided the component calls CartService.addItemToCart internally.
   */
  onAddToCart?: (
    product: Product,
    clusterId?: number,
    quantity?: number,
    childItems?: CartChildItemInput[],
    notes?: string,
    price?: number,
    showModal?: boolean
  ) => Cart;

  /**
   * Callback triggered after adding the product to cart.
   */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /**
   * When true a modal popup is shown after a successful add-to-cart
   * with buttons to continue shopping or proceed to checkout.
   * Defaults to false (only a brief inline success message is shown).
   */
  showModal?: boolean;

  /**
   * Renders − and + buttons beside the quantity input.
   * Defaults to true.
   */
  allowIncrDecr?: boolean;

  /**
   * Validates available stock via InventoryService before adding.
   * Defaults to false.
   */
  enableStockValidation?: boolean;

  /** Language code passed to CartService operations. Defaults to 'en'. */
  language?: string;

  /** Additional CSS class for the root element */
  className?: string;

  /** Callback fired when the "Proceed to checkout" modal button is clicked */
  onProceedToCheckout?: () => void;

  /** Configuration object passed to the component */
  configuration?: any;

  /** Active company ID from the company switcher. Overrides user's default company for cart creation and lookup. */ companyId?: number;
  /**   * When true, tax-inclusive price (net) is shown.   * When false, tax-exclusive price (gross) is shown.   * Defaults to false.   */ includeTax?: boolean;
  /** Callback fired when "Request a Quote" is clicked in the add-to-cart modal. Only shown for contacts when checkout is allowed. */
  onRequestQuoteClick?: (cart: Cart) => void;
}
/** * Cart query variables interface Variables for the cart query */ /** * Cart query variables interface Variables for the cart query */ export interface CartQueryVariables {
  /** Cart ID to fetch */ cartId: string;
  /** Language for localized content */ language: string;
  /** Image search filters */ imageSearchFilters: MediaImageProductSearchInput;
  /** Image transformation filters */ imageVariantFilters: TransformationsInput;
}

function AddToCart(props: AddToCartProps) {
  // --- composable ---
  const { cart, loading, checkoutAllowed, addItem, getMinQuantity, getStep } = useCart({
    graphqlClient: props.graphqlClient,
    user: props.user,
    companyId: props.companyId,
    configuration: props.configuration,
    onCartCreated: props.onCartCreated,
  });

  // --- local UI state ---
  const [quantity, setQuantity] = useState<number>(() => 1);
  const [toastMessage, setToastMessage] = useState<string>(() => '');
  const [toastType, setToastType] = useState<string>(() => '');
  const [toastVisible, setToastVisible] = useState<boolean>(() => false);
  const [modalVisible, setModalVisible] = useState<boolean>(() => false);
  const [addedCartItem, setAddedCartItem] = useState<CartMainItem | null>(() => null);
  const [activeFullCart, setActiveFullCart] = useState<Cart | null>(() => null);
  const [includeTax, setIncludeTax] = useState<boolean>(() => false);

  // --- display helpers ---
  function getLabel(key: string, fallback: string): string {
    return (props.labels as any)?.[key] || fallback;
  }
  function getProductName(): string {
    return (props.product as Product)?.names?.[0]?.value || 'Product';
  }
  function getProductUrl(): string {
    return props.configuration.urls.getProductUrl(props.product, props.language);
  }
  function getProductImageUrl(): string {
    return (props.product as Product)?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }
  function getProductSku(): string {
    return (props.product as Product)?.sku || '';
  }
  function getProductPrice(): string {
    const price =
      props.price !== undefined ? props.price : (props.product as Product)?.price?.gross;
    if (!price && price !== 0) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
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
  function increment(): void {
    setQuantity(quantity + getStep(props.product));
  }
  function decrement(): void {
    const min = getMinQuantity(props.product);
    const step = getStep(props.product);
    if (quantity - step >= min) {
      setQuantity(quantity - step);
    }
  }
  function getModalImageUrl(): string {
    if (addedCartItem) {
      const img = addedCartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
      if (img) return img;
    }
    return getProductImageUrl();
  }
  function getModalName(): string {
    if (addedCartItem) {
      return addedCartItem.product?.names?.[0]?.value || getProductName();
    }
    return getProductName();
  }
  function getModalPrice(): string {
    if (addedCartItem) {
      const useTax: boolean = props.includeTax !== undefined ? !!props.includeTax : includeTax;
      const price = useTax ? addedCartItem.totalSumNet : addedCartItem.totalSum;
      return '\u20AC' + Number(price).toFixed(2);
    }
    return getProductPrice();
  }
  function getModalSku(): string {
    if (addedCartItem) return addedCartItem.product?.sku || '';
    return getProductSku();
  }
  function getChildItems(): CartBaseItem[] {
    const children = addedCartItem?.childItems;
    if (!children || !Array.isArray(children)) return [];
    return children;
  }
  function closeModal(): void {
    setModalVisible(false);
    setAddedCartItem(null);
  }

  // --- main action ---
  async function handleAddToCart(): Promise<void> {
    if (!props.graphqlClient) return;
    if (props.beforeAddToCart && !props.beforeAddToCart()) return;

    const result = await addItem({
      product: props.product,
      cluster: props.cluster,
      childItems: props.childItems,
      quantity,
      notes: props.notes,
      price: props.price,
      onAddToCart: props.onAddToCart
        ? (product, clusterId, qty, childItemInputs, notes, price) =>
            props.onAddToCart!(product, clusterId, qty, childItemInputs, notes, price, props.showModal)
        : undefined,
      afterAddToCart: (resultCart, addedItem) => {
        setActiveFullCart(resultCart);
        setAddedCartItem(addedItem || null);
        props.afterAddToCart?.(resultCart, addedItem || undefined);
      },
      enableStockValidation: props.enableStockValidation,
      cartId: props.cartId,
      createCart: props.createCart,
    });

    if (!result.success) {
      showToast(
        result.error === 'Insufficient stock available'
          ? getLabel('outOfStock', 'Insufficient stock available')
          : result.error === 'No cart ID provided'
          ? getLabel('noCartId', 'No cart ID provided')
          : getLabel('errorAdding', 'Failed to add item to cart'),
        'error'
      );
      return;
    }

    if (result.cart) {
      setActiveFullCart(result.cart);
      setAddedCartItem(result.item || null);
    }

    if (props.showModal) {
      setModalVisible(true);
    } else {
      showToast(`${getProductName()} ${getLabel('addedToCart', 'added to cart')}`, 'success');
    }
  }

  useEffect(() => {
    setQuantity(getMinQuantity(props.product));
  }, []);

  return (
    <div className={props.className}>
      <div className="flex items-center gap-2 w-full">
        {props.allowIncrDecr !== false ? (
          <div className="flex items-center border border-gray-300 rounded-md bg-white h-10">
            <button
              type="button"
              className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-md select-none"
              onClick={(event) => decrement()}
              disabled={quantity <= getMinQuantity(props.product) || loading}
            >
              {' '}
              -{' '}
            </button>
            <input
              type="number"
              className="w-12 text-center text-sm bg-transparent border-none focus:ring-0 focus:outline-none h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={getMinQuantity(props.product)}
              step={getStep(props.product)}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const min = getMinQuantity(props.product);
                const step = getStep(props.product);
                if (!isNaN(val) && val >= min) {
                  setQuantity(Math.round((val - min) / step) * step + min);
                }
              }}
            />
            <button
              type="button"
              className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-md select-none"
              onClick={(event) => increment()}
              disabled={loading}
            >
              {' '}
              +{' '}
            </button>
          </div>
        ) : null}
        {props.allowIncrDecr === false ? (
          <input
            type="number"
            className="w-16 h-10 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min={getMinQuantity(props.product)}
            step={getStep(props.product)}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              const min = getMinQuantity(props.product);
              const step = getStep(props.product);
              if (!isNaN(val) && val >= min) {
                setQuantity(Math.round((val - min) / step) * step + min);
              }
            }}
          />
        ) : null}
        <button
          type="button"
          className="flex-1 inline-flex justify-center items-center h-10 px-6 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          onClick={(event) => handleAddToCart()}
          disabled={loading}
        >
          {loading ? <>{getLabel('adding', 'Adding...')}</> : null}
          {!loading ? <>{getLabel('add', 'Add')}</> : null}
        </button>
      </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                {!!getModalImageUrl() ? (
                  <img
                    className="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                    src={getModalImageUrl()}
                    alt={getModalName()}
                  />
                ) : null}
                {!getModalImageUrl() ? (
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
                  <a
                    className="text-sm font-medium text-secondary leading-tight hover:underline line-clamp-2"
                    href={getProductUrl()}
                  >
                    {getModalName()}
                  </a>
                  {!!getModalSku() ? (
                    <p className="text-xs text-gray-400 mt-0.5">SKU: {getModalSku()}</p>
                  ) : null}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-gray-500">
                    {getLabel('quantity', 'Quantity')}: {quantity}
                  </p>
                  {!!getModalPrice() ? (
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{getModalPrice()}</p>
                  ) : null}
                </div>
              </div>
              {getChildItems().length > 0 ? (
                <div className="mt-3 ml-20 space-y-1 border-l-2 border-gray-100 pl-2">
                  {getChildItems()?.map((child, idx) => (
                    <div
                      className="flex justify-between items-center text-xs text-gray-600"
                      key={idx}
                    >
                      <span className="line-clamp-1">
                        {child.product?.names?.[0]?.value || 'Option'}
                      </span>
                      <span className="text-gray-400 whitespace-nowrap ml-2">
                        {'\u20AC' +
                          (((props.includeTax !== undefined ? !!props.includeTax : includeTax)
                            ? child.totalSumNet
                            : child.totalSum
                          )?.toFixed(2) || '0.00')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                onClick={(event) => closeModal()}
              >
                {getLabel('continueShopping', 'Continue shopping')}
              </button>
              {checkoutAllowed && props.onRequestQuoteClick && props.user && 'contactId' in props.user ? (
                <button
                  type="button"
                  className="flex-1 inline-flex justify-center rounded-md border border-input bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onClick={(event) => {
                    closeModal();
                    if (cart) props.onRequestQuoteClick!(cart);
                  }}
                >
                  {getLabel('requestQuoteButton', 'Request a Quote')}
                </button>
              ) : null}
              {checkoutAllowed ? (
                <button
                  type="button"
                  className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                  onClick={(event) => {
                    closeModal();
                    if (props.onProceedToCheckout) props.onProceedToCheckout();
                  }}
                >
                  {getLabel('proceedToCheckout', 'Proceed to checkout')}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
export default AddToCart;
