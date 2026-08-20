/**
 * Section registry, shared by the Server Component shell and the client island.
 *
 * Deliberately NOT in TrackerShell.tsx: that file is `'use client'`, and a value
 * imported from a client module into a Server Component arrives as a client
 * reference proxy, not the array — `generateStaticParams` then fails with
 * "SECTIONS.map is not a function". Plain modules cross the boundary intact.
 */
export const SECTIONS = [
  { id: 'overview', label: 'Overview', group: 'Summary' },
  { id: 'visitors', label: 'Visitors & sessions', group: 'Audience' },
  { id: 'identity', label: 'Registrations & logins', group: 'Audience' },
  { id: 'pages', label: 'Pages', group: 'Behaviour' },
  { id: 'search', label: 'Search', group: 'Behaviour' },
  { id: 'catalog', label: 'Catalog', group: 'Behaviour' },
  { id: 'checkout', label: 'Cart & checkout', group: 'Commerce' },
  { id: 'accounts', label: 'Accounts (B2B)', group: 'Commerce' },
  { id: 'events', label: 'Event explorer', group: 'Raw' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

export const SECTION_GROUPS = Array.from(new Set(SECTIONS.map((s) => s.group)));
