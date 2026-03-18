'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient, BundleService, CartService, BundleQueryVariables, Contact, Customer, Cart, Enums, CartAddBundleVariables, CartSearchInput, Bundle, CartQueryVariables, CartStartInput, CartStartVariables, Address } from 'propeller-sdk-v2';



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
interface ProductBundlesState {
bundles: Bundle[];
isLoading: boolean;
includeTax: boolean;
isMounted: boolean;
addingBundleId: string | null;
lastAddedBundle: Bundle | null;
activeCartId: string;
toastMessage: string;
toastType: string;
toastVisible: boolean;
modalVisible: boolean;
getIncludeTax: () => boolean;
getShowItems: () => boolean;
getLayout: () => string;
getIsAnonymous: () => boolean;
getHidePrices: () => boolean;
getLabel: (key: string, fallback: string) => string;
formatPrice: (value: number) => string;
getBundlePrice: (bundle: any) => number;
getOriginalPrice: (bundle: any) => number;
getItemPrice: (item: any) => number;
hasDiscount: (bundle: any) => boolean;
getDiscountPercentage: (bundle: any) => number;
getProductImage: (product: any) => string;
getProductName: (product: any) => string;
showToast: (message: string, type: string) => void;
dismissToast: () => void;
closeModal: () => void;
fetchBundles: () => Promise<void>;
handleAddToCart: (bundle: Bundle) => Promise<void>;
initCart: () => Promise<void>;
}




  function ProductBundles(props:ProductBundlesProps) {

  const [bundles, setBundles] = useState<ProductBundlesState["bundles"]>(() => ([]))


const [isLoading, setIsLoading] = useState<ProductBundlesState["isLoading"]>(() => (false))


const [includeTax, setIncludeTax] = useState<ProductBundlesState["includeTax"]>(() => (true))


const [isMounted, setIsMounted] = useState<ProductBundlesState["isMounted"]>(() => (false))


const [addingBundleId, setAddingBundleId] = useState<ProductBundlesState["addingBundleId"]>(() => (null))


const [lastAddedBundle, setLastAddedBundle] = useState<ProductBundlesState["lastAddedBundle"]>(() => (null))


const [activeCartId, setActiveCartId] = useState<ProductBundlesState["activeCartId"]>(() => (''))


const [toastMessage, setToastMessage] = useState<ProductBundlesState["toastMessage"]>(() => (''))


const [toastType, setToastType] = useState<ProductBundlesState["toastType"]>(() => (''))


const [toastVisible, setToastVisible] = useState<ProductBundlesState["toastVisible"]>(() => (false))


const [modalVisible, setModalVisible] = useState<ProductBundlesState["modalVisible"]>(() => (false))


function getIncludeTax(): ReturnType<ProductBundlesState["getIncludeTax"]>{
return props.includeTax !== undefined ? !!props.includeTax : includeTax;
}


function getShowItems(): ReturnType<ProductBundlesState["getShowItems"]>{
return props.showIndividualItems !== undefined ? !!props.showIndividualItems : true;
}


function getLayout(): ReturnType<ProductBundlesState["getLayout"]>{
return props.layout as string || 'horizontal';
}


function getIsAnonymous(): ReturnType<ProductBundlesState["getIsAnonymous"]>{
return !props.user;
}


function getHidePrices(): ReturnType<ProductBundlesState["getHidePrices"]>{
return props.portalMode as string === 'semi-closed' && getIsAnonymous();
}


function getLabel(key: string, fallback: string): ReturnType<ProductBundlesState["getLabel"]>{
const val = (props.labels as Record<string, string>)?.[key];
return val !== undefined ? val : fallback;
}


function formatPrice(value: number): ReturnType<ProductBundlesState["formatPrice"]>{
return '\u20AC' + Number(value).toFixed(2);
}


function getBundlePrice(bundle: any): ReturnType<ProductBundlesState["getBundlePrice"]>{
return getIncludeTax() ? bundle.price?.net || 0 : bundle.price?.gross || 0;
}


function getOriginalPrice(bundle: any): ReturnType<ProductBundlesState["getOriginalPrice"]>{
return getIncludeTax() ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;
}


function getItemPrice(item: any): ReturnType<ProductBundlesState["getItemPrice"]>{
return getIncludeTax() ? item.price?.net || 0 : item.price?.gross || 0;
}


function hasDiscount(bundle: any): ReturnType<ProductBundlesState["hasDiscount"]>{
const current: number = getBundlePrice(bundle);
const original: number = getOriginalPrice(bundle);
return original > 0 && current < original;
}


function getDiscountPercentage(bundle: any): ReturnType<ProductBundlesState["getDiscountPercentage"]>{
const original: number = getOriginalPrice(bundle);
if (original <= 0) return 0;
return Math.round((original - getBundlePrice(bundle)) / original * 100);
}


function getProductImage(product: any): ReturnType<ProductBundlesState["getProductImage"]>{
return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}


function getProductName(product: any): ReturnType<ProductBundlesState["getProductName"]>{
return product?.names?.[0]?.value || '';
}


function showToast(message: string, type: string): ReturnType<ProductBundlesState["showToast"]>{
setToastMessage(message);
setToastType(type);
setToastVisible(true);
setTimeout(() => {
setToastVisible(false);
}, 3000);
}


function dismissToast(): ReturnType<ProductBundlesState["dismissToast"]>{
setToastVisible(false);
}


function closeModal(): ReturnType<ProductBundlesState["closeModal"]>{
setModalVisible(false);
setLastAddedBundle(null);
}


async function initCart(): ReturnType<ProductBundlesState["initCart"]>{
const cartService = new CartService(props.graphqlClient);
// 1. Check for existing carts for this user first
if (props.user) {
try {
  const searchInput: CartSearchInput = {
    offset: 100
  };
  if ('contactId' in props.user && props.user.contactId) {
    searchInput.contactIds = [props.user.contactId];
    if (props.user.company && 'companyId' in props.user.company && props.user.company.companyId) {
      searchInput.companyIds = [props.user.company.companyId];
    }
  } else if ('customerId' in props.user && props.user.customerId) {
    searchInput.customerIds = [props.user.customerId];
  }
  const carts = await cartService.getCarts(searchInput);
  if (carts && carts.items && carts.items.length > 0) {
    const cartId = carts.items[carts.items.length - 1].cartId;
    const cartVariables: CartQueryVariables = {
      cartId: cartId,
      imageSearchFilters: props.configuration.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration.imageVariantFiltersSmall,
      language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
    };
    const cart = await cartService.getCart(cartVariables);
    setActiveCartId(cart.cartId);
    if (props.onCartCreated) {
      props.onCartCreated(cart);
    }
  }
} catch (e) {
  console.error("Failed to check existing carts", e);
}
}

// 2. Start a new cart
const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
const startCartInput: CartStartInput = {
language
};
if (props.user) {
if ('contactId' in props.user && props.user.contactId) {
  startCartInput.contactId = props.user.contactId;
  if ('companyId' in props.user && props.user.companyId) {
    startCartInput.companyId = props.user.companyId as number;
  }
} else if ('customerId' in props.user && props.user.customerId) {
  startCartInput.customerId = props.user.customerId;
}
}
const cartStartVars: CartStartVariables = {
input: startCartInput,
imageSearchFilters: props.configuration.imageSearchFiltersGrid,
imageVariantFilters: props.configuration.imageVariantFiltersSmall,
language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
};
let newCart = await cartService.startCart(cartStartVars);

// 3. Assign Default Addresses
if (newCart && props.user) {
const addresses = 'company' in props.user ? props.user.company?.addresses : (props.user as Customer).addresses;
if (addresses && Array.isArray(addresses)) {
  const defaultInvoice = addresses.find((addr: Address) => addr.isDefault === 'Y' && addr.type === 'invoice');
  const defaultDelivery = addresses.find((addr: Address) => addr.isDefault === 'Y' && addr.type === 'delivery');
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
        notes: defaultInvoice.notes || ''
      },
      imageSearchFilters: props.configuration.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration.imageVariantFiltersSmall,
      language: language
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
        notes: defaultDelivery.notes || ''
      },
      imageSearchFilters: props.configuration.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration.imageVariantFiltersSmall,
      language: language
    });
  }
}
}
setActiveCartId(newCart.cartId);
if (props.onCartCreated) {
props.onCartCreated(newCart);
}
}


