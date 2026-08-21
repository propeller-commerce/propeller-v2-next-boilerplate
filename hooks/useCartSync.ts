import { Cart } from '@propeller-commerce/propeller-sdk-v2';
import { useState, useEffect } from 'react';
import { deserializeCart } from '@/utils/cartHelpers';

/**
 * Custom hook to synchronize cart state across the application
 * Listens to localStorage changes and updates cart state accordingly
 */
export const useCartSync = () => {
  // Initialize cart state from localStorage
  const [cart, setCart] = useState<Cart | null>(() => {
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        return deserializeCart(storedCart);
      }
    }
    return null;
  });

  // Listen for storage changes (from other tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart') {
        console.log('Cart updated in localStorage, syncing state...');
        if (e.newValue) {
          setCart(deserializeCart(e.newValue));
        } else {
          setCart(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen for custom cart update events and auth events
  useEffect(() => {
    const handleCartUpdate = () => {
      console.log('Cart/Auth update event received, syncing state...');
      if (typeof window !== 'undefined') {
        const storedCart = localStorage.getItem('cart');
        if (storedCart) {
          setCart(deserializeCart(storedCart));
        } else {
          setCart(null);
        }
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('userLoggedOut', handleCartUpdate);
    window.addEventListener('userLoggedIn', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('userLoggedOut', handleCartUpdate);
      window.removeEventListener('userLoggedIn', handleCartUpdate);
    };
  }, []);

  // Function to manually refresh cart state
  const refreshCart = () => {
    if (typeof window !== 'undefined') {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        setCart(deserializeCart(storedCart));
      } else {
        setCart(null);
      }
    }
  };

  return { cart, refreshCart };
};
