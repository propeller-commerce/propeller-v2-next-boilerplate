'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { config } from '@/data/config';
import { cn } from '@/lib/utils';
import AddToCart from '@/output/react/ui-components/AddToCart';
import { graphqlClient } from '@/lib/api';

interface ProductCardProps {
  product: any;
  className?: string; // Allow external styling
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const { cart, addToCart, saveCart } = useCart();
  const { state } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  const imageUrl =
    product.media?.images?.items?.[0]?.imageVariants?.[0]?.url ||
    '/no-image.webp';

  const name = product.names?.[0]?.value || 'Product';
  const sku = product.sku || '';
  const price = product.price?.gross || 0;
  const productId = product.productId;
  const slug = product.slugs?.[0]?.value || '';

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // prevent link click
    setIsAdding(true);
    await addToCart(productId, quantity, name);
    setIsAdding(false);
  };

  return (
    <Card className={cn("w-full h-full flex flex-col overflow-hidden group transition-all duration-200 hover:shadow-md hover:border-primary/20 border-border/60", className)}>
      <Link href={`/product/${productId}/${slug}`} className="flex-1 flex flex-col">
        <div className="relative aspect-square bg-muted/20 p-4">
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain transition-transform duration-300 group-hover:scale-105"
          />
          {/* Optional: Add badge if new or sale */}
        </div>

        <CardContent className="p-4 flex-1 flex flex-col gap-2">
          <div className="text-xs text-muted-foreground font-mono">{sku}</div>
          <h3 className="font-medium leading-tight group-hover:text-primary line-clamp-2" title={name}>
            {name}
          </h3>
          <div className="mt-auto pt-2">
            <span className="text-lg font-bold">€{price.toFixed(2)}</span>
          </div>
        </CardContent>
      </Link>

      <CardFooter className="p-4 pt-0 gap-2">
        {/* Simplified Quantity & Add for cleaner look */}
        <AddToCart
          user={state.user}
          product={product}
          cartId={cart?.cartId}
          graphqlClient={graphqlClient}
          className='flex items-center w-full gap-2'
          configuration={config}
          showModal={true}
          afterAddToCart={(cart, item) => {
            saveCart(cart);
            console.log('Cart updated:', cart);
            console.log('Added item:', item);
          }}
          onProceedToCheckout={() => router.push('/checkout')} />
        {/* <div className="flex items-center w-full gap-2">
          <div className="flex items-center border border-input rounded-md h-9 bg-background">
            <button
              onClick={(e) => { e.preventDefault(); setQuantity(Math.max(1, quantity - 1)); }}
              className="px-2 h-full hover:bg-muted text-muted-foreground transition-colors"
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => { e.preventDefault(); setQuantity(Math.max(1, parseInt(e.target.value) || 1)); }}
              className="w-8 text-center text-sm bg-transparent border-none focus:ring-0 p-0 h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              min="1"
              onClick={(e) => e.preventDefault()}
            />
            <button
              onClick={(e) => { e.preventDefault(); setQuantity(quantity + 1); }}
              className="px-2 h-full hover:bg-muted text-muted-foreground transition-colors"
            >
              +
            </button>
          </div>

          <Button
            onClick={handleAddToCart}
            className="flex-1"
            size="sm"
            isLoading={isAdding}
          >
            <span className="sr-only sm:not-sr-only sm:inline-block">Add</span>
            <span className="sm:hidden">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </span>
          </Button>
        </div> */}
      </CardFooter>
    </Card>
  );
}