async function fetchBundles(): ReturnType<ProductBundlesState["fetchBundles"]>{
if (!props.graphqlClient || !props.productId) return;
setIsLoading(true);
try {
const bundleService = new BundleService(props.graphqlClient);
const productBundlesQueryVariables: BundleQueryVariables = {
  input: {
    productIds: [props.productId],
    taxZone: props.taxZone || 'NL',
    page: 1,
    offset: 20
  },
  language: props.language || 'NL',
  imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
  imageVariantFilters: props.configuration?.imageVariantFiltersMedium
};
const result = await bundleService.getBundles(productBundlesQueryVariables);
setBundles(result?.items || []);
} catch (e) {
setBundles([]);
} finally {
setIsLoading(false);
}
}


async function handleAddToCart(bundle: Bundle): ReturnType<ProductBundlesState["handleAddToCart"]>{
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

  // Internal CartService fallback — resolve cart ID
  let cartId = props.cartId || activeCartId;
  if (!cartId) {
    if (props.createCart) {
      await initCart();
      cartId = activeCartId;
    }
    if (!cartId) {
      showToast(getLabel('noCartId', 'No cart ID provided'), 'error');
      return;
    }
  }
  const cartService = new CartService(props.graphqlClient);
  const cartAddBundleVariables: CartAddBundleVariables = {
    id: cartId,
    input: {
      bundleId: bundle.id,
      quantity: 1
    },
    language: props.language || 'NL',
    imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
    imageVariantFilters: props.configuration?.imageVariantFiltersSmall
  };
  const cart = await cartService.addBundleToCart(cartAddBundleVariables);
  if (props.afterBundleAddToCart) {
    props.afterBundleAddToCart(cart, bundle);
  }
}
if (props.showModal) {
  setLastAddedBundle(bundle);
  setModalVisible(true);
} else {
  const bundleName = (bundle as any).name || getLabel('title', 'Bundle');
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
fetchBundles()
    }, [])
