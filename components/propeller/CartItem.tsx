'use client';
import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { GraphQLClient, CartService, CrossupsellService, CartMainItem, CartBaseItem, Cart, ProductInventory } from 'propeller-sdk-v2';
import Link from 'next/link';
import Image from 'next/image';
import ItemStock from '@/components/propeller/ItemStock';

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
  /** Label overrides for UI strings */
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
  onCrossupsellClick?: (product: any) => void;
  /** Additional CSS class for the root element */
  className?: string;
}

function CartItem(props: CartItemProps) {
  const [_quantity, set_quantity] = useState<number>(() => (props.cartItem as any)?.quantity || 1);
  const [_notes, set_notes] = useState<string>(() => (props.cartItem as any)?.notes || '');
  const [_loading, set_loading] = useState<boolean>(false);
  const [_deleting, set_deleting] = useState<boolean>(false);
  const [_includeTax, set_includeTax] = useState<boolean>(true);
  const [_crossupsells, set_crossupsells] = useState<any[]>([]);
  const [_crossupsellsLoading, set_crossupsellsLoading] = useState<boolean>(false);
  const notesTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function getLabel(key: string, fallback: string): string {
    return (props.labels as any)?.[key] || fallback;
  }

  function getProductName(): string {
    return (props.cartItem as any)?.product?.names?.[0]?.value || 'Product';
  }

  function getProductUrl(): string {
    if (props.configuration && props.configuration.urls) {
      return props.configuration.urls.getProductUrl((props.cartItem as any)?.product);
    }
    return '#';
  }

  function getProductImageUrl(): string {
    return (props.cartItem as any)?.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }

  function getProductSku(): string {
    return (props.cartItem as any)?.product?.sku || '';
  }

  function getInventory(): ProductInventory | null {
    const inv = (props.cartItem as any)?.product?.inventory;
    return inv || null;
  }

  function getFormattedPrice(): string {
    const item = props.cartItem as any;
    const price = _includeTax ? (item?.totalSumNet || 0) : (item?.totalSum || 0);
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function getVisibleCrossupsells(): any[] {
    const items = _crossupsells || [];
    const limit = props.crossupsellLimit || 3;
    return items.slice(0, limit);
  }

  function getCrossupsellName(item: any): string {
    const product = item?.productTo || item?.clusterTo;
    return product?.names?.[0]?.value || 'Product';
  }

  function getCrossupsellImageUrl(item: any): string {
    const product = item?.productTo || item?.clusterTo;
    return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }

  function getCrossupsellUrl(item: any): string {
    const product = item?.productTo || item?.clusterTo;
    if (props.configuration && props.configuration.urls && product) {
      return props.configuration.urls.getProductUrl(product);
    }
    return '#';
  }

  function handleQuantityChange(newQuantity: number): void {
    if (newQuantity < 1 || _loading) return;
    set_quantity(newQuantity);
    set_loading(true);

    if (props.onQuantityChange) {
      props.onQuantityChange(props.cartItem, newQuantity);
      set_loading(false);
      return;
    }

    const cartService = new CartService(props.graphqlClient);
    cartService.updateCartItem({
      id: props.cartId,
      itemId: (props.cartItem as any).itemId.toString(),
      input: { quantity: newQuantity },
      language: props.language || 'NL',
      imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
    }).then((updatedCart: Cart) => {
      set_loading(false);
      if (props.afterCartUpdate) {
        props.afterCartUpdate(updatedCart);
      }
    }).catch((error: any) => {
      console.error('Failed to update cart item quantity:', error);
      set_quantity((props.cartItem as any).quantity);
      set_loading(false);
    });
  }

  function handleNoteChange(note: string): void {
    set_notes(note);

    if (props.onNoteChange) {
      props.onNoteChange(props.cartItem, note);
      return;
    }

    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current);
    }

    notesTimeoutRef.current = setTimeout(() => {
      const cartService = new CartService(props.graphqlClient);
      cartService.updateCartItem({
        id: props.cartId,
        itemId: (props.cartItem as any).itemId.toString(),
        input: { notes: note },
        language: props.language || 'NL',
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
      }).then((updatedCart: Cart) => {
        if (props.afterCartUpdate) {
          props.afterCartUpdate(updatedCart);
        }
      }).catch((error: any) => {
        console.error('Failed to update cart item notes:', error);
      });
    }, 500);
  }

  function handleDelete(): void {
    if (_deleting) return;
    set_deleting(true);

    if (props.onDelete) {
      props.onDelete(props.cartItem);
      set_deleting(false);
      return;
    }

    const cartService = new CartService(props.graphqlClient);
    cartService.deleteCartItem({
      id: props.cartId,
      itemId: (props.cartItem as any).itemId.toString(),
      input: { itemId: (props.cartItem as any).itemId.toString() },
      language: props.language || 'NL',
      imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
    }).then((updatedCart: Cart) => {
      set_deleting(false);
      if (props.afterCartUpdate) {
        props.afterCartUpdate(updatedCart);
      }
    }).catch((error: any) => {
      console.error('Failed to delete cart item:', error);
      set_deleting(false);
    });
  }

  // Price toggle listener
  useEffect(() => {
    const stored = localStorage.getItem('price_include_tax');
    set_includeTax(stored !== null ? stored === 'true' : true);

    const listener = (e: any) => {
      set_includeTax(e.detail === true || e.detail === 'true');
    };
    window.addEventListener('priceToggleChanged', listener);
    return () => window.removeEventListener('priceToggleChanged', listener);
  }, []);

  // Sync quantity/notes when cartItem prop changes
  useEffect(() => {
    set_quantity((props.cartItem as any)?.quantity || 1);
    set_notes((props.cartItem as any)?.notes || '');
  }, [props.cartItem]);

  // Fetch cross-sells on mount (when showCrossupsells is true and no crossupsells prop provided)
  useEffect(() => {
    if (!props.showCrossupsells) return;
    const productId = (props.cartItem as any)?.productId;
    if (!productId) return;

    set_crossupsellsLoading(true);
    const crossupsellService = new CrossupsellService(props.graphqlClient);
    const types = props.crossupsellTypes || ['ACCESSORIES'];
    crossupsellService.getCrossupsells({
      productIdsFrom: [productId],
      types: types as any,
      offset: 0,
      page: 1,
    }).then((response: any) => {
      set_crossupsells(response?.items || []);
      set_crossupsellsLoading(false);
    }).catch(() => {
      set_crossupsells([]);
      set_crossupsellsLoading(false);
    });
  }, [props.showCrossupsells, props.crossupsellTypes, (props.cartItem as any)?.productId]);

  const imageUrl = getProductImageUrl();
  const inventory = getInventory();
  const visibleCrossupsells = getVisibleCrossupsells();

  return (
    <div className={`flex gap-4 bg-card p-4 rounded-lg shadow-sm border border-border/60 ${props.className || ''}`}>
      {/* Product image */}
      <div className="w-24 h-24 flex-shrink-0 bg-muted rounded border border-border/60 flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={getProductName()}
            fill
            className="object-contain p-1"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = '/no-image.webp';
            }}
          />
        ) : (
          <svg className="w-8 h-8 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        )}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        {props.titleLinkable !== false ? (
          <Link href={getProductUrl()} className="font-semibold text-lg text-foreground hover:text-primary transition-colors line-clamp-2">
            {getProductName()}
          </Link>
        ) : (
          <span className="font-semibold text-lg text-foreground line-clamp-2">
            {getProductName()}
          </span>
        )}

        {/* SKU */}
        {props.showSku !== false && getProductSku() && (
          <p className="text-sm text-muted-foreground mt-0.5">{getProductSku()}</p>
        )}

        {/* Stock */}
        {props.showStockComponent === true && inventory && (
          <div className="mt-1">
            <ItemStock inventory={inventory} />
          </div>
        )}

        {/* Price */}
        <p className="text-lg font-bold text-primary mt-2">{getFormattedPrice()}</p>

        {/* Cluster child items */}
        {!!(props.cartItem as any)?.clusterId && (props.cartItem as any)?.childItems?.length > 0 && (
          <div className="mt-3 space-y-1.5 border-l-2 border-muted pl-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {getLabel('includedOptions', 'Included Options:')}
            </p>
            {((props.cartItem as any).childItems || []).map((child: CartBaseItem, idx: number) => (
              <div key={idx} className="flex flex-wrap gap-x-2 text-sm text-foreground/90">
                <span className="font-medium">{(child as any).product?.names?.[0]?.value || 'Option'}</span>
                <span className="text-muted-foreground hidden sm:inline">-</span>
                <span className="text-muted-foreground text-xs self-center">{(child as any).product?.sku}</span>
                <div className="flex-1 border-b border-dotted border-border/60 mx-1 mb-1" />
                <span className="font-semibold text-primary">&euro;{((child as any).totalSum || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes field */}
        {props.showCartItemNotesField === true && (
          <div className="mt-3">
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {getLabel('notes', 'Notes')}
            </label>
            <textarea
              value={_notes}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={getLabel('notesPlaceholder', 'Add a note for this item...')}
              rows={2}
              className="w-full text-sm border border-border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background"
            />
          </div>
        )}

        {/* Cross-sell / Upsell products */}
        {visibleCrossupsells.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/60">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {getLabel('crossupsellTitle', 'You might also like')}
            </p>
            <div className="flex gap-3 overflow-x-auto">
              {visibleCrossupsells.map((item: any, idx: number) => (
                <Link
                  key={idx}
                  href={getCrossupsellUrl(item)}
                  onClick={(e) => {
                    if (props.onCrossupsellClick) {
                      e.preventDefault();
                      props.onCrossupsellClick(item.productTo || item.clusterTo);
                    }
                  }}
                  className="flex-shrink-0 flex items-center gap-2 p-2 rounded-md border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors max-w-[200px]"
                >
                  {getCrossupsellImageUrl(item) && (
                    <div className="w-10 h-10 relative flex-shrink-0">
                      <Image
                        src={getCrossupsellImageUrl(item)}
                        alt={getCrossupsellName(item)}
                        fill
                        className="object-contain rounded"
                      />
                    </div>
                  )}
                  <span className="text-xs font-medium text-foreground/80 line-clamp-2">
                    {getCrossupsellName(item)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quantity and actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {/* Quantity with +/- controls */}
        {props.enableIncrementDecrement !== false ? (
          <div className="flex items-center border border-border/60 rounded">
            <button
              type="button"
              onClick={() => handleQuantityChange(_quantity - 1)}
              disabled={_quantity <= 1 || _loading}
              className="px-3 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              value={_quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1) handleQuantityChange(val);
              }}
              className="w-16 text-center border-x border-border/60 bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => handleQuantityChange(_quantity + 1)}
              disabled={_loading}
              className="px-3 py-1 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none"
            >
              +
            </button>
          </div>
        ) : (
          <input
            type="number"
            min={1}
            value={_quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val >= 1) handleQuantityChange(val);
            }}
            className="w-16 h-10 text-center text-sm border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-background [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        )}

        {/* Loading indicator */}
        {_loading && (
          <span className="text-xs text-muted-foreground">{getLabel('updating', 'Updating...')}</span>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={() => handleDelete()}
          disabled={_deleting}
          className="text-destructive hover:text-destructive/80 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {_deleting ? getLabel('deleting', 'Removing...') : getLabel('remove', 'Remove')}
        </button>
      </div>
    </div>
  );
}

export default CartItem;
