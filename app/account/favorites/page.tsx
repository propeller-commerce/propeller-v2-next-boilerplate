'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import FavoriteLists from '@/components/propeller/FavoriteLists';
import { graphqlClient } from '@/lib/api';

export default function FavoritesPage() {
  const { state: authState } = useAuth();
  const router = useRouter();

  if (!authState.isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Favorites</h1>

      <FavoriteLists
        user={authState.user}
        graphqlClient={graphqlClient}
        onListClick={(listId) => router.push(`/account/favorites/${listId}`)}
        showActions={true}
        allowFavoriteListCreate={true}
      />
    </div>
  );
}
