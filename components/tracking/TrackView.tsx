'use client';

import { useEffect } from 'react';
import { track } from '@/lib/tracking';
import type { PageType } from '@/lib/tracking';

/**
 * Null-rendering view marker.
 *
 * Category, search, cluster and PDP are Server Component shells, but a view has
 * to be attributed to a browser — so the event comes from a client marker
 * rendered inside the shell. Same shape as the existing `PreprTrack`, including
 * its "stable primitive deps" trick: the effect depends on scalars, never on an
 * object, so it fires once per entity instead of once per parent render. That
 * is also what keeps it React-Compiler-safe — there is nothing to memoize.
 *
 * Emitted once per (page, entity) thanks to the bus's idempotency key, which is
 * what makes it safe under StrictMode's double-invoke and App Router remounts.
 */
export default function TrackView({
  pageType,
  entityType,
  entityId,
  entityName,
  path,
}: {
  pageType: PageType;
  entityType?: string;
  entityId?: number | string;
  entityName?: string;
  path?: string;
}) {
  const id = entityId === undefined || entityId === null ? '' : String(entityId);

  useEffect(() => {
    track(
      'page_viewed',
      {
        page_type: pageType,
        entity_type: entityType ?? null,
        entity_id: id ? Number(id) || null : null,
        entity_name: entityName ?? null,
        path: path ?? window.location.pathname,
      },
      `page_viewed:${pageType}:${entityType ?? ''}:${id}`
    );
  }, [pageType, entityType, id, entityName, path]);

  return null;
}
