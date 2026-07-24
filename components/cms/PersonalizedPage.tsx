'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { getPage } from '@/lib/cms';
import type { CmsPage } from '@/lib/cms/types';
import type { Contact, Company, AttributeResult } from '@propeller-commerce/propeller-sdk-v2';
import DynamicBlockRenderer from './DynamicBlockRenderer';

/**
 * Extracts SYSTEM_USER_GROUPS attribute value from the user's active company.
 * Returns the value as a string array of segments for Prepr personalization.
 */
/** Convert a display name to a Prepr segment slug: "Premium customers" → "premium-customers" */
function toSegmentSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function getUserSegments(user: any, selectedCompany: Company | null): string[] {
  if (!user || !('contactId' in user)) return [];

  const company = selectedCompany || (user as Contact).company;
  if (!company) return [];

  const attrs = company.attributes?.items || (company as any)._attributes?.items || [];

  for (const attr of attrs) {
    const name = attr.attributeDescription?.name || attr.attributeDescription?._name;
    if (name === 'SYSTEM_USER_GROUPS') {
      const val = attr.value;
      if (!val) return [];
      let raw: string[] = [];
      // ENUM type: value is in enumValues array
      if (val.enumValues && Array.isArray(val.enumValues)) {
        raw = val.enumValues.map(String).filter(Boolean);
      }
      // TEXT type: value might be in textValues
      else if (val.textValues && Array.isArray(val.textValues)) {
        raw = val.textValues.flatMap((tv: any) => tv.values || []).filter(Boolean);
      }
      // Fallback: direct value
      else if (val.value) {
        if (typeof val.value === 'string') raw = val.value.split(',').map((s: string) => s.trim()).filter(Boolean);
        else if (Array.isArray(val.value)) raw = val.value.map(String).filter(Boolean);
        else raw = [String(val.value)];
      }
      // Convert display names to Prepr segment slugs
      return raw.map(toSegmentSlug).filter(Boolean);
    }
  }
  return [];
}

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
