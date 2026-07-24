'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { getUserSegments } from '@/lib/preprSegments';
import { PREPR_ENABLED } from '@/lib/preprEvent';

const SEGMENTS_COOKIE = 'prepr-segments';

/**
 * Keeps a `prepr-segments` cookie in sync with the logged-in user's group
 * segments (from the company's SYSTEM_USER_GROUPS attribute). The proxy
 * (middleware) reads this cookie and forwards it to the server render as the
 * Prepr-Segments header, so group-based personalization resolves server-side
 * (the Prepr token is server-only, so a client-side fetch can't do it).
 *
 * Renders nothing. Mounted once in the root layout, inside Auth + Company
 * providers. No-ops entirely unless Prepr is the active CMS.
 */
export default function PreprSegmentsSync() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (!PREPR_ENABLED) return;
    if (state.isLoading) return;

    const segments =
      state.isAuthenticated && state.user
        ? getUserSegments(state.user, selectedCompany).sort()
        : [];

    if (segments.length > 0) {
      document.cookie = `${SEGMENTS_COOKIE}=${encodeURIComponent(segments.join(','))}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    } else {
      // Clear it for guests / companies without a group.
      document.cookie = `${SEGMENTS_COOKIE}=; path=/; max-age=0; samesite=lax`;
    }
  }, [state.isLoading, state.isAuthenticated, state.user, selectedCompany]);

  return null;
}
