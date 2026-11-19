import { createHash } from 'node:crypto';
import type { DocumentNode } from 'graphql';
import { signCookieJson, verifyCookieJson, type SignOptions } from '../http/signedCookie.ts';
import { readSingleField, resolveArgument } from '../graphql/orderEditorRouting.ts';

/**
 * PunchOut session cookies (#20).
 *
 * `/api/punchout/enter` no longer activates a session by itself: it stores a
 * signed, short-lived *pending* cookie bound to sha256(mtoken). The GraphQL
 * proxy promotes it to the signed *active* `punchout` cookie only when it sees
 * a successful `magicTokenLogin` for that same token, and binds the active
 * cookie to sha256 of the access token that exchange produced. A later login
 * with any other token (`/api/auth/session`) clears it, and so do logout and a
 * failed exchange. The return URL must be https and, when `PUNCHOUT_HOOK_HOSTS`
 * is set, on one of those hosts; it is checked again before every transfer.
 */

export const PUNCHOUT_COOKIE = 'punchout';
/** Non-httpOnly companion flag so the client cart page can show the transfer button. */
export const PUNCHOUT_FLAG_COOKIE = 'punchout_active';
export const PUNCHOUT_PENDING_COOKIE = 'punchout_pending';

export const PUNCHOUT_MAX_AGE = 60 * 60;
// enter → magic-login → exchange happens within seconds.
export const PUNCHOUT_PENDING_MAX_AGE = 10 * 60;
// The cXML StartPage link lives as long as the magic token it carries.
export const PUNCHOUT_CXML_START_MAX_AGE = 60 * 60;

export interface PunchoutSession {
  mode: 'oci' | 'cxml';
  /** ERP return address: HOOK_URL (OCI) / BrowserFormPost URL (cXML). */
  returnUrl: string;
  target: string;
  session: Record<string, string>;
  buyerCookie?: string;
  from?: string;
  to?: string;
  deploymentMode?: string;
}

/** What cXML setup hands to enter, server-signed (never read from plain query parameters). */
export interface CxmlStart {
  returnUrl: string;
  buyerCookie?: string;
  from?: string;
  to?: string;
  deploymentMode?: string;
}

export const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

/**
 * A return URL the cart may be posted to: https, no credentials, and on a host
 * listed in `hosts` (comma-separated `PUNCHOUT_HOOK_HOSTS`) when that is set.
 */
export function isAllowedHookUrl(raw: unknown, hosts: string | undefined = process.env.PUNCHOUT_HOOK_HOSTS): raw is string {
  if (typeof raw !== 'string' || !raw) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password) return false;
  const allowed = (hosts || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return !allowed.length || allowed.includes(url.hostname.toLowerCase());
}

const isSession = (s: unknown): s is PunchoutSession =>
  !!s &&
  typeof s === 'object' &&
  ((s as PunchoutSession).mode === 'oci' || (s as PunchoutSession).mode === 'cxml') &&
  isAllowedHookUrl((s as PunchoutSession).returnUrl);

/** Pending cookie value for `session`, bound to the magic token; null without a signing key. */
export function signPending(mtoken: string, session: PunchoutSession, opts?: SignOptions): string | null {
  return signCookieJson('punchout-pending', { t: sha256(mtoken), s: session }, PUNCHOUT_PENDING_MAX_AGE, opts);
}

/**
 * The active cookie value when `exchangedToken` is the very token the pending
 * entry was bound to; bound in turn to the access token the exchange returned.
 */
export function promotePending(
  pending: string | undefined,
  exchangedToken: string,
  accessToken: string,
  opts?: SignOptions,
): { value: string; mode: PunchoutSession['mode'] } | null {
  const p = verifyCookieJson<{ t?: unknown; s?: unknown }>('punchout-pending', pending, opts);
  if (!p || p.t !== sha256(exchangedToken) || !isSession(p.s) || !accessToken) return null;
  const value = signCookieJson('punchout', { s: p.s, a: sha256(accessToken) }, PUNCHOUT_MAX_AGE, opts);
  return value ? { value, mode: p.s.mode } : null;
}

