'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  GraphQLClient,
  CartService,
  CrossupsellService,
  CartMainItem,
  CartBaseItem,
  BundleItem,
  Cart,
  ProductInventory,
  CrossupsellSearchInput,
  Crossupsell,
  Product,
  Cluster,
  Enums,
  CrossupsellsQueryVariables,
  Contact,
  Customer,
} from 'propeller-sdk-v2';

export interface CartItemProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The shopping cart unique identifier */
  cartId: string;

  /** Tax zone for price calculations */
  taxZone?: string;

  /** Authenticated user for cart operations */
  user?: Contact | Customer | null;

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
  isBundleItem: () => boolean;
  getBundleName: () => string;
  getBundlePrice: () => string;
  getBundleLeaderName: () => string;
  getBundleLeaderPrice: () => string;
  getBundleNonLeaders: () => BundleItem[];
  getBundleItemName: (bundleItem: BundleItem) => string;
  getBundleItemPrice: (bundleItem: BundleItem) => string;
  handleQuantityChange: (newQuantity: number) => void;
  handleNoteChange: (note: string) => void;
  handleDelete: () => void;
  fetchCrossupsells: () => void;
  getCrossupsellName: (item: Crossupsell) => string;
  getCrossupsellImageUrl: (item: Crossupsell) => string;
  getCrossupsellUrl: (item: Crossupsell) => string;
  getVisibleCrossupsells: () => Crossupsell[];
}

