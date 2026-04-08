'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  CartService,
  CartChildItemInput,
  GraphQLClient,
  Product,
  Cart,
  Contact,
  Customer,
  CartSearchInput,
  TransformationsInput,
  MediaImageProductSearchInput,
  CartStartInput,
  CartStartVariables,
  Address,
  Enums,
  CartMainItem,
  CartBaseItem,
  Cluster,
  PurchaseAuthorizationConfig,
  Company,
} from 'propeller-sdk-v2';

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
}
/** * Cart query variables interface Variables for the cart query */ /** * Cart query variables interface Variables for the cart query */ export interface CartQueryVariables {
  /** Cart ID to fetch */ cartId: string;
  /** Language for localized content */ language: string;
  /** Image search filters */ imageSearchFilters: MediaImageProductSearchInput;
  /** Image transformation filters */ imageVariantFilters: TransformationsInput;
}
/** * Cart query variables interface Variables for the cart query */ interface AddToCartState {
  quantity: number;
  loading: boolean;
  success: boolean;
  modalVisible: boolean;
  activeCartId: string;
  toastMessage: string;
  toastType: string;
  toastVisible: boolean;
  includeTax: boolean;
  priceListener: any;
  getMinQuantity: () => number;
  getStep: () => number;
  increment: () => void;
  decrement: () => void;
  showToast: (message: string, type: string) => void;
  dismissToast: () => void;
  getProductName: () => string;
  getProductUrl: () => string;
  getProductImageUrl: () => string;
  getProductSku: () => string;
  getProductPrice: () => string;
  addedCartItem: CartMainItem | null;
  activeFullCart: Cart | null;
  checkoutAllowed: () => boolean;
  getModalImageUrl: () => string;
  getModalName: () => string;
  getModalPrice: () => string;
  getModalSku: () => string;
  getChildItems: () => CartBaseItem[];
  initCart: () => Promise<string>;
  handleAddToCart: () => Promise<void>;
  closeModal: () => void;
  getLabel: (key: string, fallback: string) => string;
}
function AddToCart(props: AddToCartProps) {
  const [quantity, setQuantity] = useState<AddToCartState['quantity']>(() => 1);
  const [loading, setLoading] = useState<AddToCartState['loading']>(() => false);
  const [success, setSuccess] = useState<AddToCartState['success']>(() => false);
  const [modalVisible, setModalVisible] = useState<AddToCartState['modalVisible']>(() => false);
  const [activeCartId, setActiveCartId] = useState<AddToCartState['activeCartId']>(() => '');
  const [toastMessage, setToastMessage] = useState<AddToCartState['toastMessage']>(() => '');
  const [toastType, setToastType] = useState<AddToCartState['toastType']>(() => '');
  const [toastVisible, setToastVisible] = useState<AddToCartState['toastVisible']>(() => false);
  const [addedCartItem, setAddedCartItem] = useState<AddToCartState['addedCartItem']>(() => null);
  const [includeTax, setIncludeTax] = useState<AddToCartState['includeTax']>(() => false);
  const [priceListener, setPriceListener] = useState<AddToCartState['priceListener']>(() => null);
  const [activeFullCart, setActiveFullCart] = useState<AddToCartState['activeFullCart']>(
    () => null
  );
  function checkoutAllowed(): ReturnType<AddToCartState['checkoutAllowed']> {
    if (!props.user || !('contactId' in props.user)) return true;
    if (!props.companyId) return true;
    if (!activeFullCart) return true;
    const pacData = (props.user as Contact).purchaseAuthorizationConfigs;
    const items: PurchaseAuthorizationConfig[] = pacData?.items ?? [];
    const purchaserPAC = items.find((pac: PurchaseAuthorizationConfig) => {
      const role = pac.purchaseRole;
      const pacCompanyId = pac.company?.companyId;
      return role === Enums.PurchaseRole.PURCHASER && pacCompanyId === props.companyId;
    });
    if (!purchaserPAC) return true;
    const limit = purchaserPAC.authorizationLimit ?? 0;
    const totalNet = activeFullCart?.total?.totalNet ?? 0;
    return totalNet <= limit;
  }
  function getMinQuantity(): ReturnType<AddToCartState['getMinQuantity']> {
    const min = (props.product as Product)?.minimumQuantity;
    return min && min > 0 ? min : 1;
  }
  function getStep(): ReturnType<AddToCartState['getStep']> {
    const unit = (props.product as Product)?.unit;
    return unit && unit > 0 ? unit : 1;
  }
  function increment(): ReturnType<AddToCartState['increment']> {
    setQuantity(quantity + getStep());
  }
  function decrement(): ReturnType<AddToCartState['decrement']> {
    const min = getMinQuantity();
    const step = getStep();
    if (quantity - step >= min) {
      setQuantity(quantity - step);
    }
  }
  function showToast(message: string, type: string): ReturnType<AddToCartState['showToast']> {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  }
  function dismissToast(): ReturnType<AddToCartState['dismissToast']> {
    setToastVisible(false);
  }
  function getProductName(): ReturnType<AddToCartState['getProductName']> {
    return (props.product as Product)?.names?.[0]?.value || 'Product';
  }
  function getProductUrl(): ReturnType<AddToCartState['getProductUrl']> {
    return props.configuration.urls.getProductUrl(props.product, props.language);
  }
  function getProductImageUrl(): ReturnType<AddToCartState['getProductImageUrl']> {
    return (props.product as Product)?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }
  function getProductSku(): ReturnType<AddToCartState['getProductSku']> {
    return (props.product as Product)?.sku || '';
  }
  function getProductPrice(): ReturnType<AddToCartState['getProductPrice']> {
    const price =
      props.price !== undefined ? props.price : (props.product as Product)?.price?.gross;
    if (!price && price !== 0) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  async function initCart(): ReturnType<AddToCartState['initCart']> {
    const cartService = new CartService(props.graphqlClient);
    /* 1. Check for existing carts for this user first */ if (props.user) {
      try {
        const searchInput: CartSearchInput = { offset: 100, statuses: [Enums.CartStatus.OPEN] };
        if ('contactId' in props.user && props.user.contactId) {
          searchInput.contactIds = [props.user.contactId];
          const resolvedCompanyId =
            (props.companyId as number) || (props.user.company && props.user.company.companyId);
          if (resolvedCompanyId) {
            searchInput.companyIds = [resolvedCompanyId];
          }
        } else if ('customerId' in props.user && props.user.customerId) {
          searchInput.customerIds = [props.user.customerId];
        }
        const carts = await cartService.getCarts(searchInput);
        if (carts && carts.items && carts.items.length > 0) {
          const existingCartId = carts.items[carts.items.length - 1].cartId;
          const cartVariables: CartQueryVariables = {
            cartId: existingCartId,
            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
            language: props.configuration.language || 'NL',
          };
          const cart = await cartService.getCart(cartVariables);
          setActiveCartId(cart.cartId);
          if (props.onCartCreated) {
            props.onCartCreated(cart);
          }
          return cart.cartId;
        }
      } catch (e) {
        console.error('Failed to check existing carts', e);
      }
    }
    /* 2. Start a new cart */ const language = props.configuration.language || 'NL';
    const startCartInput: CartStartInput = { language };
    if (props.user) {
      if ('contactId' in props.user && props.user.contactId) {
        startCartInput.contactId = props.user.contactId;
        const resolvedCompanyId =
          (props.companyId as number) || (props.user as Contact).company?.companyId;
        if (resolvedCompanyId) {
          startCartInput.companyId = resolvedCompanyId as number;
        }
      } else if ('customerId' in props.user && props.user.customerId) {
        startCartInput.customerId = props.user.customerId;
      }
    }
    const cartStartVars: CartStartVariables = {
      input: startCartInput,
      imageSearchFilters: props.configuration.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration.imageVariantFiltersSmall,
      language: props.configuration.language || 'NL',
    };
    let newCart = await cartService.startCart(cartStartVars);
    /* 3. Assign Default Addresses */ if (newCart && props.user) {
      const addresses =
        'companies' in props.user
          ? props.user.companies?.items?.find(
              (company: Company) => company.companyId === props.companyId
            )?.addresses
          : (props.user as Customer).addresses;
      if (addresses && Array.isArray(addresses)) {
        const defaultInvoice = addresses.find(
          (addr: Address) => addr.isDefault === 'Y' && addr.type === 'invoice'
        );
        const defaultDelivery = addresses.find(
          (addr: Address) => addr.isDefault === 'Y' && addr.type === 'delivery'
        );
        if (defaultInvoice) {
          newCart = await cartService.updateCartAddress({
            id: newCart.cartId,
            input: {
              type: Enums.CartAddressType.INVOICE,
              firstName: defaultInvoice.firstName || '',
              lastName: defaultInvoice.lastName || '',
              street: defaultInvoice.street || '',
              postalCode: defaultInvoice.postalCode || '',
              city: defaultInvoice.city || '',
              country: defaultInvoice.country || 'NL',
              company: defaultInvoice.company || '',
              gender: defaultInvoice.gender || Enums.Gender.U,
              middleName: defaultInvoice.middleName || '',
              number: defaultInvoice.number || '',
              numberExtension: defaultInvoice.numberExtension || '',
              email: defaultInvoice.email || '',
              mobile: defaultInvoice.mobile || '',
              phone: defaultInvoice.phone || '',
              notes: defaultInvoice.notes || '',
            },
            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
            language: language,
          });
        }
        if (defaultDelivery) {
          newCart = await cartService.updateCartAddress({
            id: newCart.cartId,
            input: {
              type: Enums.CartAddressType.DELIVERY,
              firstName: defaultDelivery.firstName || '',
              lastName: defaultDelivery.lastName || '',
              street: defaultDelivery.street || '',
              postalCode: defaultDelivery.postalCode || '',
              city: defaultDelivery.city || '',
              country: defaultDelivery.country || 'NL',
              company: defaultDelivery.company || '',
              gender: defaultDelivery.gender || Enums.Gender.U,
              middleName: defaultDelivery.middleName || '',
              number: defaultDelivery.number || '',
              numberExtension: defaultDelivery.numberExtension || '',
              email: defaultDelivery.email || '',
              mobile: defaultDelivery.mobile || '',
              phone: defaultDelivery.phone || '',
              notes: defaultDelivery.notes || '',
            },
            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
            language: language,
          });
        }
      }
    }
    setActiveCartId(newCart.cartId);
    if (props.onCartCreated) {
      props.onCartCreated(newCart);
    }
    return newCart.cartId;
  }
  async function handleAddToCart(): ReturnType<AddToCartState['handleAddToCart']> {
    if (!props.graphqlClient) return;
    if (props.beforeAddToCart && !props.beforeAddToCart()) return;
    setLoading(true);
    setSuccess(false);
    try {
      /* Optional stock validation */ if (props.enableStockValidation) {
        const inventory = props.product.inventory;
        const available = inventory?.totalQuantity || 0;
        if (available < quantity) {
          showToast(getLabel('outOfStock', 'Insufficient stock available'), 'error');
          return;
        }
      }
      /* Map raw child-item IDs to CartChildItemInput[] */ const childItems:
        | CartChildItemInput[]
        | undefined = props.childItems
        ? props.childItems.map((id: number) => ({ productId: id, quantity: quantity }))
        : undefined;
      if (props.onAddToCart) {
        /* Consumer-provided handler */ const cart = props.onAddToCart(
          props.product,
          props.cluster?.clusterId,
          quantity,
          childItems,
          props.notes,
          props.price,
          props.showModal
        );
        setActiveFullCart(cart);
        const addedItem = cart.items?.find(
          (item: CartMainItem) => item.productId === props.product.productId
        );
        setAddedCartItem(addedItem || null);
        props.afterAddToCart?.(cart, addedItem);
      } else {
        /* Internal CartService fallback - resolve cart ID */ let cartId =
          props.cartId || activeCartId;
        if (!cartId) {
          if (props.createCart) {
            cartId = await initCart();
          }
          if (!cartId) {
            showToast(getLabel('noCartId', 'No cart ID provided'), 'error');
            return;
          }
        }
        const cartService = new CartService(props.graphqlClient);
        const cart = await cartService.addItemToCart({
          id: cartId,
          input: {
            productId: props.product.productId,
            quantity: quantity,
            ...(props.cluster?.clusterId !== undefined && { clusterId: props.cluster?.clusterId }),
            ...(childItems && { childItems }),
            ...(props.notes && { notes: props.notes }),
            ...(props.price !== undefined && { price: props.price }),
          },
          language: props.language || 'NL',
          imageSearchFilters: props.configuration.imageSearchFiltersGrid,
          imageVariantFilters: props.configuration.imageVariantFiltersSmall,
        });
        setActiveFullCart(cart);
        const addedItem = cart.items?.find((item) => item.productId === props.product.productId);
        setAddedCartItem(addedItem || null);
        props.afterAddToCart?.(cart, addedItem);
      }
      setSuccess(true);
      if (props.showModal) {
        setModalVisible(true);
      } else {
        showToast(`${getProductName()} ${getLabel('addedToCart', 'added to cart')}`, 'success');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast(getLabel('errorAdding', 'Failed to add item to cart'), 'error');
    } finally {
      setLoading(false);
    }
  }
  function getModalImageUrl(): ReturnType<AddToCartState['getModalImageUrl']> {
    if (addedCartItem) {
      const img = addedCartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
      if (img) return img;
    }
    return getProductImageUrl();
  }
  function getModalName(): ReturnType<AddToCartState['getModalName']> {
    if (addedCartItem) {
      return addedCartItem.product?.names?.[0]?.value || getProductName();
    }
    return getProductName();
  }
  function getModalPrice(): ReturnType<AddToCartState['getModalPrice']> {
    if (addedCartItem) {
      const useTax: boolean = props.includeTax !== undefined ? !!props.includeTax : includeTax;
      const price = useTax ? addedCartItem.totalSumNet : addedCartItem.totalSum;
      return '\u20AC' + Number(price).toFixed(2);
    }
    return getProductPrice();
  }
  function getModalSku(): ReturnType<AddToCartState['getModalSku']> {
    if (addedCartItem) return addedCartItem.product?.sku || '';
    return getProductSku();
  }
  function getChildItems(): ReturnType<AddToCartState['getChildItems']> {
    const children = addedCartItem?.childItems;
    if (!children || !Array.isArray(children)) return [];
    return children;
  }
  function closeModal(): ReturnType<AddToCartState['closeModal']> {
    setModalVisible(false);
    setSuccess(false);
    setAddedCartItem(null);
  }
  function getLabel(key: string, fallback: string): ReturnType<AddToCartState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }
  useEffect(() => {
    setQuantity(getMinQuantity());
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
              disabled={quantity <= getMinQuantity() || loading}
            >
              {' '}
              -{' '}
            </button>
            <input
              type="number"
              className="w-12 text-center text-sm bg-transparent border-none focus:ring-0 focus:outline-none h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={getMinQuantity()}
              step={getStep()}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                const min = getMinQuantity();
                const step = getStep();
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
            min={getMinQuantity()}
            step={getStep()}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              const min = getMinQuantity();
              const step = getStep();
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
              {checkoutAllowed() ? (
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