/** The active punchout session, or null (missing, tampered, expired, or a return URL no longer allowed). */
export function verifyActive(cookie: string | undefined, opts?: SignOptions): { session: PunchoutSession; access: string } | null {
  const v = verifyCookieJson<{ s?: unknown; a?: unknown }>('punchout', cookie, opts);
  return v && isSession(v.s) && typeof v.a === 'string' ? { session: v.s, access: v.a } : null;
}

/** Whether a login with `accessToken` keeps the active session: only the one the token exchange produced. */
export function keepsPunchout(activeCookie: string | undefined, accessToken: string, opts?: SignOptions): boolean {
  return verifyActive(activeCookie, opts)?.access === sha256(accessToken);
}

/** Signed `cxml` parameter for the StartPage URL, bound to the token it carries. */
export function signCxmlStart(mtoken: string, data: CxmlStart, opts?: SignOptions): string | null {
  return signCookieJson('punchout-cxml', { t: sha256(mtoken), d: data }, PUNCHOUT_CXML_START_MAX_AGE, opts);
}

/** The cXML setup data when `value` was signed by setup for this `mtoken`, else null. */
export function verifyCxmlStart(value: string | null | undefined, mtoken: string, opts?: SignOptions): CxmlStart | null {
  const v = verifyCookieJson<{ t?: unknown; d?: CxmlStart }>('punchout-cxml', value, opts);
  return v && v.t === sha256(mtoken) && v.d && isAllowedHookUrl(v.d.returnUrl) ? v.d : null;
}

/**
 * For a proxied `magicTokenLogin` mutation: the token it exchanged and, when the
 * exchange succeeded, the access token it returned. Null for any other document.
 */
export function magicTokenExchange(
  doc: DocumentNode | null,
  variables: unknown,
  response: unknown,
): { token: string; accessToken: string | null } | null {
  const single = readSingleField(doc);
  if (!single || single.operation !== 'mutation' || single.field.name.value !== 'magicTokenLogin') return null;
  const token = resolveArgument(single, 'id', variables);
  if (typeof token !== 'string' || !token) return null;
  const key = single.field.alias?.value ?? 'magicTokenLogin';
  const data = (response as { data?: Record<string, { session?: { accessToken?: unknown } } | null> | null } | null)?.data;
  const accessToken = data?.[key]?.session?.accessToken;
  return { token, accessToken: typeof accessToken === 'string' && accessToken ? accessToken : null };
}

interface CookieWriter {
  cookies: {
    set(name: string, value: string, options: { path: string; maxAge: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'lax' }): unknown;
  };
}

const cookieOptions = (maxAge: number, httpOnly = true) => ({
  path: '/',
  maxAge,
  httpOnly,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
});

/** Expire the active session cookies, and the pending one unless `keepPending`. */
export function clearPunchoutCookies(res: CookieWriter, { keepPending = false } = {}): void {
  res.cookies.set(PUNCHOUT_COOKIE, '', cookieOptions(0));
  res.cookies.set(PUNCHOUT_FLAG_COOKIE, '', cookieOptions(0, false));
  if (!keepPending) res.cookies.set(PUNCHOUT_PENDING_COOKIE, '', cookieOptions(0));
}

export function setPendingCookie(res: CookieWriter, value: string): void {
  res.cookies.set(PUNCHOUT_PENDING_COOKIE, value, cookieOptions(PUNCHOUT_PENDING_MAX_AGE));
}

/** The promoted session: the signed httpOnly cookie, the readable flag, and the pending cookie gone. */
export function setActiveCookies(res: CookieWriter, promoted: { value: string; mode: string }): void {
  res.cookies.set(PUNCHOUT_COOKIE, promoted.value, cookieOptions(PUNCHOUT_MAX_AGE));
  res.cookies.set(PUNCHOUT_FLAG_COOKIE, promoted.mode, cookieOptions(PUNCHOUT_MAX_AGE, false));
  res.cookies.set(PUNCHOUT_PENDING_COOKIE, '', cookieOptions(0));
}
