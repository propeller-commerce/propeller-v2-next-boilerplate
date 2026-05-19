'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Cart, CartMainItem, Product, Cluster } from 'propeller-sdk-v2';

/**
 * Tier 2 grid config context. Collapses the feature-flag/display and callback
 * props that ProductGrid otherwise cascades through ProductCard/ClusterCard
 * down to AddToCart/ItemStock. ProductGrid is the provider; the card subtree
 * consumes via useProductGridConfig() instead of receiving ~20 threaded props.
 *
 * Prop-name aliases are resolved here to a single canonical name:
 *   - ProductGrid `stockValidation`  -> `enableStockValidation`
 *   (ProductGrid `addToCartLabels` stays as-is; ProductCard already maps it to
 *    AddToCart's `labels` prop at its existing render site.)
 */
export interface ProductGridConfig {
  // Feature / display
  columns: number;
  showPrice?: boolean;
  showStock?: boolean;
  showAvailability?: boolean;
  enableAddFavorite?: boolean;
  allowAddToCart?: boolean;
  createCart?: boolean;
  showModal?: boolean;
  allowIncrDecr?: boolean;
  enableStockValidation?: boolean;
  cartId?: string;
  childItems?: number[];
  notes?: string;
  price?: number;
  stockLabels?: Record<string, string>;
  addToCartLabels?: Record<string, string>;

  // Callbacks
  onCartCreated?: (cart: Cart) => void;
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;
  onProceedToCheckout?: () => void;
  onRequestQuoteClick?: (cart: Cart) => void;
  onToggleFavorite?: (item: Product | Cluster, isFavorite: boolean) => void;
  onProductClick?: (product: Product) => void;
  onClusterClick?: (cluster: Cluster) => void;
}

const ProductGridContext = createContext<ProductGridConfig | null>(null);

export function ProductGridConfigProvider({
  value,
  children,
}: {
  value: ProductGridConfig;
  children: ReactNode;
}) {
  return (
    <ProductGridContext.Provider value={value}>
      {children}
    </ProductGridContext.Provider>
  );
}

/**
 * Non-throwing: ProductCard/ClusterCard used outside a grid (ProductSlider,
 * standalone, tests) get null and fall back to explicit props / defaults.
 */
export function useProductGridConfig(): ProductGridConfig | null {
  return useContext(ProductGridContext);
}