useEffect(() => {
      fetchBundles()
    },
    [props.productId])


return (
  <>

  {isMounted && !isLoading && bundles.length > 0 ? (
  <><div  className={props.className || 'mb-12'}>{bundles?.map((bundle, bundleIdx) => (
  <div className="border rounded-lg overflow-hidden mb-6"  key={bundle.id || bundleIdx}><div className="flex items-center justify-between p-4 bg-gray-50 border-b"><div className="flex items-center gap-3"><h3 className="text-lg font-bold">{bundle.name || getLabel('title', 'Combo deal')}</h3>{!getHidePrices() && hasDiscount(bundle) ? (
  <span className="bg-red-100 text-red-700 text-sm font-semibold px-2 py-0.5 rounded">
                                        -{getDiscountPercentage(bundle)}%
                                    </span>
) : null}</div>{bundle.condition ? (
  <span className="text-xs text-gray-500">{bundle.condition === 'ALL' ? (
  <>{getLabel('condition_ALL', 'Discount on all items')}</>
) : <>{getLabel('condition_EP', 'Discount on extra items')}</>}</span>
) : null}</div>{getShowItems() && getLayout() !== 'compact' && bundle.items && bundle.items.length > 0 ? (
  <div className="p-4">{bundle.items?.map((item, idx) => (
  <div className="flex items-center gap-3 mb-3"  key={item.productId + '-' + idx}><div className="w-16 h-16 bg-gray-50 rounded overflow-hidden flex-shrink-0">{getProductImage(item.product) ? (
  <img className="w-full h-full object-contain p-1"  src={getProductImage(item.product)}  alt={getProductName(item.product)}  />
) : null}</div><div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{getProductName(item.product) || 'Product ' + item.productId}</div>{item.product?.sku ? (
  <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
) : null}{!getHidePrices() && item.price ? (
  <div className="text-sm text-gray-700 mt-0.5">{formatPrice(getItemPrice(item))}</div>
) : null}{item.isLeader === 'Y' ? (
  <span className="text-xs text-blue-600 font-medium">{getLabel('leaderItem', 'Main product')}</span>
) : null}</div></div>
))}</div>
) : null}{!getHidePrices() ? (
  <div className="flex items-center justify-between p-4 border-t bg-white"><div className="flex items-center gap-4">{hasDiscount(bundle) ? (
  <span className="text-gray-400 line-through text-sm">{formatPrice(getOriginalPrice(bundle))}</span>
) : null}<span className="text-xl font-bold text-blue-600">{formatPrice(getBundlePrice(bundle))}</span>{hasDiscount(bundle) ? (
  <span className="text-sm text-green-600 font-medium">{getLabel('youSave', 'You save')}{formatPrice(getOriginalPrice(bundle) - getBundlePrice(bundle))}</span>
) : null}</div><button className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"  onClick={(event) => handleAddToCart(bundle) }  disabled={addingBundleId === bundle.id}>{addingBundleId === bundle.id ? (
  <>{getLabel('adding', 'Adding...')}</>
) : <>{getLabel('addToCart', 'Add bundle to cart')}</>}</button></div>
) : null}{getHidePrices() ? (
  <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">{getLabel('loginToSeePrices', 'Log in to see prices and add to cart')}</div>
) : null}</div>
))}{toastVisible ? (
  <div  className={`fixed top-4 right-4 z-50 flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 ${toastType === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}><div  className={`flex-shrink-0 w-5 h-5 mt-0.5 ${toastType === 'success' ? 'text-green-500' : 'text-red-500'}`}>{toastType === 'success' ? (
  <svg  fill="none"  viewBox="0 0 24 24"  stroke="currentColor"  strokeWidth={2}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M5 13l4 4L19 7"  /></svg>
) : null}{toastType === 'error' ? (
  <svg  fill="none"  viewBox="0 0 24 24"  stroke="currentColor"  strokeWidth={2}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"  /></svg>
) : null}</div><p  className={`flex-1 text-sm font-medium ${toastType === 'success' ? 'text-green-800' : 'text-red-800'}`}>{toastMessage}</p><button  type="button"  onClick={(event) => dismissToast() }  className={`flex-shrink-0 rounded focus:outline-none ${toastType === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}><svg  fill="none"  viewBox="0 0 24 24"  stroke="currentColor" className="h-4 w-4"  strokeWidth={2}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M6 18L18 6M6 6l12 12"  /></svg></button></div>
) : null}{modalVisible ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4"><div className="fixed inset-0 bg-gray-500/20"  onClick={(event) => closeModal() }  /><div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden"><div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100"><svg  fill="none"  viewBox="0 0 24 24"  stroke="currentColor" className="h-5 w-5 flex-shrink-0 text-green-500"  strokeWidth={2}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M5 13l4 4L19 7"  /></svg><h3 className="flex-1 text-base font-semibold text-gray-900">{getLabel('modalTitle', 'Bundle added to cart')}</h3><button  type="button" className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"  onClick={(event) => closeModal() }><svg  fill="none"  viewBox="0 0 24 24"  stroke="currentColor" className="h-5 w-5"  strokeWidth={2}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M6 18L18 6M6 6l12 12"  /></svg></button></div><div className="px-6 py-5 flex items-start gap-4"><div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{(lastAddedBundle as any)?.name || getLabel('title', 'Bundle')}</p>{!getHidePrices() && lastAddedBundle ? (
  <p className="text-sm font-semibold text-blue-600 mt-1">{formatPrice(getBundlePrice(lastAddedBundle))}</p>
) : null}</div></div><div className="flex gap-3 px-6 py-4 border-t border-gray-100"><button  type="button" className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"  onClick={(event) => closeModal() }>{getLabel('continueShopping', 'Continue shopping')}</button><button  type="button" className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"  onClick={(event) => {
closeModal();
if (props.onProceedToCheckout) props.onProceedToCheckout();
} }>{getLabel('proceedToCheckout', 'Proceed to checkout')}</button></div></div></div>
) : null}</div></>
) : null}

  </>
);
}




  export default ProductBundles;


