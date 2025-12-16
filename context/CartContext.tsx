'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { cartService } from '@/lib/api';
import { useAuth } from './AuthContext';
import { useCartSync } from '@/hooks/useCartSync';
import { dispatchCartUpdate } from '@/utils/cartEvents';
import { serializeCart } from '@/utils/cartHelpers';
import toast from 'react-hot-toast';
import { Address, Cart, CartDeleteVariables, CartMainItem, CartSearchInput, CartStartInput, Customer, Enums } from 'propeller-sdk-v2';
import { CartQueryVariables, CartStartVariables } from 'propeller-sdk-v2/dist/service/CartService';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import { CartAddressType } from 'propeller-sdk-v2/dist/enum';

interface CartContextType {
  cart: Cart | null;
  cartItemsCount: number;
  isCartOpen: boolean;
  addToCart: (productId: number, quantity: number, productName?: string, clusterId?: number, childItems?: any[]) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string, productName?: string) => Promise<void>;
  clearCart: () => Promise<void>;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getCart: () => void;
  clearCarts: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { state: authState } = useAuth();
  const { cart, refreshCart: syncRefreshCart } = useCartSync();

  const saveCart = (cartData: Cart) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart', serializeCart(cartData));
      dispatchCartUpdate();
    }
  };


  const clearCarts = useCallback(async () => {
    const user = authState.user;
    console.log('CartContext: clearCarts called', user);

    try {
      if (user) {
        try {
          const searchInput: CartSearchInput = {
            offset: 100
          };

          if ('contactId' in user && user.contactId) {
            searchInput.contactIds = [user.contactId];
            if (user.company && 'companyId' in user.company && user.company.companyId) {
              searchInput.companyIds = [user.company.companyId];
            }
          } else if ('customerId' in user && user.customerId) {
            searchInput.customerIds = [user.customerId];
          }

          const carts = await cartService.getCarts(searchInput);

          if (carts && carts.items && carts.items.length > 0) {
            // Use Promise.all to await all deletions properly
            await Promise.all(carts.items.map(async (cart) => {
              const cartDeleteVariables: CartDeleteVariables = {
                id: cart.cartId
              };
              console.log('Deleting cart:', cart.cartId);
              await cartService.deleteCart(cartDeleteVariables);
            }));
          } else {
            console.log('No carts found to delete');
          }
        } catch (e) {
          console.error("Failed to check existing carts", e);
        }
      } else {
        console.warn('CartContext: clearCarts called but no user is logged in');
      }
    } catch (e) {
      console.error("Failed to clear carts", e);
    }
  }, [authState.user]);

  const initCart = useCallback(async () => {
    const user = authState.user;
    // console.log('CartContext: initCart called', user);

    // 1. Check for existing carts for this user first
    if (user) {
      try {
        const searchInput: CartSearchInput = {
          offset: 100
        };

        if ('contactId' in user && user.contactId) {
          searchInput.contactIds = [user.contactId];
          if (user.company && 'companyId' in user.company && user.company.companyId) {
            searchInput.companyIds = [user.company.companyId];
          }
        } else if ('customerId' in user && user.customerId) {
          searchInput.customerIds = [user.customerId];
        }

        const carts = await cartService.getCarts(searchInput);

        if (carts && carts.items && carts.items.length > 0) {
          const cartId = carts.items[carts.items.length - 1].cartId;

          const cartVariables: CartQueryVariables = {
            cartId: cartId,
            imageSearchFilters: imageSearchFiltersGrid,
            imageVariantFilters: imageVariantFiltersSmall,
            language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
          };

          const cart = await cartService.getCart(cartVariables);

          saveCart(cart);
          return cart;
        }
      } catch (e) {
        console.error("Failed to check existing carts", e);
      }
    }

    // 2. Start a new cart
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
    const startCartInput: CartStartInput = { language };

    if (user) {
      if ('contactId' in user && user.contactId) {
        startCartInput.contactId = user.contactId;
        if ('companyId' in user && user.companyId) {
          startCartInput.companyId = user.companyId as number;
        }
      } else if ('customerId' in user && user.customerId) {
        startCartInput.customerId = user.customerId;
      }
    }

    const cartStartVars: CartStartVariables = {
      input: startCartInput,
      imageSearchFilters: imageSearchFiltersGrid,
      imageVariantFilters: imageVariantFiltersSmall,
      language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
    };

    let newCart = await cartService.startCart(cartStartVars);

    // 3. Assign Default Addresses
    if (newCart && user) {
      const addresses = 'company' in user ? user.company?.addresses : (user as Customer).addresses;

      if (addresses && Array.isArray(addresses)) {
        const defaultInvoice = addresses.find((addr: Address) => addr.isDefault === 'Y' && addr.type === 'invoice');
        const defaultDelivery = addresses.find((addr: Address) => addr.isDefault === 'Y' && addr.type === 'delivery');

        if (defaultInvoice) {
          newCart = await cartService.updateCartAddress({
            id: newCart.cartId,
            input: {
              type: CartAddressType.INVOICE,
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
            imageSearchFilters: imageSearchFiltersGrid,
            imageVariantFilters: imageVariantFiltersSmall,
            language: language
          });
        }

        if (defaultDelivery) {
          newCart = await cartService.updateCartAddress({
            id: newCart.cartId,
            input: {
              type: CartAddressType.DELIVERY,
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
            imageSearchFilters: imageSearchFiltersGrid,
            imageVariantFilters: imageVariantFiltersSmall,
            language: language
          });
        }
      }
    }

    saveCart(newCart);
    return newCart;
  }, [authState.user]);

  const addToCart = useCallback(async (productId: number, quantity: number, productName?: string, clusterId?: number, childItems?: any[]) => {
    try {
      let cartId = cart?.cartId;
      let currentCart = cart;

      if (!cartId) {
        currentCart = await initCart();
        cartId = currentCart?.cartId;
      }

      if (!cartId) {
        throw new Error("Failed to initialize cart");
      }

      const input: any = { productId, quantity };
      if (clusterId) input.clusterId = clusterId;
      if (childItems) input.childItems = childItems;

      const updatedCart = await cartService.addItemToCart({
        id: cartId,
        input: input,
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersSmall,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
      });

      saveCart(updatedCart);
      toast.success(`${productName || 'Product'} added to cart`, {
        duration: 3000,
        position: 'top-center'
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add product to cart');
    }
  }, [cart, initCart]);

  const updateCartItem = useCallback(async (itemId: string, quantity: number) => {
    if (!cart?.cartId) return;

    try {
      const updatedCart = await cartService.updateCartItem({
        id: cart.cartId,
        itemId: itemId.toString(),
        input: { quantity },
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersSmall,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
      });

      saveCart(updatedCart);
    } catch (error) {
      console.error('Failed to update cart item:', error);
      toast.error('Failed to update cart');
    }
  }, [cart]);

  const removeFromCart = useCallback(async (itemId: string, productName?: string) => {
    if (!cart?.cartId) return;

    try {
      const updatedCart = await cartService.deleteCartItem({
        id: cart.cartId,
        itemId: itemId.toString(),
        input: { itemId: itemId.toString() },
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersSmall,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
      });

      saveCart(updatedCart);
      toast.success(`${productName || 'Product'} removed from cart`);
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      toast.error('Failed to remove product');
    }
  }, [cart]);

  const clearCart = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart');
      dispatchCartUpdate();
      toast.success('Cart cleared');
    }
  }, []);

  const refreshCart = useCallback(() => {
    syncRefreshCart();
  }, [syncRefreshCart]);

  const getTotalItems = useCallback((): number => {
    if (!cart?.items) {
      return 0;
    }
    return cart.items.reduce((total: number, item: CartMainItem) => total + (item.quantity || 0), 0);
  }, [cart]);

  const getTotalPrice = useCallback((): number => {
    if (!cart?.total?.totalNet) return 0;
    return cart.total.totalNet;
  }, [cart]);

  const cartItemsCount = cart?.items?.length || 0;

  useEffect(() => {
    if (authState.user) {
      initCart();
    }
  }, [authState.user, initCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItemsCount,
        isCartOpen,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
        refreshCart,
        getTotalItems,
        getTotalPrice,
        getCart: refreshCart,
        clearCarts,
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
