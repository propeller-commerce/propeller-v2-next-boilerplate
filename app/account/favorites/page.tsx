'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { FavoriteLists } from 'propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';

export default function FavoritesPage() {
  const { state: authState, refreshUser } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const favoriteListsLabels = useTranslations('FavoriteLists');

  if (!authState.isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">My Favorites</h1>

      <FavoriteLists
        labels={favoriteListsLabels}
        onListClick={(listId) => router.push(localizeHref(`/account/favorites/${listId}`, language))}
        showActions={true}
        allowFavoriteListCreate={true}
        onListChanged={refreshUser}
      />
    </div>
  );
}
