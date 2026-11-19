// Proxies in front of the app that append to x-forwarded-for (nginx: 1; add one per CDN/load balancer,
// e.g. 2 for Cloudflare in front of nginx). Only those proxies may reach the Next port: a client that
// connects directly writes the whole header itself.
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);

/**
 * The client address for rate limiting: the x-forwarded-for entry our own proxy added
 * (`trustedHops` from the right); entries further left are client-supplied and spoofable.
 * Without x-forwarded-for: 'unknown'. Not x-real-ip or cf-connecting-ip: without that proxy in
 * front a client sets them too. Route handlers don't expose the socket address.
 */
export function clientIp(headers: Headers, trustedHops: number = TRUSTED_PROXY_HOPS): string {
  const hops = (headers.get('x-forwarded-for') || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  if (hops.length) return hops[Math.max(0, hops.length - trustedHops)];
  return 'unknown';
}
