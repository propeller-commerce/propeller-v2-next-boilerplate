'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useParams } from 'next/navigation';
import { Contact, Customer, FavoriteListService, type FavoriteList } from 'propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import { usePrice } from '@/context/PriceContext';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import FavoriteListDetails from '@/components/propeller/FavoriteListDetails';

export default function FavoriteListPage() {
  const { state: authState } = useAuth();
  const { cart, saveCart } = useCart();
  const params = useParams();
  const listId = params?.id as string;
  const { language } = useLanguage();
  const { includeTax } = usePrice();

  const [listName, setListName] = useState('');

  function handleListLoaded(list: FavoriteList) {
    setListName(list?.name || '');
  }

  async function handleItemDelete(itemId: string, itemType?: string) {
    try {
      const service = new FavoriteListService(graphqlClient);
      const numericId = Number(itemId);
      // Use removeFavoriteListItems for direct removal (works even for last item)
      const input = itemType === 'cluster'
        ? { clusterIds: [numericId] }
        : { productIds: [numericId] };
      await service.removeFavoriteListItems(listId, input);
      toast.success('Item removed from list');
    } catch (error) {
      console.error('Error removing item from list:', error);
      toast.error('Failed to remove item');
    }
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
        graphqlClient={graphqlClient}
        user={authState.user as Contact | Customer}
        favoriteListId={listId}
        onItemDelete={handleItemDelete}
        onListLoaded={handleListLoaded}
        configuration={config}
        cartId={cart?.cartId}
        createCart={true}
        onCartCreated={(newCart) => saveCart(newCart)}
        afterAddToCart={(updatedCart) => saveCart(updatedCart)}
        itemsPerPage={12}
        showPagination={true}
        showStockComponent={true}
        showAvailability={false}
        showStock={true}
        includeTax={includeTax}
      />
    </div>
  );
}
