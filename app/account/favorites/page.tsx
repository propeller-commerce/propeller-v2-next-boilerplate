'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
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
        enableActions={true}
        showCreateButton={true}
        afterCreate={() => toast.success('Favorite list created')}
        afterUpdate={() => toast.success('Favorite list updated')}
        afterDelete={() => toast.success('Favorite list deleted')}
      />
    </div>
  );
}
