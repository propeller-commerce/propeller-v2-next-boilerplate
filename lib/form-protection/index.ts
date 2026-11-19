import { clientIp } from '../http/clientIp.ts';
import { createRateLimiter, type RateLimiter } from './rateLimit.ts';
import { recaptchaConfig, verifyRecaptcha, type RecaptchaConfig } from '../recaptcha/verify.ts';

export interface FormPolicy {
  route: string;
  limit: number;
  windowMs: number;
  action: string;
}

const TEN_MINUTES = 10 * 60_000;

export const CONTACT_POLICY: FormPolicy = { route: 'contact', limit: 5, windowMs: TEN_MINUTES, action: 'contact' };
export const PRICE_REQUEST_POLICY: FormPolicy = {
  route: 'price-request',
  limit: 10,
  windowMs: TEN_MINUTES,
  action: 'price_request',
};

// Spare-part information requests (unauthenticated, mails the SPL inbox).
export const SPL_CONTACT_POLICY: FormPolicy = { route: 'spl-contact', limit: 5, windowMs: TEN_MINUTES, action: 'spl_contact' };
// Analytics beacons: a page sends a handful per minute.
export const TRACK_POLICY: FormPolicy = { route: 'track', limit: 120, windowMs: 60_000, action: 'track' };

/** Per email address: confirmation mails to one address, whatever IP the requests come from. */
export const EMAIL_DAILY_CAP = { limit: 3, windowMs: 24 * 60 * 60_000 };

export function emailCapKey(route: string, email: string): string {
  return `${route}:email:${email.trim().toLowerCase()}`;
}

export interface FormProtection {
  limiter: RateLimiter;
  recaptcha: RecaptchaConfig | null;
  fetch?: typeof fetch;
}

const sharedLimiter = createRateLimiter();

// Process-wide limiter plus reCAPTCHA settings from the environment.
export function formProtection(): FormProtection {
  return {
    limiter: sharedLimiter,
    recaptcha: recaptchaConfig({
      RECAPTCHA_SECRET_KEY: process.env.RECAPTCHA_SECRET_KEY,
      NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      RECAPTCHA_MIN_SCORE: process.env.RECAPTCHA_MIN_SCORE,
    }),
  };
}

export function rateLimitResponse(req: Request, policy: FormPolicy, protection: FormProtection): Response | null {
  const result = protection.limiter.hit(`${policy.route}:${clientIp(req.headers)}`, policy);
  if (result.ok) return null;
  return Response.json(
    { error: 'rate_limited' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
  );
}

/** 429 once `key` is over `rule`; for caps that don't depend on the client IP. */
export function capResponse(key: string, rule: { limit: number; windowMs: number }, protection: FormProtection): Response | null {
  const result = protection.limiter.hit(key, rule);
  if (result.ok) return null;
  return Response.json({ error: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(result.retryAfter) } });
}

export function isHoneypot(body: Record<string, unknown>): boolean {
  return typeof body.website === 'string' && body.website.length > 0;
}

export async function captchaResponse(
  req: Request,
  body: Record<string, unknown>,
  policy: FormPolicy,
  protection: FormProtection,
): Promise<Response | null> {
  if (!protection.recaptcha) return null;
  const result = await verifyRecaptcha({
    token: body.recaptchaToken,
    action: policy.action,
    remoteIp: clientIp(req.headers),
    config: protection.recaptcha,
    fetch: protection.fetch,
  });
  if (result === 'ok') return null;
  if (result === 'unavailable') {
    console.error(`[api/${policy.route}] reCAPTCHA verification unavailable`);
    return Response.json({ error: 'captcha_unavailable' }, { status: 503 });
  }
  return Response.json({ error: 'captcha_failed' }, { status: 400 });
}
