'use client';

/**
 * Browser-storage reconciliation, run once per document before anything reads
 * `localStorage`.
 *
 * The problem this solves: shipping a release used to require telling users to
 * clear their browser storage. Two separate causes, handled two
 * different ways.
 *
 * **1. Caches went stale.** `useMenu` persists the category tree under
 * `propeller_menu_*` with a 12h TTL and no awareness of which build wrote it, so
 * a deploy that changed the catalog left the old menu on screen for up to half a
 * day. Anything that is a pure cache — derivable again from the API at any time
 * — is dropped here whenever the app version changes. Losing it costs one fetch.
 *
 * **2. Persisted state drifted in shape.** `cart` / `selected_company` were read
 * back with a bare `as Cart` type assertion: no runtime validation, so an object
 * written by a build from three releases ago was handed to new code that
 * dereferenced fields it no longer had. That is NOT fixed here — purging state
 * on every deploy would drop an anonymous shopper's cart and reset the active
 * company on every release, trading a rare bug for a constant one. It is fixed
 * at the point of read instead, by validating the shape and discarding only what
 * genuinely doesn't match (see `deserializeCart`, `readStoredCompany`, and the
 * `isUserHint` guard `AuthContext` already had). Shapes then self-heal on any
 * release without a version constant anyone has to remember to bump.
 *
 * Never add live state to `CACHE_KEY_PREFIXES` — only data the app can refetch.
 */

/** Bumped automatically: injected from package.json by next.config.ts. */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

const VERSION_KEY = 'propeller_app_version';

/**
 * Keys holding refetchable data only. Prefix-matched, so every language /
 * category / user variant of a cache entry goes at once.
 */
const CACHE_KEY_PREFIXES = [
  'propeller_menu_', // useMenu's category tree (package-owned key)
];

/**
 * Keys written by builds that no longer exist. Removed unconditionally so they
 * stop occupying the origin's storage quota forever.
 *
 * `menuData` was `lib/services/MenuService.ts`, deleted in 1.11.5 — the module
 * is gone but the entry it wrote is still sitting in every returning user's
 * browser.
 */
const ORPHANED_KEYS = ['menuData'];

let done = false;

/**
 * Drops caches written by a previous build, plus any known orphaned keys.
 *
 * Idempotent and safe to call from anywhere; only the first call in a document
 * does work. No-op during SSR.
 */
export function reconcileClientStorage(): void {
  if (done || typeof window === 'undefined') return;
  done = true;

  try {
    for (const key of ORPHANED_KEYS) localStorage.removeItem(key);

    const seen = localStorage.getItem(VERSION_KEY);
    if (seen === APP_VERSION) return;

    // Object.keys() is a snapshot, so removing while iterating is safe.
    for (const key of Object.keys(localStorage)) {
      if (CACHE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }

    localStorage.setItem(VERSION_KEY, APP_VERSION);
  } catch {
    // Private mode / quota / disabled storage — a stale cache is survivable,
    // a crash on boot is not.
  }
}

// ponytail: module side-effect rather than a <Reconciler /> component, because
// the providers read localStorage in their useState initialisers — by the time
// any component effect ran, the stale value would already be in React state.
// Imports are evaluated before component code, so importing this module from
// AuthContext (the outermost storage reader) is what guarantees the ordering.
reconcileClientStorage();
