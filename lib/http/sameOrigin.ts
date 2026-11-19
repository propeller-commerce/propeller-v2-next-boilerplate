const hostOf = (url: string): string | null => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
};

/**
 * A request whose Origin, when sent, is the shop's own host: x-forwarded-host or host, or the configured
 * public site (`siteUrl`, for a proxy that forwards Host as localhost). Browsers send Origin on every POST;
 * without one it's a non-browser client, which can't carry a visitor's cookies.
 */
export function isSameOrigin(req: Request, siteUrl?: string): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const originHost = hostOf(origin);
  if (!originHost) return false;
  const allowed = [
    (req.headers.get('x-forwarded-host') || '').split(',')[0].trim().toLowerCase(),
    (req.headers.get('host') || '').trim().toLowerCase(),
    siteUrl ? hostOf(siteUrl) : null,
  ].filter(Boolean);
  return allowed.includes(originHost);
}

/**
 * A JSON request from the shop itself. Cross-site HTML forms can't send application/json
 * (that needs a CORS preflight we never allow), and the Origin must pass `isSameOrigin`.
 */
export function isSameOriginJson(req: Request, siteUrl?: string): boolean {
  const type = (req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  return type === 'application/json' && isSameOrigin(req, siteUrl);
}
