'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import { productService } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { imageSearchFilters, imageVariantFiltersLarge } from '@/data/defaults';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { ImageVariant, Product } from 'propeller-sdk-v2';
import AddToCart from '@/output/react/ui-components/AddToCart';
import { graphqlClient } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { config } from '@/data/config';

export default function ProductPage() {
  const params = useParams();
  const { state } = useAuth();
  const productId = parseInt(params.productId as string);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { cart, addToCart, saveCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await productService.getProduct({
          productId,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          imageSearchFilters: imageSearchFilters,
          imageVariantFilters: imageVariantFiltersLarge,
        });
        setProduct(data);
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12">
          <div className="container-width">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 animate-pulse">
              <div className="space-y-4">
                <div className="aspect-square bg-slate-100 rounded-xl" />
                <div className="flex gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-20 h-20 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-4 bg-slate-100 rounded w-1/4" />
                <div className="h-10 bg-slate-100 rounded w-3/4" />
                <div className="h-8 bg-slate-100 rounded w-1/3" />
                <div className="h-24 bg-slate-100 rounded" />
                <div className="h-16 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) return null; // Or 404

  const images = product.media?.images?.items?.[0]?.imageVariants?.map((v: ImageVariant) => v.url) || ['/no-image.webp'];
  const name = product.names?.[0]?.value || 'Product';
  const sku = product.sku || '';
  const price = product.price?.gross || 0;
  const stock = product.inventory?.totalQuantity || 0;
  const description = product.descriptions?.[0]?.value || '';

  const handleAddToCart = async () => {
    setIsAdding(true);
    await addToCart(productId, quantity, name);
    setIsAdding(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-width max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Gallery Column */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-white rounded-xl overflow-hidden border border-border">
                <Image
                  src={images[selectedImage]}
                  alt={name}
                  fill
                  className="object-contain p-8"
                  priority
                />
              </div>

              {images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {images.map((img: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={cn(
                        "relative w-20 h-20 flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all",
                        selectedImage === idx ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-border"
                      )}
                    >
                      <Image src={img} alt={`${name} ${idx + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details Column */}
            <div className="flex flex-col">
              <div className="mb-6">
                <div className="text-sm font-mono text-muted-foreground mb-2">SKU: {sku}</div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">{name}</h1>

                <div className="flex items-center gap-4 mb-6">
                  <div className="text-3xl font-bold text-primary">€{price.toFixed(2)}</div>
                  {stock > 0 ? (
                    <Badge variant="secondary" className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                      In Stock ({stock})
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Out of Stock</Badge>
                  )}
                </div>

                {product.shortDescriptions?.[0]?.value && (
                  <div className="prose prose-slate text-muted-foreground">
                    {product.shortDescriptions[0].value}
                  </div>
                )}
              </div>

              <Card className="p-6 bg-muted/30 border-none shadow-none mb-8">
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
              </Card>

              <div className="space-y-6 border-t pt-8">
                <h2 className="text-xl font-bold">Description</h2>
                <div className="prose prose-slate max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: description }} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
