'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient, CartService, CrossupsellService, CartMainItem, CartBaseItem, Cart, ProductInventory, CrossupsellSearchInput, Crossupsell, Product, Cluster } from 'propeller-sdk-v2';



  export interface CartItemProps {
/** GraphQL client for the Propeller SDK */
graphqlClient: GraphQLClient;

/** The shopping cart unique identifier */
cartId: string;

/** A shopping cart item */
cartItem: CartMainItem;

/** Should the item title be a link to the PDP. Defaults to true. */
titleLinkable?: boolean;

/** Should the stock be displayed in the cart item. Defaults to false. */
showStockComponent?: boolean;

/** Display the SKU of the cart item beneath the item name. Defaults to true. */
showSku?: boolean;

/** +/- buttons on left and right of quantity input. Defaults to true. */
enableIncrementDecrement?: boolean;

/** Should the cart item notes field be displayed. Defaults to false. */
showCartItemNotesField?: boolean;

/** Action callback when a cart item quantity is changed */
onQuantityChange?: (item: CartMainItem, quantity: number) => void;

/** Action callback when a cart item note is changed */
onNoteChange?: (item: CartMainItem, note: string) => void;

/** Action callback when a cart item is deleted */
onDelete?: (item: CartMainItem) => void;

/** Callback with the updated cart after any cart mutation */
afterCartUpdate?: (cart: Cart) => void;

/** Label overrides for UI strings
 *
 * Available keys: remove, notes, notesPlaceholder, includedOptions, updating, deleting
 */
labels?: Record<string, string>;

/** Language code for CartService operations. Defaults to 'NL'. */
language?: string;

/** Configuration object for image filters and URL generation */
configuration?: any;

/** Show cross-sell/upsell product suggestions below the item. Defaults to false. */
showCrossupsells?: boolean;

/** Which cross-sell types to fetch. Defaults to ['ACCESSORIES']. Values: 'ACCESSORIES', 'ALTERNATIVES', 'OPTIONS', 'PARTS', 'RELATED' */
crossupsellTypes?: string[];

/** Maximum number of cross-sell products to display. Defaults to 3. */
crossupsellLimit?: number;

/** Callback when a cross-sell product is clicked */
onCrossupsellClick?: (product: Product | Cluster) => void;

/** Additional CSS class for the root element */
className?: string;

/** Include tax in price. Defaults to false. */
includeTax?: boolean;
}
interface CartItemState {
quantity: number;
notes: string;
loading: boolean;
deleting: boolean;
notesTimeout: any;
crossupsells: Crossupsell[];
crossupsellsLoading: boolean;
getLabel: (key: string, fallback: string) => string;
getProductName: () => string;
getProductUrl: () => string;
getProductImageUrl: () => string;
getProductSku: () => string;
getInventory: () => ProductInventory | null;
getFormattedPrice: () => string;
handleQuantityChange: (newQuantity: number) => void;
handleNoteChange: (note: string) => void;
handleDelete: () => void;
fetchCrossupsells: () => void;
getCrossupsellName: (item: Crossupsell) => string;
getCrossupsellImageUrl: (item: Crossupsell) => string;
getCrossupsellUrl: (item: Crossupsell) => string;
getVisibleCrossupsells: () => Crossupsell[];
}




  function CartItem(props:CartItemProps) {

  const [quantity, setQuantity] = useState<CartItemState["quantity"]>(() => (1))


const [notes, setNotes] = useState<CartItemState["notes"]>(() => (''))


const [loading, setLoading] = useState<CartItemState["loading"]>(() => (false))


const [deleting, setDeleting] = useState<CartItemState["deleting"]>(() => (false))


const [notesTimeout, setNotesTimeout] = useState<CartItemState["notesTimeout"]>(() => (null as unknown))


const [crossupsells, setCrossupsells] = useState<CartItemState["crossupsells"]>(() => ([]))


const [crossupsellsLoading, setCrossupsellsLoading] = useState<CartItemState["crossupsellsLoading"]>(() => (false))


function getLabel(key: string, fallback: string): ReturnType<CartItemState["getLabel"]>{
return (props.labels as Record<string, string>)?.[key] || fallback;
}


function getProductName(): ReturnType<CartItemState["getProductName"]>{
return props.cartItem.product?.names?.[0]?.value || 'Product';
}


function getProductUrl(): ReturnType<CartItemState["getProductUrl"]>{
if (props.configuration && props.configuration.urls) {
return props.configuration.urls.getProductUrl(props.cartItem.product);
}
return '#';
}


function getProductImageUrl(): ReturnType<CartItemState["getProductImageUrl"]>{
return props.cartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}


function getProductSku(): ReturnType<CartItemState["getProductSku"]>{
return props.cartItem.product?.sku || '';
}


function getInventory(): ReturnType<CartItemState["getInventory"]>{
const inv = props.cartItem.product?.inventory;
return inv || null;
}


function getFormattedPrice(): ReturnType<CartItemState["getFormattedPrice"]>{
const item = props.cartItem;
const price = props.includeTax ? item?.totalSumNet || 0 : item?.totalSum || 0;
return `\u20AC${Number(price).toFixed(2)}`;
}


function handleQuantityChange(newQuantity: number): ReturnType<CartItemState["handleQuantityChange"]>{
if (newQuantity < 1 || loading) return;
setQuantity(newQuantity);
setLoading(true);
if (props.onQuantityChange) {
props.onQuantityChange(props.cartItem, newQuantity);
setLoading(false);
return;
}
const cartService = new CartService(props.graphqlClient);
cartService.updateCartItem({
id: props.cartId,
itemId: props.cartItem.itemId.toString(),
input: {
  quantity: newQuantity
},
language: props.language || 'NL',
imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
imageVariantFilters: props.configuration?.imageVariantFiltersSmall
}).then((updatedCart: Cart) => {
setLoading(false);
if (props.afterCartUpdate) {
  props.afterCartUpdate(updatedCart);
}
}).catch((error: Error) => {
console.error('Failed to update cart item quantity:', error);
setQuantity(props.cartItem.quantity);
setLoading(false);
});
}


function handleNoteChange(note: string): ReturnType<CartItemState["handleNoteChange"]>{
setNotes(note);
if (props.onNoteChange) {
props.onNoteChange(props.cartItem, note);
return;
}
if (notesTimeout) {
clearTimeout(notesTimeout);
}
setNotesTimeout(setTimeout(() => {
const cartService = new CartService(props.graphqlClient);
cartService.updateCartItem({
  id: props.cartId,
  itemId: props.cartItem.itemId,
  input: {
    notes: note
  },
  language: props.language || 'NL',
  imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
  imageVariantFilters: props.configuration?.imageVariantFiltersSmall
}).then((updatedCart: Cart) => {
  if (props.afterCartUpdate) {
    props.afterCartUpdate(updatedCart);
  }
}).catch((error: Error) => {
  console.error('Failed to update cart item notes:', error);
});
}, 500));
}


function handleDelete(): ReturnType<CartItemState["handleDelete"]>{
if (deleting) return;
setDeleting(true);
if (props.onDelete) {
props.onDelete(props.cartItem);
setDeleting(false);
return;
}
const cartService = new CartService(props.graphqlClient);
cartService.deleteCartItem({
id: props.cartId,
itemId: props.cartItem.itemId,
input: {
  itemId: props.cartItem.itemId
},
language: props.language || 'NL',
imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
imageVariantFilters: props.configuration?.imageVariantFiltersSmall
}).then((updatedCart: Cart) => {
setDeleting(false);
if (props.afterCartUpdate) {
  props.afterCartUpdate(updatedCart);
}
}).catch((error: Error) => {
console.error('Failed to delete cart item:', error);
setDeleting(false);
});
}


function fetchCrossupsells(): ReturnType<CartItemState["fetchCrossupsells"]>{
if (!props.showCrossupsells) return;
const productId = props.cartItem?.productId;
if (!productId) return;
setCrossupsellsLoading(true);
const crossupsellService = new CrossupsellService(props.graphqlClient);
const searchInput: CrossupsellSearchInput = {
types: (props.crossupsellTypes || ['ACCESSORIES']) as CrossupsellSearchInput['types'],
page: 1,
offset: 50,
...(productId && {
  productIdsFrom: [productId]
})
};
crossupsellService.getCrossupsells({
input: searchInput
}).then(response => {
setCrossupsells(response?.items || []);
setCrossupsellsLoading(false);
}).catch(() => {
setCrossupsells([]);
setCrossupsellsLoading(false);
});
}


function getVisibleCrossupsells(): ReturnType<CartItemState["getVisibleCrossupsells"]>{
const items = crossupsells || [];
const limit = props.crossupsellLimit || 3;
return items.slice(0, limit);
}


function getCrossupsellName(item: Crossupsell): ReturnType<CartItemState["getCrossupsellName"]>{
const product = item?.productTo || item?.clusterTo;
return product?.names?.[0]?.value || 'Product';
}


function getCrossupsellImageUrl(item: Crossupsell): ReturnType<CartItemState["getCrossupsellImageUrl"]>{
const product = (item?.productTo || item?.clusterTo) as Product | undefined;
return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}


function getCrossupsellUrl(item: Crossupsell): ReturnType<CartItemState["getCrossupsellUrl"]>{
const product = item?.productTo || item?.clusterTo;
if (props.configuration && props.configuration.urls && product) {
return props.configuration.urls.getProductUrl(product);
}
return '#';
}







useEffect(() => {
      setQuantity(props.cartItem.quantity || 1);
setNotes(props.cartItem.notes || '');
fetchCrossupsells()
    }, [])
useEffect(() => {
      setQuantity(props.cartItem.quantity || 1);
setNotes(props.cartItem.notes || '')
    },
    [props.cartItem])


return (


  <div  className={`flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${props.className || ''}`}><div className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded border border-gray-200 flex items-center justify-center overflow-hidden relative">{!!getProductImageUrl() ? (
  <img className="w-full h-full object-contain p-1"  src={getProductImageUrl()}  alt={getProductName()}  />
) : null}{!getProductImageUrl() ? (
  <svg  fill="none"  viewBox="0 0 24 24"  stroke="currentColor" className="w-8 h-8 text-gray-300"  strokeWidth={1.5}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"  /></svg>
) : null}</div><div className="flex-1 min-w-0">{props.titleLinkable !== false ? (
  <a className="font-semibold text-lg text-gray-900 hover:text-violet-600 transition-colors line-clamp-2"  href={getProductUrl()}>{getProductName()}</a>
) : null}{props.titleLinkable === false ? (
  <span className="font-semibold text-lg text-gray-900 line-clamp-2">{getProductName()}</span>
) : null}{props.showSku !== false && !!getProductSku() ? (
  <p className="text-sm text-gray-500 mt-0.5">{getProductSku()}</p>
) : null}{props.showStockComponent === true && !!getInventory() ? (
  <div className="mt-1"><div  data-cart-item-stock="true"  data-inventory={JSON.stringify(getInventory())}  /></div>
) : null}<p className="text-lg font-bold text-violet-600 mt-2">{getFormattedPrice()}</p>{!!props.cartItem.clusterId && !!props.cartItem.childItems && props.cartItem.childItems.length > 0 ? (
  <div className="mt-3 space-y-1.5 border-l-2 border-gray-200 pl-3"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{getLabel('includedOptions', 'Included Options:')}</p>{(props.cartItem.childItems || []).map((child, idx) => (
  <div className="flex flex-wrap gap-x-2 text-sm text-gray-700"  key={idx}><span className="font-medium">{child.product?.names?.[0]?.value || 'Option'}</span><span className="text-gray-400 hidden sm:inline">-</span><span className="text-gray-400 text-xs self-center">{child.product?.sku}</span><div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1"  /><span className="font-semibold text-violet-600">€{(child.totalSum || 0).toFixed(2)}</span></div>
))}</div>
) : null}{props.showCartItemNotesField === true ? (
  <div className="mt-3"><label className="text-xs font-medium text-gray-500 block mb-1">{getLabel('notes', 'Notes')}</label><textarea className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"  value={notes}  onChange={(e) => handleNoteChange(e.target.value) }  placeholder={getLabel('notesPlaceholder', 'Add a note for this item...')}  rows={2}  /></div>
) : null}{getVisibleCrossupsells().length > 0 ? (
  <div className="mt-3 pt-3 border-t border-gray-200"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{getLabel('crossupsellTitle', 'You might also like')}</p><div className="flex gap-3 overflow-x-auto">{getVisibleCrossupsells()?.map((item, idx) => (
  <a className="flex-shrink-0 flex items-center gap-2 p-2 rounded-md border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors max-w-[200px]"  key={idx}  href={getCrossupsellUrl(item)}  onClick={(e) => {
if (props.onCrossupsellClick) {
e.preventDefault();
props.onCrossupsellClick((item.productTo || item.clusterTo) as Product | Cluster);
}
} }>{!!getCrossupsellImageUrl(item) ? (
  <img className="w-10 h-10 object-contain rounded flex-shrink-0"  src={getCrossupsellImageUrl(item)}  alt={getCrossupsellName(item)}  />
) : null}<span className="text-xs font-medium text-gray-700 line-clamp-2">{getCrossupsellName(item)}</span></a>
))}</div></div>
) : null}</div><div className="flex flex-col items-end gap-2 flex-shrink-0">{props.enableIncrementDecrement !== false ? (
  <div className="flex items-center border border-gray-300 rounded-md bg-white h-10"><button  type="button" className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-md select-none"  onClick={(event) => handleQuantityChange(quantity - 1) }  disabled={quantity <= 1 || loading}>
                        -
                    </button><input  type="number" className="w-12 text-center text-sm bg-transparent border-x border-gray-300 h-full focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"  min={1}  value={quantity}  onChange={(e) => {
const val = parseInt(e.target.value, 10);
if (val >= 1) handleQuantityChange(val);
} }  /><button  type="button" className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-md select-none"  onClick={(event) => handleQuantityChange(quantity + 1) }  disabled={loading}>
                        +
                    </button></div>
) : null}{props.enableIncrementDecrement === false ? (
  <input  type="number" className="w-16 h-10 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"  min={1}  value={quantity}  onChange={(e) => {
const val = parseInt(e.target.value, 10);
if (val >= 1) handleQuantityChange(val);
} }  />
) : null}{loading ? (
  <span className="text-xs text-gray-400">{getLabel('updating', 'Updating...')}</span>
) : null}<button  type="button" className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors disabled:opacity-50"  onClick={(event) => handleDelete() }  disabled={deleting}>{deleting ? (
  <>{getLabel('deleting', 'Removing...')}</>
) : null}{!deleting ? (
  <>{getLabel('remove', 'Remove')}</>
) : null}</button></div></div>


);
}




  export default CartItem;


