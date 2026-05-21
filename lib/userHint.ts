/**
 * userHint — the thin, non-sensitive user shape kept in localStorage.
 *
 * Why this exists: the JWT was moved out of localStorage into an httpOnly
 * cookie (Phase 5), but the full `Contact` / `Customer` object was still
 * cached in `localStorage['user']` as a render hint. That object carries
 * real PII — full name, email, phone, every address, the whole company
 * tree, purchase-authorization configs — and anything that can run a line
 * of script in the page (an XSS) can read all of it.
 *
 * Phase A-bis slims that cache to the handful of fields actually needed
 * for instant first paint while the real profile is fetched:
 *
 *   - `userId`     — to know *who* without another round-trip.
 *   - `type`       — 'contact' | 'customer', drives role-dependent UI.
 *   - `firstName`  — the header greeting ("Hi, Ada").
 *   - `lastName`   — the header greeting / initials.
 *   - `companyId`  — the active company, so company-scoped UI can paint
 *                    without waiting (the full company object still
 *                    arrives with the getViewer() result).
 *
 * Everything else (addresses, PA configs, the company tree, email,
 * phone) is NOT cached. The full `Contact` / `Customer` is fetched fresh
 * via `getViewer()` on every mount and lives only in React state for the
 * lifetime of the page — never serialized to disk.
 */

import type { Contact, Customer } from 'propeller-sdk-v2';

export interface UserHint {
  userId: number;
  type: 'contact' | 'customer';
  firstName: string;
  lastName: string;
  companyId?: number;
}

/**
 * Extract the thin hint from a full Contact/Customer. Returns `null` when
 * there is no user or no identifying id (nothing worth caching).
 */
export function pickUserHint(user: Contact | Customer | null | undefined): UserHint | null {
  if (!user) return null;

  if ('contactId' in user && user.contactId) {
    return {
      userId: user.contactId,
      type: 'contact',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      companyId: user.company?.companyId,
    };
  }

  if ('customerId' in user && user.customerId) {
    return {
      userId: user.customerId,
      type: 'customer',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      // Customers have no company in this model.
      companyId: undefined,
    };
  }

  return null;
}

/**
 * Runtime guard for a value read back out of localStorage — rejects
 * anything that is not a well-formed UserHint (stale shapes from before
 * this change, tampered storage, etc.).
 */
export function isUserHint(value: unknown): value is UserHint {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === 'number' &&
    (v.type === 'contact' || v.type === 'customer') &&
    typeof v.firstName === 'string' &&
    typeof v.lastName === 'string' &&
    (v.companyId === undefined || typeof v.companyId === 'number')
  );
}
