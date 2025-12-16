'use client';

import { useCart } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartTotals from '@/components/common/CartTotals';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import type { CartMainItem } from 'propeller-sdk-v2';

export default function CartPage() {
  const { cart, updateCartItem, removeFromCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const items = cart?.items || [];

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setQuantities({ ...quantities, [itemId]: newQuantity });
    await updateCartItem(itemId, newQuantity);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width max-w-7xl">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground mb-4">Your cart is empty</p>
              <Link
                href="/"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item: CartMainItem) => {
                  const imageUrl =
                    item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url ||
                    '/no-image.webp';
                  const name = item.product?.names?.[0]?.value || 'Product';
                  const sku = item.product?.sku || '';
                  const price = item.totalSumNet || 0;
                  const qty = quantities[item.itemId] ?? item.quantity;

                  return (
                    <div key={item.itemId} className="flex gap-4 bg-card p-4 rounded-lg shadow-sm border border-border/60">
                      <div className="w-24 h-24 flex-shrink-0 bg-muted rounded border border-border/60 flex items-center justify-center overflow-hidden relative">
                        <Image
                          src={imageUrl}
                          alt={name}
                          fill
                          className="object-contain p-1"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = '/no-image.webp';
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{name}</h3>
                        <p className="text-sm text-muted-foreground">{sku}</p>
                        <p className="text-lg font-bold text-primary mt-2">€{price.toFixed(2)}</p>

                        {/* Cluster Child Items */}
                        {(item as any).clusterId && (item as any).childItems && (item as any).childItems.length > 0 && (
                          <div className="mt-3 space-y-1.5 border-l-2 border-muted pl-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Included Options:</p>
                            {(item as any).childItems.map((child: any, idx: number) => (
                              <div key={idx} className="flex flex-wrap gap-x-2 text-sm text-foreground/90">
                                <span className="font-medium">{child.product?.names?.[0]?.value || 'Option'}</span>
                                <span className="text-muted-foreground hidden sm:inline">-</span>
                                <span className="text-muted-foreground text-xs self-center">{child.product?.sku}</span>
                                <div className="flex-1 border-b border-dotted border-border/60 mx-1 mb-1"></div>
                                <span className="font-semibold text-primary">€{(child.totalSum || 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center border border-border/60 rounded">
                          <button
                            onClick={() => handleQuantityChange(item.itemId, qty - 1)}
                            className="px-3 py-1 hover:bg-muted"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={qty}
                            onChange={(e) =>
                              handleQuantityChange(item.itemId, parseInt(e.target.value) || 1)
                            }
                            className="w-16 text-center border-x border-border/60 bg-background"
                            min="1"
                          />
                          <button
                            onClick={() => handleQuantityChange(item.itemId, qty + 1)}
                            className="px-3 py-1 hover:bg-muted"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.itemId, name)}
                          className="text-destructive hover:text-destructive/80 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cart Summary */}
              <div className="bg-card p-6 rounded-lg shadow-sm border border-border/60 h-fit">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>
                {cart && <CartTotals cart={cart} showCalculations={true} />}
                <Link
                  href="/checkout"
                  className="block w-full bg-primary text-primary-foreground text-center py-3 rounded-lg hover:bg-primary/90 transition font-semibold mt-4"
                >
                  Continue to Checkout
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
