'use client';
/**
 * @rsc-blocked — Client-only component: interactive state (useState/useReducer).
 * Must be rendered inside (or below) a Client Component boundary; cannot be
 * imported directly into a React Server Component. The 'use client' header
 * above marks this boundary to Next.js.
 */
import * as React from 'react';

import { useState, useEffect } from 'react';
import { BundleItem, Cart, CartBaseItem, CartMainItem, Cluster, Contact, Crossupsell, Customer, GraphQLClient, MediaImageProductSearchInput, Product, ProductInventory, TransformationsInput, YesNo } from 'propeller-sdk-v2';
import { useCart } from '@/composables/react/useCart';
import { useInfraProps } from '@/composables/react/useInfraProps';
import { getLabel } from '@/composables/shared/utils/labelHelpers';

export interface CartItemProps {
  /** GraphQL client for the Propeller SDK. Resolved from PropellerProvider when omitted. */
  graphqlClient?: GraphQLClient;

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
  configuration?: {
    language?: string;
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersSmall?: TransformationsInput;
    imageVariantFiltersMedium?: TransformationsInput;
    urls?: { getProductUrl: (product: Product, language?: string) => string };
  };

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

  /** Active company ID — used to look up the user's PAC for this company */
  companyId?: number;
}

function CartItem(rawProps: CartItemProps) {
  // Explicit props win; otherwise infra is resolved from <PropellerProvider>.
  const props = useInfraProps(rawProps);
  // --- composable ---
  const { updateItemQuantity, updateItemNotes, deleteItem, getCrossupsells, addItem } = useCart({
    graphqlClient: props.graphqlClient!,
    user: props.user ?? null,
    cartId: props.cartId,
    configuration: props.configuration,
    companyId: props.companyId,
  });

  // --- local UI state ---
  // Lazy-initialize from props.cartItem; the previous code seeded to 1/''
  // and then setX in a mount effect, an unnecessary extra render.
  const [quantity, setQuantity] = useState<number>(() => props.cartItem.quantity || 1);
  const [notes, setNotes] = useState<string>(() => props.cartItem.notes || '');
  const [loading, setLoading] = useState<boolean>(() => false);
  const [deleting, setDeleting] = useState<boolean>(() => false);
  const [crossupsells, setCrossupsells] = useState<Crossupsell[]>(() => []);
  const [crossupsellsLoading, setCrossupsellsLoading] = useState<boolean>(() => false);
  const [addingCrossupsellId, setAddingCrossupsellId] = useState<number | null>(() => null);

  // --- display helpers ---
  
  function getProductName(): string {
    return props.cartItem.product?.names?.[0]?.value || 'Product';
  }
  function getProductUrl(): string {
    if (props.configuration?.urls && props.cartItem.product) {
      return props.configuration.urls.getProductUrl(props.cartItem.product as Product, props.language);
    }
    return '#';
  }
  function getProductImageUrl(): string {
    return props.cartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }
  function getProductSku(): string {
    return props.cartItem.product?.sku || '';
  }
  function getInventory(): ProductInventory | null {
    const inv = props.cartItem.product?.inventory;
    return inv || null;
  }
  function getFormattedPrice(): string {
    const item = props.cartItem;
    const price = props.includeTax ? item?.totalSumNet || 0 : item?.totalSum || 0;
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  function isBundleItem(): boolean {
    return !!props.cartItem.bundle;
  }
  function getBundleName(): string {
    return props.cartItem.bundle?.name || 'Bundle';
  }
  function getBundlePrice(): string {
    const price = props.cartItem.bundle?.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  function getBundleLeaderName(): string {
    const items = props.cartItem.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === YesNo.Y);
    if (!leader) return '';
    return leader.product.names?.[0]?.value || 'Product';
  }
  function getBundleLeaderPrice(): string {
    const items = props.cartItem.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === YesNo.Y);
    if (!leader) return '';
    const price = leader.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  function getBundleNonLeaders(): BundleItem[] {
    const items = props.cartItem.bundle?.items;
    if (!items) return [];
    return items.filter((bi: BundleItem) => bi.isLeader !== YesNo.Y);
  }
  function getBundleItemName(bundleItem: BundleItem): string {
    return bundleItem.product.names?.[0]?.value || 'Product';
  }
  function getBundleItemPrice(bundleItem: BundleItem): string {
    const price = bundleItem.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  function getCrossupsellName(item: Crossupsell): string {
    const product = item?.productTo || item?.clusterTo;
    return product?.names?.[0]?.value || 'Product';
  }
  function getCrossupsellImageUrl(item: Crossupsell): string {
    const product = (item?.productTo || item?.clusterTo) as Product | undefined;
    return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }
  function getCrossupsellUrl(item: Crossupsell): string {
    const product = item?.productTo || item?.clusterTo;
    if (props.configuration?.urls && product) {
      return props.configuration.urls.getProductUrl(product as Product, props.language);
    }
    return '#';
  }
  function getVisibleCrossupsells(): Crossupsell[] {
    const items = crossupsells || [];
    const limit = props.crossupsellLimit || 3;
    return items.slice(0, limit);
  }

  // --- actions via composable ---
  async function handleQuantityChange(newQuantity: number): Promise<void> {
    if (newQuantity < 1 || loading) return;
    setQuantity(newQuantity);
    setLoading(true);
    if (props.onQuantityChange) {
      props.onQuantityChange(props.cartItem, newQuantity);
      setLoading(false);
      return;
    }
    try {
      const updatedCart = await updateItemQuantity(props.cartItem.itemId.toString(), newQuantity);
      if (updatedCart && props.afterCartUpdate) props.afterCartUpdate(updatedCart);
      setLoading(false);
    } catch (error: any) {
      console.error('Failed to update cart item quantity:', error);
      setQuantity(props.cartItem.quantity);
      setLoading(false);
    }
  }

  function handleNoteChange(note: string): void {
    setNotes(note);
    if (props.onNoteChange) {
      props.onNoteChange(props.cartItem, note);
      return;
    }
    updateItemNotes(props.cartItem.itemId, note, 500);
  }

  async function handleDelete(): Promise<void> {
    if (deleting) return;
    setDeleting(true);
    if (props.onDelete) {
      props.onDelete(props.cartItem);
      setDeleting(false);
      return;
    }
    try {
      const updatedCart = await deleteItem(props.cartItem.itemId);
      if (updatedCart && props.afterCartUpdate) props.afterCartUpdate(updatedCart);
      setDeleting(false);
    } catch (error: any) {
      console.error('Failed to delete cart item:', error);
      setDeleting(false);
    }
  }

  function fetchCrossupsells(): void {
    if (!props.showCrossupsells) return;
    setCrossupsellsLoading(true);
    getCrossupsells({
      productId: props.cartItem?.productId,
      clusterId: props.cartItem?.clusterId,
      types: props.crossupsellTypes,
      taxZone: props.taxZone,
      imageVariantFilters: props.configuration?.imageVariantFiltersMedium,
    }).then((items) => {
      setCrossupsells(items);
      setCrossupsellsLoading(false);
    }).catch(() => {
      setCrossupsells([]);
      setCrossupsellsLoading(false);
    });
  }

  function getCrossupsellProductId(item: Crossupsell): number | undefined {
    const product = (item?.productTo || item?.clusterTo) as Product | undefined;
    return (product as Product)?.productId || product?.id;
  }

  function getCrossupsellPrice(item: Crossupsell): string {
    const product = (item?.productTo || item?.clusterTo) as Product | undefined;
    const price = product?.price;
    if (!price) return '';
    const value = props.includeTax ? price.net : price.gross;
    if (value === undefined || value === null) return '';
    return `\u20AC${Number(value).toFixed(2)}`;
  }

  async function handleAddCrossupsellToCart(item: Crossupsell): Promise<void> {
    if (!props.cartId || addingCrossupsellId) return;
    const productId = getCrossupsellProductId(item);
    if (!productId) return;
    setAddingCrossupsellId(productId);
    const result = await addItem({ product: { productId } as Product, quantity: 1, cartId: props.cartId });
    setAddingCrossupsellId(null);
    if (result.success && result.cart && props.afterCartUpdate) {
      props.afterCartUpdate(result.cart);
    }
  }

  // Mount-only: fetch related crossupsells once we know the cart context.
  useEffect(() => {
    fetchCrossupsells();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync local quantity/notes when the cart item changes externally —
  // e.g. server-side reconciliation after an optimistic update, or a
  // different item being swapped into the same component instance via
  // parent re-render. Intentional external-state sync.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuantity(props.cartItem.quantity || 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotes(props.cartItem.notes || '');
  }, [props.cartItem]);
  return (
    <div
      className={`propeller-cart-item flex flex-wrap md:flex-nowrap items-center gap-4 bg-card p-4 rounded-container shadow-sm border border-border ${props.className || ''}`}
      data-bundle={isBundleItem() ? 'true' : 'false'}
      data-loading={loading ? 'true' : 'false'}
    >
      <div className="propeller-cart-item__media w-20 h-20 md:w-24 md:h-24 flex-shrink-0 bg-surface-hover flex items-center justify-center overflow-hidden relative">
        {!!getProductImageUrl() ? (
          <img
            className="propeller-cart-item__image w-full h-full object-contain p-1"
            src={getProductImageUrl()}
            alt={getProductName()}
          />
        ) : null}
        {!getProductImageUrl() ? (
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="propeller-cart-item__image-placeholder w-8 h-8 text-foreground-subtle"
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
      <div className="propeller-cart-item__body flex-1 min-w-0">
        {!isBundleItem() && props.showSku !== false && !!getProductSku() ? (
          <p className="propeller-cart-item__sku font-mono text-xs text-foreground-subtle">{getProductSku()}</p>
        ) : null}
        {isBundleItem() ? (
          <span className="propeller-cart-item__title font-semibold text-sm md:text-base text-foreground line-clamp-2">
            {getBundleName()}
          </span>
        ) : null}
        {!isBundleItem() ? (
          <>
            {props.titleLinkable !== false ? (
              <a
                className="propeller-cart-item__title font-semibold text-sm md:text-base text-foreground hover:text-primary transition-colors line-clamp-2"
                href={getProductUrl()}
              >
                {getProductName()}
              </a>
            ) : null}
            {props.titleLinkable === false ? (
              <span className="propeller-cart-item__title font-semibold text-sm md:text-base text-foreground line-clamp-2">
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
          <div className="propeller-cart-item__bundle mt-3 space-y-1.5 border-l-2 border-border pl-3">
            {!!getBundleLeaderName() ? (
              <div className="propeller-cart-item__bundle-leader flex flex-wrap gap-x-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{getBundleLeaderName()}</span>
                {!!getBundleLeaderPrice() ? (
                  <>
                    <div className="flex-1 border-b border-dotted border-border mx-1 mb-1" />
                    <span className="font-semibold text-foreground">{getBundleLeaderPrice()}</span>
                  </>
                ) : null}
              </div>
            ) : null}
            {getBundleNonLeaders()?.map((bundleItem, idx) => (
              <div className="propeller-cart-item__bundle-item flex flex-wrap gap-x-2 text-sm text-muted-foreground" key={idx}>
                <span className="font-medium">{getBundleItemName(bundleItem)}</span>
                {!!getBundleItemPrice(bundleItem) ? (
                  <>
                    <div className="flex-1 border-b border-dotted border-border mx-1 mb-1" />
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
          <div className="propeller-cart-item__options mt-3 space-y-1.5 border-l-2 border-border pl-3">
            <p className="propeller-cart-item__options-label text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {getLabel(props.labels, 'includedOptions', 'Included Options:')}
            </p>
            {(props.cartItem.childItems || []).map((child, idx) => (
              <div className="propeller-cart-item__option flex flex-wrap gap-x-2 text-sm text-muted-foreground" key={idx}>
                <span className="font-medium">{child.product.names?.[0]?.value || 'Option'}</span>
                <span className="text-foreground-subtle hidden sm:inline">-</span>
                <span className="text-foreground-subtle text-xs self-center">{child.product.sku}</span>
                <div className="flex-1 border-b border-dotted border-border mx-1 mb-1" />
                <span className="font-semibold text-foreground">€{child.totalSum.toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : null}
        {props.showCartItemNotesField === true ? (
          <div className="propeller-cart-item__notes mt-3">
            <label className="propeller-cart-item__notes-label text-xs font-medium text-muted-foreground block mb-1">
              {getLabel(props.labels, 'notes', 'Notes')}
            </label>
            <textarea
              className="propeller-cart-item__notes-input w-full text-sm border border-input rounded-control px-3 py-2 focus:ring-2 focus:ring-secondary focus:border-transparent resize-none"
              value={notes}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={getLabel(props.labels, 'notesPlaceholder', 'Add a note for this item...')}
              rows={2}
            />
          </div>
        ) : null}
        {getVisibleCrossupsells().length > 0 ? (
          <div className="propeller-cart-item__crossupsells mt-3 pt-3 border-t border-border">
            <p className="propeller-cart-item__crossupsells-label text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {getLabel(props.labels, 'crossupsellTitle', 'You might also like')}
            </p>
            <div className="flex flex-col gap-2">
              {getVisibleCrossupsells()?.map((item, idx) => (
                <div
                  className="propeller-cart-item__crossupsell flex items-center gap-2 p-2 rounded-control border border-border hover:border-primary/30 hover:bg-surface-hover transition-colors"
                  key={idx}
                >
                  <a
                    className="propeller-cart-item__crossupsell-link flex items-center gap-2 flex-1 min-w-0"
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
                        className="propeller-cart-item__crossupsell-image w-10 h-10 object-contain rounded flex-shrink-0"
                        src={getCrossupsellImageUrl(item)}
                        alt={getCrossupsellName(item)}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <span className="propeller-cart-item__crossupsell-title text-xs font-medium text-muted-foreground line-clamp-2">
                        {getCrossupsellName(item)}
                      </span>
                      {!!getCrossupsellPrice(item) ? (
                        <span className="propeller-cart-item__crossupsell-price text-xs font-bold text-foreground block">
                          {getCrossupsellPrice(item)}
                        </span>
                      ) : null}
                    </div>
                  </a>
                  <button
                    type="button"
                    className="propeller-cart-item__crossupsell-btn flex-shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-control bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
                    title={getLabel(props.labels, 'addToCart', 'Add to cart')}
                    disabled={addingCrossupsellId === getCrossupsellProductId(item)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCrossupsellToCart(item);
                    }}
                  >
                    {addingCrossupsellId === getCrossupsellProductId(item) ? (
                      <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {addingCrossupsellId !== getCrossupsellProductId(item) ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="8" cy="21" r="1" />
                        <circle cx="19" cy="21" r="1" />
                        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                      </svg>
                    ) : null}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="propeller-cart-item__footer w-full md:w-auto flex items-center gap-3 md:gap-4 border-t md:border-t-0 border-border-subtle pt-2 md:pt-0 flex-shrink-0">
        {isBundleItem() && !!getBundlePrice() ? (
          <p className="propeller-cart-item__price text-sm md:text-base font-bold text-foreground whitespace-nowrap">
            {getBundlePrice()}
          </p>
        ) : null}
        {!isBundleItem() ? (
          <p className="propeller-cart-item__price text-sm md:text-base font-bold text-foreground whitespace-nowrap">
            {getFormattedPrice()}
          </p>
        ) : null}
        {props.enableIncrementDecrement !== false ? (
          <div className="propeller-cart-item__stepper flex items-center border border-input rounded-control bg-card h-9">
            <button
              type="button"
              className="propeller-cart-item__decrement px-2.5 h-full text-muted-foreground hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-control select-none"
              onClick={(event) => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1 || loading}
            >
              -
            </button>
            <input
              type="number"
              className="propeller-cart-item__quantity w-10 text-center text-sm bg-transparent border-x border-input h-full focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min={1}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1) handleQuantityChange(val);
              }}
            />
            <button
              type="button"
              className="propeller-cart-item__increment px-2.5 h-full text-muted-foreground hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-control select-none"
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
            className="propeller-cart-item__quantity w-14 h-9 text-center text-sm border border-input rounded-control focus:ring-2 focus:ring-primary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min={1}
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val >= 1) handleQuantityChange(val);
            }}
          />
        ) : null}
        {loading ? (
          <span className="propeller-cart-item__updating text-xs text-foreground-subtle">{getLabel(props.labels, 'updating', 'Updating...')}</span>
        ) : null}
        <button
          type="button"
          className="propeller-cart-item__delete h-8 w-8 p-0 ml-auto inline-flex items-center justify-center rounded-control text-foreground-subtle hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          onClick={(event) => handleDelete()}
          disabled={deleting}
        >
          {deleting ? (
            <div className="w-4 h-4 border-2 border-foreground-subtle border-t-transparent rounded-full animate-spin" />
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
