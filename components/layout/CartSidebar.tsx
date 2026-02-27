'use client';

import { useCart } from '@/context/CartContext';
import CartTotals from '@/components/common/CartTotals';
import Link from 'next/link';
import { CartMainItem } from 'propeller-sdk-v2';
import { Button, buttonVariants } from '@/components/ui/Button';
import { X, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useEffect, useSyncExternalStore } from 'react';

export default function CartSidebar() {
  const { cart, isCartOpen, closeCart } = useCart();
  const items = cart?.items || [];

  // Prevent hydration mismatch — cart data comes from localStorage on the client
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    if (isCartOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isCartOpen, closeCart]);

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isCartOpen]);

  const getImageUrl = (item: CartMainItem): string => {
    return (
      item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url ||
      '/no-image.webp'
    );
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-300",
          isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Sidebar Sheet */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background shadow-2xl transition-transform duration-300 ease-in-out transform border-l",
          isCartOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Shopping Cart</h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {mounted ? items.length : 0}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={closeCart} className="h-8 w-8">
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!mounted || items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 opacity-20" />
                <p>Your cart is empty.</p>
                <Button variant="link" onClick={closeCart}>Continue Shopping</Button>
              </div>
            ) : (
              items
                .filter((item: CartMainItem) => item && item.product)
                .map((item: CartMainItem) => {
                  const product = item.product;
                  const itemId = item.itemId;
                  const quantity = item.quantity;
                  const totalSumNet = item.totalSumNet;
                  const productName = product?.names?.[0]?.value || 'Unnamed Product';

                  let productUrl = '#';
                  if (product?.class === 'PRODUCT') {
                    const slug = product.slugs?.[0]?.value || '';
                    productUrl = `/product/${product.productId}/${slug}`;
                  } else if (product?.class === 'CLUSTER') {
                    const slug = product.slugs?.[0]?.value || '';
                    productUrl = `/cluster/${product.clusterId || product.productId}/${slug}`;
                  }

                  return (
                    <div key={itemId} className="flex gap-4 group">
                      <div className="relative w-20 h-20 flex-shrink-0 bg-muted/20 rounded-md overflow-hidden" suppressHydrationWarning>
                        <Image
                          src={getImageUrl(item)}
                          alt={productName}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <Link
                              href={productUrl}
                              onClick={closeCart}
                              className="text-sm font-medium leading-tight hover:text-primary transition line-clamp-2"
                            >
                              {productName}
                            </Link>
                            <span className="font-semibold text-sm whitespace-nowrap">
                              €{(totalSumNet || 0).toFixed(2)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">SKU: {product?.sku || 'N/A'}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Qty: {quantity}</span>
                          {/* Could add remove/edit button here later */}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Footer */}
          {mounted && items.length > 0 && cart && (
            <div className="bg-muted/10 p-4 border-t space-y-4">
              <CartTotals cart={cart} showCalculations={false} />
              <Link href="/checkout" onClick={closeCart} className={cn(buttonVariants({ size: 'lg' }), "w-full")}>
                Checkout
              </Link>
              <Link href="/cart" onClick={closeCart} className={cn(buttonVariants({ variant: 'outline' }), "w-full")}>
                View Cart Details
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
