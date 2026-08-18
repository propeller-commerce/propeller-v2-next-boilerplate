'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { getPage } from '@/lib/cms';
import type { CmsPage } from '@/lib/cms/types';
import DynamicBlockRenderer from './DynamicBlockRenderer';
// Single copy of the segment derivation — this file used to carry a verbatim
// duplicate of it, `any`s and all (PWP-942 #20).
import { getUserSegments } from '@/lib/preprSegments';

interface PersonalizedPageProps {
  /** Server-rendered page (default, no personalization) */
  defaultPage: CmsPage | null;
  /** Page slug for re-fetching with segments */
  slug: string;
}

/**
 * Renders a CMS page with personalization support.
 * Initially renders the server-provided default page, then re-fetches
 * with the user's segments if they're logged in with a matching group.
 */
const DEFAULT_LANGUAGE = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';

export default function PersonalizedPage({ defaultPage, slug }: PersonalizedPageProps) {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { language } = useLanguage();
  const [page, setPage] = useState<CmsPage | null>(defaultPage);

  useEffect(() => {
    if (state.isLoading) return;

    const segments =
      state.isAuthenticated && state.user
        ? getUserSegments(state.user, selectedCompany)
        : [];

    // `defaultPage` is the server render in the default locale with no segments.
    // Re-fetch client-side only when something actually differs from it: a
    // non-default language (the switcher swaps the URL client-side without a
    // navigation, so the server render stays stale) or user group segments.
    const isDefaultLocale = language.toUpperCase() === DEFAULT_LANGUAGE.toUpperCase();
    if (isDefaultLocale && segments.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the personalized re-fetch; the server render is the default page
      setPage(defaultPage);
      return;
    }

    let cancelled = false;
    getPage(slug, { locale: language, segments }).then((nextPage) => {
      if (!cancelled && nextPage) {
        setPage(nextPage);
      }
    }).catch(() => {
      // Fallback to the server-rendered default on error
    });
    return () => {
      cancelled = true;
    };
  }, [state.isLoading, state.isAuthenticated, state.user, selectedCompany, slug, defaultPage, language]);

  if (!page || page.blocks.length === 0) return null;

  return <DynamicBlockRenderer blocks={page.blocks} />;
}
