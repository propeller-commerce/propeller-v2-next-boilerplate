'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useCartSync } from '@/hooks/useCartSync';
import { dispatchCartUpdate } from '@/utils/cartEvents';
import { serializeCart } from '@/utils/cartHelpers';
import { Cart, CartMainItem } from 'propeller-sdk-v2';

interface CartContextType {
  cart: Cart | null;
  cartItemsCount: number;
  isCartOpen: boolean;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getCart: () => void;
  saveCart: (cartData: Cart) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { cart, refreshCart: syncRefreshCart } = useCartSync();

  const saveCart = (cartData: Cart) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', serializeCart(cartData));
      dispatchCartUpdate();
    }
  };

  const clearCart = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart');
      dispatchCartUpdate();
    }
  }, []);

  const refreshCart = useCallback(() => {
    syncRefreshCart();
  }, [syncRefreshCart]);

  const getTotalItems = useCallback((): number => {
    if (!cart?.items) return 0;
    return cart.items.reduce((total: number, item: CartMainItem) => total + (item.quantity || 0), 0);
  }, [cart]);

  const getTotalPrice = useCallback((): number => {
    if (!cart?.total?.totalNet) return 0;
    return cart.total.totalNet;
  }, [cart]);

  const cartItemsCount = cart?.items?.length || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItemsCount,
        isCartOpen,
        clearCart,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        refreshCart,
        getTotalItems,
        getTotalPrice,
        getCart: refreshCart,
        saveCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
