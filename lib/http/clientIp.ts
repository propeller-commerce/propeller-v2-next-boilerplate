// First x-forwarded-for hop, then x-real-ip, else 'unknown' (spoofable; fine for rate limiting).
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  const xri = headers.get('x-real-ip')?.trim();
  return xri || 'unknown';
}
