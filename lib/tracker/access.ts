import { createHash, timingSafeEqual } from 'node:crypto';

// Basic-auth gate for /tracker and /api/tracker: any user, password TRACKER_ACCESS_SECRET, unset = 404.

export const TRACKER_REALM = 'tracker';
export const TRACKER_CHALLENGE = `Basic realm="${TRACKER_REALM}", charset="UTF-8"`;

export type TrackerAccess = { ok: true } | { ok: false; status: 401 | 404 };

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

// Returns the password from a Basic header, or null when malformed.
function basicPassword(authorization: string | null | undefined): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Basic\s+(\S+)\s*$/i);
  if (!match) return null;
  const token = match[1];
  if (token.length % 4 !== 0 || !BASE64_RE.test(token)) return null;
  const decoded = Buffer.from(token, 'base64').toString('utf8');
  const colon = decoded.indexOf(':');
  if (colon < 0) return null;
  return decoded.slice(colon + 1);
}

// Constant-time compare on fixed-length digests.
function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest();
  const hb = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ha, hb);
}

export function checkTrackerAccess(
  authorization: string | null | undefined,
  secret: string | undefined = process.env.TRACKER_ACCESS_SECRET,
): TrackerAccess {
  if (!secret) return { ok: false, status: 404 };
  const password = basicPassword(authorization);
  if (password === null || !safeEqual(password, secret)) return { ok: false, status: 401 };
  return { ok: true };
}

/** Null when the request may proceed, else the 401/404 response to send. */
export function trackerGate(
  request: Request,
  secret: string | undefined = process.env.TRACKER_ACCESS_SECRET,
): Response | null {
  const access = checkTrackerAccess(request.headers.get('authorization'), secret);
  if (access.ok) return null;
  if (access.status === 404) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  return new Response('Authentication required', {
    status: 401,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'WWW-Authenticate': TRACKER_CHALLENGE,
    },
  });
}

/** True for /tracker[/...], /<locale>/tracker[/...] and /api/tracker[/...]. */
export function isTrackerPath(pathname: string, localePrefixes: readonly string[]): boolean {
  if (/^\/api\/tracker(\/|$)/.test(pathname)) return true;
  const match = pathname.match(/^\/([a-z]{2})(\/.*)$/);
  const bare = match && localePrefixes.includes(match[1]) ? match[2] : pathname;
  return /^\/tracker(\/|$)/.test(bare);
}
