'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { FavoriteListService } from '@/lib/services/FavoriteListService';
import { Cluster, FavoriteList, Product, ProductsResponse } from 'propeller-sdk-v2';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function FavoriteListPage() {
    const { state: authState } = useAuth();
    const router = useRouter();
    const params = useParams();
    const listId = params?.id as string;
    const { addToCart } = useCart();

    const [favoriteList, setFavoriteList] = useState<FavoriteList | null>(null);
    const [loading, setLoading] = useState(true);
    const [addingToCartItems, setAddingToCartItems] = useState<Set<string>>(new Set());

    const fetchFavoriteList = useCallback(async (id: string) => {
        try {
            setLoading(true);
            const service = new FavoriteListService();
            const list = await service.getFavoriteList(id, authState.user);
            setFavoriteList(list);
        } catch (error) {
            console.error('Error fetching favorite list:', error);
            toast.error('Failed to load favorite list');
            router.push('/account/favorites');
        } finally {
            setLoading(false);
        }
    }, [authState.user, router]);

    useEffect(() => {
        if (!authState.isAuthenticated) {
            router.push('/login');
        } else if (listId) {
            fetchFavoriteList(listId);
        }
    }, [authState.isAuthenticated, listId, fetchFavoriteList, router]);

    const handleAddToCart = async (product: Product, quantity: number = 1) => {
        const productId = String(product.productId);

        try {
            setAddingToCartItems(prev => new Set(prev).add(productId));
            await addToCart(product.productId, quantity);
            toast.success('Added to cart');
        } catch (error) {
            console.error('Failed to add item to cart:', error);
            toast.error('Failed to add to cart');
        } finally {
            setAddingToCartItems(prev => {
                const newSet = new Set(prev);
                newSet.delete(productId);
                return newSet;
            });
        }
    };

    // Type guards
    const isProduct = (item: Product | Cluster): item is Product => {
        return 'productId' in item;
    };

    if (!authState.isAuthenticated) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="gap-2"
                    >
                        <Link href="/account/favorites">← Back to Lists</Link>
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">{favoriteList?.name || 'Loading...'}</h1>
                </div>
            </div>

            {loading ? (
                <Card className="p-8 text-center animate-pulse">
                    <div className="h-8 bg-slate-100 rounded w-1/3 mx-auto mb-4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
                </Card>
            ) : favoriteList ? (
                <Card className="overflow-hidden border-none">
                    {(() => {
                        // Combine products and clusters
                        const allItems: (Product | Cluster)[] = [];

                        // Safely access products
                        const productsRef = favoriteList.products as ProductsResponse;
                        if (productsRef?.items && Array.isArray(productsRef.items)) {
                            productsRef.items.forEach((item) => {
                                // Cast to Product since we know these are products
                                allItems.push(item as Product);
                            });
                        }

                        // Safely access clusters
                        const clustersRef = favoriteList.clusters as ProductsResponse;
                        if (clustersRef?.items && Array.isArray(clustersRef.items)) {
                            clustersRef.items.forEach((item) => {
                                // Cast to Cluster since we know these are clusters
                                allItems.push(item as Cluster);
                            });
                        }

                        if (allItems.length > 0) {
                            return (
                                <div className="divide-y divide-gray-200">
                                    {allItems.map((item: Product | Cluster, index: number) => {
                                        const itemIsProduct = isProduct(item);
                                        const id = itemIsProduct ? item.productId : item.clusterId;

                                        // Image resolution
                                        let imageUrl = null;
                                        if (itemIsProduct) {
                                            imageUrl = item.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
                                        } else {
                                            // Cluster image usually comes from default product
                                            imageUrl = item.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
                                        }

                                        const name = item.names?.[0]?.value || (itemIsProduct ? 'Unknown Product' : 'Unknown Cluster');
                                        const sku = itemIsProduct ? item.sku : undefined;
                                        const slug = item.slugs?.[0]?.value || '';
                                        
                                        // Handle price - only products have direct price, clusters might have price from defaultProduct
                                        let price: number | undefined;
                                        if (itemIsProduct) {
                                            price = item.price?.gross;
                                        } else {
                                            price = item.defaultProduct?.price?.gross;
                                        }

                                        const detailUrl = itemIsProduct
                                            ? `/product/${id}/${slug}`
                                            : `/cluster/${id}/${slug}`;

                                        return (
                                            <div key={`${itemIsProduct ? 'product' : 'cluster'}-${id}-${index}`} className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6 hover:bg-gray-50 transition">
                                                {/* Image */}
                                                <div className="relative w-24 h-24 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                                                    {imageUrl ? (
                                                        <Image
                                                            src={imageUrl}
                                                            alt={name}
                                                            fill
                                                            className="object-contain p-2"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center w-full h-full text-gray-400 text-xs">
                                                            No Image
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <Link href={detailUrl} className="group">
                                                        <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 truncate">
                                                            {name}
                                                        </h3>
                                                    </Link>

                                                    {itemIsProduct && sku && (
                                                        <p className="text-sm text-gray-500 mt-1">
                                                            SKU: <span className="font-medium">{sku}</span>
                                                        </p>
                                                    )}

                                                    {/* Cluster Badge */}
                                                    {!itemIsProduct && (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mt-2">
                                                            Cluster
                                                        </span>
                                                    )}

                                                    {/* Price */}
                                                    {price !== undefined && (
                                                        <div className="mt-2 text-lg font-bold text-gray-900">
                                                            €{Number(price).toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                <div className="flex flex-col gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                                                    {itemIsProduct ? (
                                                        <button
                                                            onClick={() => handleAddToCart(item as Product)}
                                                            disabled={addingToCartItems.has(String(id))}
                                                            className="w-full sm:w-32 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
                                                        >
                                                            {addingToCartItems.has(String(id)) ? 'Adding...' : 'Add to Cart'}
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            href={detailUrl}
                                                            className="w-full sm:w-32 px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 text-center transition text-sm font-medium"
                                                        >
                                                            View Cluster
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        } else {
                            return (
                                <div className="p-12 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-2xl">❤️</span>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 mb-1">List is empty</h3>
                                    <p className="text-gray-500">You haven&apos;t added any products or clusters to this list yet.</p>
                                    <Link
                                        href="/"
                                        className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                                    >
                                        Start Shopping
                                    </Link>
                                </div>
                            );
                        }
                    })()}
                </Card>
            ) : (
                <Card className="p-8 text-center">
                    <p className="text-destructive">Favorite list not found or could not be loaded.</p>
                    <Button variant="link" asChild className="mt-2">
                        <Link href="/account/favorites">Return to lists</Link>
                    </Button>
                </Card>
            )}
        </div>
    );
}