function CartItem(props: CartItemProps) {
  const [quantity, setQuantity] = useState<CartItemState['quantity']>(() => 1);
  const [notes, setNotes] = useState<CartItemState['notes']>(() => '');
  const [loading, setLoading] = useState<CartItemState['loading']>(() => false);
  const [deleting, setDeleting] = useState<CartItemState['deleting']>(() => false);
  const [notesTimeout, setNotesTimeout] = useState<CartItemState['notesTimeout']>(
    () => null as unknown
  );
  const [crossupsells, setCrossupsells] = useState<CartItemState['crossupsells']>(() => []);
  const [crossupsellsLoading, setCrossupsellsLoading] = useState<
    CartItemState['crossupsellsLoading']
  >(() => false);
  function getLabel(key: string, fallback: string): ReturnType<CartItemState['getLabel']> {
    return props.labels?.[key] || fallback;
  }

  function getProductName(): ReturnType<CartItemState['getProductName']> {
    return props.cartItem.product?.names?.[0]?.value || 'Product';
  }

  function getProductUrl(): ReturnType<CartItemState['getProductUrl']> {
    if (props.configuration && props.configuration.urls) {
      return props.configuration.urls.getProductUrl(props.cartItem.product, props.language);
    }
    return '#';
  }

  function getProductImageUrl(): ReturnType<CartItemState['getProductImageUrl']> {
    return props.cartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }

  function getProductSku(): ReturnType<CartItemState['getProductSku']> {
    return props.cartItem.product?.sku || '';
  }

  function getInventory(): ReturnType<CartItemState['getInventory']> {
    const inv = props.cartItem.product?.inventory;
    return inv || null;
  }

  function getFormattedPrice(): ReturnType<CartItemState['getFormattedPrice']> {
    const item = props.cartItem;
    const price = props.includeTax ? item?.totalSumNet || 0 : item?.totalSum || 0;
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function isBundleItem(): ReturnType<CartItemState['isBundleItem']> {
    return !!props.cartItem.bundle;
  }

  function getBundleName(): ReturnType<CartItemState['getBundleName']> {
    return props.cartItem.bundle?.name || 'Bundle';
  }

  function getBundlePrice(): ReturnType<CartItemState['getBundlePrice']> {
    const price = props.cartItem.bundle?.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function getBundleLeaderName(): ReturnType<CartItemState['getBundleLeaderName']> {
    const items = props.cartItem.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
    if (!leader) return '';
    return leader.product.names?.[0]?.value || 'Product';
  }

  function getBundleLeaderPrice(): ReturnType<CartItemState['getBundleLeaderPrice']> {
    const items = props.cartItem.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
    if (!leader) return '';
    const price = leader.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function getBundleNonLeaders(): ReturnType<CartItemState['getBundleNonLeaders']> {
    const items = props.cartItem.bundle?.items;
    if (!items) return [];
    return items.filter((bi: BundleItem) => bi.isLeader !== Enums.YesNo.Y);
  }

  function getBundleItemName(
    bundleItem: BundleItem
  ): ReturnType<CartItemState['getBundleItemName']> {
    return bundleItem.product.names?.[0]?.value || 'Product';
  }

  function getBundleItemPrice(
    bundleItem: BundleItem
  ): ReturnType<CartItemState['getBundleItemPrice']> {
    const price = bundleItem.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function handleQuantityChange(
    newQuantity: number
  ): ReturnType<CartItemState['handleQuantityChange']> {
    if (newQuantity < 1 || loading) return;
    setQuantity(newQuantity);
    setLoading(true);
    if (props.onQuantityChange) {
      props.onQuantityChange(props.cartItem, newQuantity);
      setLoading(false);
      return;
    }
    const cartService = new CartService(props.graphqlClient);
    cartService
      .updateCartItem({
        id: props.cartId,
        itemId: props.cartItem.itemId.toString(),
        input: {
          quantity: newQuantity,
        },
        language: props.language || 'NL',
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
      })
      .then((updatedCart: Cart) => {
        setLoading(false);
        if (props.afterCartUpdate) {
          props.afterCartUpdate(updatedCart);
        }
      })
      .catch((error: Error) => {
        console.error('Failed to update cart item quantity:', error);
        setQuantity(props.cartItem.quantity);
        setLoading(false);
      });
  }

  function handleNoteChange(note: string): ReturnType<CartItemState['handleNoteChange']> {
    setNotes(note);
    if (props.onNoteChange) {
      props.onNoteChange(props.cartItem, note);
      return;
    }
    if (notesTimeout) {
      clearTimeout(notesTimeout);
    }
    setNotesTimeout(
      setTimeout(() => {
        const cartService = new CartService(props.graphqlClient);
        cartService
          .updateCartItem({
            id: props.cartId,
            itemId: props.cartItem.itemId,
            input: {
              notes: note,
            },
            language: props.language || 'NL',
            imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
            imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
          })
          .then((updatedCart: Cart) => {
            if (props.afterCartUpdate) {
              props.afterCartUpdate(updatedCart);
            }
          })
          .catch((error: Error) => {
            console.error('Failed to update cart item notes:', error);
          });
      }, 500)
    );
  }

  function handleDelete(): ReturnType<CartItemState['handleDelete']> {
    if (deleting) return;
    setDeleting(true);
    if (props.onDelete) {
      props.onDelete(props.cartItem);
      setDeleting(false);
      return;
    }
    const cartService = new CartService(props.graphqlClient);
    cartService
      .deleteCartItem({
        id: props.cartId,
        itemId: props.cartItem.itemId,
        input: {
          itemId: props.cartItem.itemId,
        },
        language: props.language || 'NL',
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
      })
      .then((updatedCart: Cart) => {
        setDeleting(false);
        if (props.afterCartUpdate) {
          props.afterCartUpdate(updatedCart);
        }
      })
      .catch((error: Error) => {
        console.error('Failed to delete cart item:', error);
        setDeleting(false);
      });
  }

  function fetchCrossupsells(): ReturnType<CartItemState['fetchCrossupsells']> {
    if (!props.showCrossupsells) return;
    const productId = props.cartItem?.productId;
    const clusterId = props.cartItem?.clusterId;
    if (!productId && !clusterId) return;
    setCrossupsellsLoading(true);
    const crossupsellService = new CrossupsellService(props.graphqlClient);
    const searchInput: CrossupsellsQueryVariables = {
      input: {
        types: (props.crossupsellTypes || [
          Enums.CrossupsellType.ACCESSORIES,
        ]) as CrossupsellSearchInput['types'],
        page: 1,
        offset: 50,
        ...(productId &&
          !clusterId && {
            productIdsFrom: [productId],
          }),
        ...(clusterId && {
          clusterIdsFrom: [clusterId],
        }),
      },
      language: props.language || 'NL',
      imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration?.imageVariantFiltersMedium,
      priceCalculateProductInput: {
        taxZone: props.taxZone || 'NL',
        ...(props.user &&
          'company' in props.user && {
            companyId: (props.user as Contact)?.company?.companyId,
          }),
        ...(props.user &&
          'contactId' in props.user && {
            contactId: (props.user as Contact)?.contactId,
          }),
        ...(props.user &&
          'customerId' in props.user && {
            customerId: (props.user as Customer)?.customerId,
          }),
      },
    };
    crossupsellService
      .getCrossupsells(searchInput)
      .then((response) => {
        setCrossupsells(response?.items || []);
        setCrossupsellsLoading(false);
      })
      .catch(() => {
        setCrossupsells([]);
        setCrossupsellsLoading(false);
      });
  }

  function getVisibleCrossupsells(): ReturnType<CartItemState['getVisibleCrossupsells']> {
    const items = crossupsells || [];
    const limit = props.crossupsellLimit || 3;
    return items.slice(0, limit);
  }

  function getCrossupsellName(item: Crossupsell): ReturnType<CartItemState['getCrossupsellName']> {
    const product = item?.productTo || item?.clusterTo;
    return product?.names?.[0]?.value || 'Product';
  }

  function getCrossupsellImageUrl(
    item: Crossupsell
  ): ReturnType<CartItemState['getCrossupsellImageUrl']> {
    const product = (item?.productTo || item?.clusterTo) as Product | undefined;
    return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }

  function getCrossupsellUrl(item: Crossupsell): ReturnType<CartItemState['getCrossupsellUrl']> {
    const product = item?.productTo || item?.clusterTo;
    if (props.configuration && props.configuration.urls && product) {
      return props.configuration.urls.getProductUrl(product, props.language);
    }
    return '#';
  }

  useEffect(() => {
    setQuantity(props.cartItem.quantity || 1);
    setNotes(props.cartItem.notes || '');
    fetchCrossupsells();
  }, []);
  useEffect(() => {
    setQuantity(props.cartItem.quantity || 1);
    setNotes(props.cartItem.notes || '');
  }, [props.cartItem]);

  return (
    <div
      className={`flex flex-wrap md:flex-nowrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${props.className || ''}`}
    >
      <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden relative">
        {!!getProductImageUrl() ? (
          <img
            className="w-full h-full object-contain p-1"
            src={getProductImageUrl()}
            alt={getProductName()}
          />
        ) : null}
        {!getProductImageUrl() ? (
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
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        {!isBundleItem() && props.showSku !== false && !!getProductSku() ? (
          <p className="font-mono text-xs text-gray-400">{getProductSku()}</p>
        ) : null}
        {isBundleItem() ? (
          <span className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2">
            {getBundleName()}
          </span>
        ) : null}
        {!isBundleItem() ? (
          <>
            {props.titleLinkable !== false ? (
              <a
                className="font-semibold text-sm md:text-base text-gray-900 hover:text-foreground transition-colors line-clamp-2"
                href={getProductUrl()}
              >
                {getProductName()}
              </a>
            ) : null}
            {props.titleLinkable === false ? (
              <span className="font-semibold text-sm md:text-base text-gray-900 line-clamp-2">
                {getProductName()}
              </span>
            ) : null}
          </>
        ) : null}
        {props.showStockComponent === true && !!getInventory() ? (
          <div className="mt-1">
            <div data-cart-item-stock="true" data-inventory={JSON.stringify(getInventory())} />
          </div>
        ) : null}
        {isBundleItem() ? (
          <div className="mt-3 space-y-1.5 border-l-2 border-border pl-3">
            {!!getBundleLeaderName() ? (
              <div className="flex flex-wrap gap-x-2 text-sm text-gray-700">
                <span className="font-semibold text-foreground">{getBundleLeaderName()}</span>
                {!!getBundleLeaderPrice() ? (
                  <>
                    <div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1" />
                    <span className="font-semibold text-foreground">{getBundleLeaderPrice()}</span>
                  </>
                ) : null}
              </div>
            ) : null}
            {getBundleNonLeaders()?.map((bundleItem, idx) => (
              <div className="flex flex-wrap gap-x-2 text-sm text-gray-700" key={idx}>
                <span className="font-medium">{getBundleItemName(bundleItem)}</span>
                {!!getBundleItemPrice(bundleItem) ? (
                  <>
                    <div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1" />
                    <span className="font-semibold text-foreground">
                      {getBundleItemPrice(bundleItem)}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {!!props.cartItem.clusterId &&
        !!props.cartItem.childItems &&
        props.cartItem.childItems.length > 0 ? (
          <div className="mt-3 space-y-1.5 border-l-2 border-gray-200 pl-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {getLabel('includedOptions', 'Included Options:')}
            </p>
            {(props.cartItem.childItems || []).map((child, idx) => (
              <div className="flex flex-wrap gap-x-2 text-sm text-gray-700" key={idx}>
                <span className="font-medium">{child.product.names?.[0]?.value || 'Option'}</span>
                <span className="text-gray-400 hidden sm:inline">-</span>
                <span className="text-gray-400 text-xs self-center">{child.product.sku}</span>
                <div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1" />
                <span className="font-semibold text-foreground">€{child.totalSum.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {props.showCartItemNotesField === true ? (
          <div className="mt-3">
            <label className="text-xs font-medium text-gray-500 block mb-1">
              {getLabel('notes', 'Notes')}
            </label>
            <textarea
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
              value={notes}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={getLabel('notesPlaceholder', 'Add a note for this item...')}
              rows={2}
            />
          </div>
        ) : null}
        {getVisibleCrossupsells().length > 0 ? (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {getLabel('crossupsellTitle', 'You might also like')}
            </p>
            <div className="flex gap-3 overflow-x-auto">
              {getVisibleCrossupsells()?.map((item, idx) => (
                <a
                  className="flex-shrink-0 flex items-center gap-2 p-2 rounded-md border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors max-w-[200px]"
                  key={idx}
                  href={getCrossupsellUrl(item)}
                  onClick={(e) => {
                    if (props.onCrossupsellClick) {
                      e.preventDefault();
                      props.onCrossupsellClick(
                        (item.productTo || item.clusterTo) as Product | Cluster
                      );
                    }
                  }}
                >
                  {!!getCrossupsellImageUrl(item) ? (
                    <img
                      className="w-10 h-10 object-contain rounded flex-shrink-0"
                      src={getCrossupsellImageUrl(item)}
                      alt={getCrossupsellName(item)}
                    />
                  ) : null}
                  <span className="text-xs font-medium text-gray-700 line-clamp-2">
                    {getCrossupsellName(item)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="w-full md:w-auto flex items-center gap-3 md:gap-4 border-t md:border-t-0 border-gray-100 pt-2 md:pt-0 flex-shrink-0">
        {isBundleItem() && !!getBundlePrice() ? (
          <p className="text-sm md:text-base font-bold text-foreground whitespace-nowrap">
            {getBundlePrice()}
          </p>
        ) : null}
        {!isBundleItem() ? (
          <p className="text-sm md:text-base font-bold text-foreground whitespace-nowrap">
            {getFormattedPrice()}
          </p>
        ) : null}
        {props.enableIncrementDecrement !== false ? (
          <div className="flex items-center border border-gray-300 rounded-md bg-white h-9">
            <button
              type="button"
              className="px-2.5 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-md select-none"
              onClick={(event) => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1 || loading}
            >
              -
            </button>
            <input
              type="number"
              className="w-10 text-center text-sm bg-transparent border-x border-gray-300 h-full focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={1}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1) handleQuantityChange(val);
              }}
            />
            <button
              type="button"
              className="px-2.5 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-md select-none"
              onClick={(event) => handleQuantityChange(quantity + 1)}
              disabled={loading}
            >
              +
            </button>
          </div>
        ) : null}
        {props.enableIncrementDecrement === false ? (
          <input
            type="number"
            className="w-14 h-9 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min={1}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val >= 1) handleQuantityChange(val);
            }}
          />
        ) : null}
        {loading ? (
          <span className="text-xs text-gray-400">{getLabel('updating', 'Updating...')}</span>
        ) : null}
        <button
          type="button"
          className="h-8 w-8 p-0 ml-auto inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          onClick={(event) => handleDelete()}
          disabled={deleting}
        >
          {deleting ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : null}
          {!deleting ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          ) : null}
        </button>
      </div>
    </div>
  );
}

export default CartItem;
