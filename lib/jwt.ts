/**
 * Minimal, dependency-free JWT structural checks for the server-side proxy.
 *
 * We do NOT verify the signature here — the upstream GraphQL API is the
 * authority on token validity, and it re-checks every call. These helpers
 * exist only so server code can distinguish a real, non-expired token from
 * raw cookie presence (a forgeable "I have *some* access_token value"
 * signal) without pulling in a JWT library.
 */

interface JwtPayload {
  exp?: number;
  [k: string]: unknown;
}

function decodeSegment(seg: string): JwtPayload | null {
  try {
    // base64url → base64, then decode. Buffer is available in Node runtimes.
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as JwtPayload) : null;
  } catch {
    return null;
  }
}

/**
 * True when `token` at least parses as a JWT (3 dot-separated segments with a
 * decodable JSON payload) and, if it carries an `exp`, has not expired.
 * Signature is intentionally NOT verified — see file header.
 */
export function looksLikeValidJwt(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const payload = decodeSegment(parts[1]);
  if (!payload) return false;
  if (typeof payload.exp === 'number') {
    // exp is seconds since epoch.
    return payload.exp * 1000 > Date.now();
  }
  // No exp claim — structurally a JWT, can't prove expiry, treat as plausible.
  return true;
}
