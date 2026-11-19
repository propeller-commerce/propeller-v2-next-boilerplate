'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import type { CmsPage } from '@/lib/cms/types';
import DynamicBlockRenderer from './DynamicBlockRenderer';
// Single copy of the segment derivation — this file used to carry a verbatim
// duplicate of it, `any`s and all.
import { getUserSegments } from '@/lib/preprSegments';

interface PersonalizedPageProps {
  /** Server-rendered page (default, no personalization) */
  defaultPage: CmsPage | null;
  /** Page slug for re-fetching with segments */
  slug: string;
}

// Only Prepr personalizes by segment (next.config twins CMS_PROVIDER into this).
const IS_PREPR = process.env.NEXT_PUBLIC_CMS_PROVIDER === 'prepr';

/**
 * Renders a CMS page with personalization support.
 * Initially renders the server-provided page, then re-fetches only when
 * something differs from it: the language changed since the render (the
 * switcher swaps the URL without a navigation), or the user has Prepr segments.
 */
export default function PersonalizedPage({ defaultPage, slug }: PersonalizedPageProps) {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { language } = useLanguage();
  const [page, setPage] = useState<CmsPage | null>(defaultPage);
  // The language the server rendered `defaultPage` in (the hydration snapshot).
  const renderedLanguage = useRef(language.toUpperCase());

  useEffect(() => {
    if (state.isLoading) return;

    const segments =
      state.isAuthenticated && state.user
        ? getUserSegments(state.user, selectedCompany)
        : [];

    // `defaultPage` is the server render in the request's language (the draft
    // in preview). Strapi and Contentful ignore segments, so for them a
    // logged-in view no longer fetches the page a second time.
    const languageChanged = language.toUpperCase() !== renderedLanguage.current;
    if (!languageChanged && !(IS_PREPR && segments.length > 0)) {
      setPage(defaultPage);
      return;
    }

    // Through our route: the CMS token is server-only, so the browser can't
    // call the CMS itself. The route derives the segments from the session.
    let cancelled = false;
    fetch(`/api/cms/page?slug=${encodeURIComponent(slug)}&locale=${encodeURIComponent(language)}`)
      .then((res) => (res.ok ? (res.json() as Promise<CmsPage>) : null))
      .then((nextPage) => {
        if (!cancelled && nextPage) setPage(nextPage);
      })
      .catch(() => {
        // Keep the server-rendered page on error.
      });
    return () => {
      cancelled = true;
    };
  }, [state.isLoading, state.isAuthenticated, state.user, selectedCompany, slug, defaultPage, language]);

  if (!page || page.blocks.length === 0) return null;

  return <DynamicBlockRenderer blocks={page.blocks} />;
}
