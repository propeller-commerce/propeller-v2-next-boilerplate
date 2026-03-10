'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Product,
  Cluster,
  GraphQLClient,
  Contact,
  Customer,
  Cart,
  CartMainItem,
  CartChildItemInput,
  ProductPrice,
} from 'propeller-sdk-v2';
import Image from 'next/image';
import AddToCart from '@/components/propeller/AddToCart';
import ItemStock from '@/components/propeller/ItemStock';
import ProductPriceDisplay from '@/components/propeller/ProductPrice';
import { Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface FavoriteListItemProps {
  /** Product or Cluster to be listed as a favorite list item */
  item: Product | Cluster;

  /** Should the item title be a link to the PDP (default: true) */
  titleLinkable?: boolean;

  /** Should the stock be displayed in the favorite list item (default: false) */
  showStockComponent?: boolean;

  /** Display the SKU of the item beneath the item name (default: true) */
  showSku?: boolean;

  /** Enables add to cart for products. Clusters show "View cluster" instead (default: true) */
  allowAddToCart?: boolean;

  /** Display a delete button that removes the item from the list (default: true) */
  showDelete?: boolean;

  /** Action callback fired when a favorite list item is deleted */
  onDelete?: (itemId: string) => void;

  /** Callback when the item title or image is clicked */
  onItemClick?: (item: Product | Cluster) => void;

  /** Extra CSS class applied to the root element */
  className?: string;

  /** Configuration object for URL generation */
  configuration?: any;

  /** UI string overrides */
  labels?: Record<string, string>;

  // === AddToCart pass-through props (products only) ===

  /** Initialised Propeller SDK GraphQL client (required by embedded AddToCart) */
  graphqlClient?: GraphQLClient;

  /** Authenticated user — used for cart creation / lookup */
  user?: Contact | Customer | null;

  /** ID of an existing cart to add items to */
  cartId?: string;

  /** When true and no cartId is available, AddToCart automatically creates a cart */
  createCart?: boolean;

  /** Called after a new cart is created internally by AddToCart */
  onCartCreated?: (cart: Cart) => void;

  /** Fully replaces the internal CartService.addItemToCart call */
  onAddToCart?: (
    product: Product,
    clusterId?: number,
    quantity?: number,
    childItems?: CartChildItemInput[],
    notes?: string,
    price?: number,
    showModal?: boolean,
  ) => Cart;

  /** Called after every successful add-to-cart */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /** Show modal after successful add (default: false) */
  showModal?: boolean;

  /** Renders increment/decrement buttons beside quantity input (default: true) */
  allowIncrDecr?: boolean;

  /** Validate stock before adding to cart (default: false) */
  enableStockValidation?: boolean;

  /** Language code forwarded to CartService (default: 'NL') */
  language?: string;

  /** Called when "Proceed to checkout" is clicked in AddToCart modal */
  onProceedToCheckout?: () => void;

  /** Label overrides for AddToCart UI strings */
  addToCartLabels?: Record<string, string>;

  /** Label overrides for ItemStock UI strings */
  stockLabels?: Record<string, string>;
}

function FavoriteListItem(props: FavoriteListItemProps) {
  const [_includeTax, set_includeTax] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('price_include_tax');
    set_includeTax(stored === null ? true : stored === 'true');
    const listener = () => {
      const val = localStorage.getItem('price_include_tax');
      set_includeTax(val === null ? true : val === 'true');
    };
    window.addEventListener('priceToggleChanged', listener);
    return () => window.removeEventListener('priceToggleChanged', listener);
  }, []);

  function isProduct(): boolean {
    return 'productId' in props.item;
  }

  function getProduct(): Product {
    return props.item as Product;
  }

  function getCluster(): Cluster {
    return props.item as Cluster;
  }

  function getName(): string {
    if (isProduct()) {
      return getProduct()?.names?.[0]?.value || 'Product';
    }
    return getCluster()?.names?.[0]?.value ||
      getCluster()?.defaultProduct?.names?.[0]?.value || 'Cluster';
  }

  function getSku(): string {
    if (isProduct()) {
      return getProduct()?.sku || '';
    }
    return getCluster()?.sku || getCluster()?.defaultProduct?.sku || '';
  }

  function getImageUrl(): string {
    if (isProduct()) {
      return getProduct()?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
    }
    return getCluster()?.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }

  function getItemUrl(): string {
    if (isProduct()) {
      return props.configuration?.urls?.getProductUrl?.(props.item) || '';
    }
    return props.configuration?.urls?.getClusterUrl?.(props.item) || '';
  }

  function getItemId(): string {
    if (isProduct()) {
      return String(getProduct()?.productId || '');
    }
    return String(getCluster()?.clusterId || '');
  }

  function getLabel(key: string, fallback: string): string {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  function handleItemClick(e: React.MouseEvent) {
    if (props.onItemClick) {
      e.preventDefault();
      props.onItemClick(props.item);
    }
  }

  function handleDelete() {
    if (props.onDelete) {
      props.onDelete(getItemId());
    }
  }

  const imageUrl = getImageUrl();
  const itemUrl = getItemUrl();
  const itemName = getName();
  const sku = getSku();
  const itemIsProduct = isProduct();
  const product = getProduct();
  const cluster = getCluster();
  const stockQty = !itemIsProduct
    ? cluster?.defaultProduct?.inventory?.totalQuantity
    : undefined;

  return (
    <div className={`group flex flex-row items-center gap-4 p-4 border-b border-border/60 hover:bg-muted/30 transition-colors ${props.className || ''}`}>
      {/* ── Image ──────────────────────────────────── */}
      <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-md bg-muted/50 p-2">
        {props.titleLinkable !== false ? (
          <a href={itemUrl} onClick={handleItemClick} className="block h-full w-full">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={itemName}
                fill
                className="object-contain p-1"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
          </a>
        ) : (
          <div className="block h-full w-full">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={itemName}
                fill
                className="object-contain p-1"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="w-8 h-8" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-1 min-w-0">
        {/* SKU */}
        {props.showSku !== false && sku && (
          <div className="font-mono text-xs text-muted-foreground">
            {sku}
          </div>
        )}

        {/* Name */}
        {props.titleLinkable !== false ? (
          <a
            href={itemUrl}
            onClick={handleItemClick}
            className="text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary line-clamp-2"
          >
            {itemName}
          </a>
        ) : (
          <span className="text-sm font-medium leading-tight text-foreground line-clamp-2">
            {itemName}
          </span>
        )}

        {/* Cluster badge */}
        {!itemIsProduct && (
          <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
            {getLabel('clusterBadge', 'Cluster')}
          </span>
        )}

        {/* Stock — Product: uses ItemStock component */}
        {props.showStockComponent && itemIsProduct && product.inventory && (
          <ItemStock
            inventory={product.inventory}
            showAvailability={true}
            showStock={true}
            labels={props.stockLabels}
          />
        )}

        {/* Stock — Cluster: inline badge like ClusterCard */}
        {props.showStockComponent && !itemIsProduct && stockQty !== undefined && (
          <div className="flex items-center gap-1.5">
            {stockQty > 5 && (
              <>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-green-600 bg-green-50">
                  {getLabel('inStock', 'In stock')}
                </span>
                <span className="text-xs text-muted-foreground">({stockQty})</span>
              </>
            )}
            {stockQty > 0 && stockQty <= 5 && (
              <>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-amber-600 bg-amber-50">
                  {getLabel('lowStock', 'Low stock')}
                </span>
                <span className="text-xs text-muted-foreground">({stockQty})</span>
              </>
            )}
            {stockQty === 0 && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-red-600 bg-red-50">
                {getLabel('outOfStock', 'Out of stock')}
              </span>
            )}
          </div>
        )}

        {/* Price — Product */}
        {itemIsProduct && product?.price && (
          <div>
            <ProductPriceDisplay
              price={product.price as ProductPrice}
              includeTax={_includeTax}
              priceSize="text-sm"
            />
          </div>
        )}

        {/* Price — Cluster (via defaultProduct, same as ClusterCard) */}
        {!itemIsProduct && cluster?.defaultProduct?.price && (
          <div>
            <ProductPriceDisplay
              price={cluster.defaultProduct.price as ProductPrice}
              includeTax={_includeTax}
              options={cluster.options}
              priceSize="text-sm"
            />
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Add to cart — Products only */}
        {props.allowAddToCart !== false && itemIsProduct && props.graphqlClient && (
          <div className="flex-shrink-0">
            <AddToCart
              graphqlClient={props.graphqlClient}
              user={props.user || null}
              product={product}
              cartId={props.cartId}
              configuration={props.configuration}
              createCart={props.createCart}
              onCartCreated={props.onCartCreated}
              onAddToCart={props.onAddToCart}
              afterAddToCart={props.afterAddToCart}
              showModal={props.showModal}
              allowIncrDecr={props.allowIncrDecr}
              enableStockValidation={props.enableStockValidation}
              language={props.language}
              onProceedToCheckout={props.onProceedToCheckout}
              labels={props.addToCartLabels}
              className="flex items-center gap-2"
            />
          </div>
        )}

        {/* View cluster — Clusters only */}
        {!itemIsProduct && (
          <a
            href={itemUrl}
            onClick={handleItemClick}
            className="inline-flex items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 whitespace-nowrap"
          >
            {getLabel('viewCluster', 'View cluster')}
          </a>
        )}

        {/* Delete button */}
        {props.showDelete !== false && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            title={getLabel('delete', 'Remove from list')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default FavoriteListItem;
