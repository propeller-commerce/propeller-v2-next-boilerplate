'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useParams } from 'next/navigation';
import { type FavoriteList } from 'propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { useFavorites } from 'propeller-v2-react-ui';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { FavoriteListDetails } from 'propeller-v2-react-ui';

export default function FavoriteListPage() {
  const { state: authState, refreshUser } = useAuth();
  const { cart, saveCart } = useCart();
  const params = useParams();
  const listId = params?.id as string;
  const { language } = useLanguage();

  const [listName, setListName] = useState('');

  const { removeFromList } = useFavorites({ graphqlClient, user: authState.user });

  function handleListLoaded(list: FavoriteList) {
    setListName(list?.name || '');
  }

  async function handleItemDelete(itemId: string, itemType?: string) {
    const numericId = Number(itemId);
    await removeFromList(
      listId,
      itemType === 'cluster' ? undefined : numericId,
      itemType === 'cluster' ? numericId : undefined,
    );
    toast.success('Item removed from list');
    refreshUser();
  }

  async function handleItemsDelete(items: { id: string; type: 'product' | 'cluster' }[]) {
    if (items.length === 0) return;
    const productIds = items.filter((i) => i.type === 'product').map((i) => Number(i.id));
    const clusterIds = items.filter((i) => i.type === 'cluster').map((i) => Number(i.id));
    await removeFromList(
      listId,
      productIds.length ? productIds : undefined,
      clusterIds.length ? clusterIds : undefined,
    );
    toast.success(items.length === 1 ? 'Item removed from list' : `${items.length} items removed from list`);
    refreshUser();
  }

  if (!authState.isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="gap-2">
          <Link href={localizeHref('/account/favorites', language)}>← Back to Lists</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {listName || 'Loading...'}
        </h1>
      </div>

      <FavoriteListDetails
        favoriteListId={listId}
        onItemDelete={handleItemDelete}
        onItemsDelete={handleItemsDelete}
        onListLoaded={handleListLoaded}
        cartId={cart?.cartId}
        createCart={true}
        onCartCreated={(newCart) => saveCart(newCart)}
        afterAddToCart={(updatedCart) => saveCart(updatedCart)}
        itemsPerPage={12}
        showPagination={true}
        showStockComponent={true}
        showAvailability={false}
        showStock={true}
      />
    </div>
  );
}
