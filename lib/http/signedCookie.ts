import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * HMAC-signed cookie values (last order, registration company, punchout session, ...).
 *
 * Key: `COOKIE_SIGNING_SECRET`. Unset, a key is derived from the order-editor API key
 * (`HMAC-SHA256(BOILERPLATE_ORDER_EDITOR_API_KEY, 'propeller-cookie-signing:v1')`) with one
 * warning, so existing deployments keep working; the API key itself is never the HMAC key.
 *
 * Signed form: `<value>.<expiry, unix seconds>.<base64url mac>`. The mac covers a per-purpose
 * label, so a cookie minted for one purpose never verifies as another.
 */

const DERIVATION_LABEL = 'propeller-cookie-signing:v1';
// Cookie-safe without encoding; JSON goes through signCookieJson (base64url).
const SAFE_VALUE = /^[A-Za-z0-9._~-]*$/;

/** Reads COOKIE_SIGNING_SECRET and BOILERPLATE_ORDER_EDITOR_API_KEY. */
export type SigningEnv = Record<string, string | undefined>;

export interface SignOptions {
  /** Overrides the env key (tests). */
  key?: Buffer | string;
  /** Milliseconds since epoch (tests). */
  now?: number;
}

/** The signing key from an env, and whether it was derived; null when neither variable is set. */
export function resolveCookieSigningKey(env: SigningEnv): { key: Buffer; derived: boolean } | null {
  const secret = env.COOKIE_SIGNING_SECRET?.trim();
  if (secret) return { key: Buffer.from(secret, 'utf8'), derived: false };
  const apiKey = env.BOILERPLATE_ORDER_EDITOR_API_KEY?.trim();
  if (!apiKey) return null;
  return { key: createHmac('sha256', apiKey).update(DERIVATION_LABEL).digest(), derived: true };
}

let processKey: Buffer | null | undefined;

function signingKey(opts: SignOptions): Buffer | null {
  if (opts.key !== undefined) return typeof opts.key === 'string' ? Buffer.from(opts.key, 'utf8') : opts.key;
  if (processKey === undefined) {
    const resolved = resolveCookieSigningKey(process.env);
    if (resolved?.derived) {
      console.warn(
        '[signedCookie] COOKIE_SIGNING_SECRET is not set; deriving the cookie signing key from the order-editor API key. Set a dedicated secret (openssl rand -hex 32).',
      );
    }
    processKey = resolved?.key ?? null;
  }
  return processKey;
}

/** Whether cookies can be signed in this process (COOKIE_SIGNING_SECRET or the order-editor key is set). */
export function canSignCookies(): boolean {
  return signingKey({}) !== null;
}

function mac(key: Buffer, purpose: string, exp: number, value: string): string {
  return createHmac('sha256', key).update(`${purpose}\n${exp}\n${value}`).digest('base64url');
}

/**
 * `value` signed for `purpose`, valid for `maxAgeSeconds`; null when no key is configured.
 * Throws on a value that isn't cookie-safe (`[A-Za-z0-9._~-]`).
 */
export function signCookieValue(
  purpose: string,
  value: string,
  maxAgeSeconds: number,
  opts: SignOptions = {},
): string | null {
  if (!SAFE_VALUE.test(value)) throw new Error('signCookieValue: value must be cookie-safe');
  const key = signingKey(opts);
  if (!key) return null;
  const exp = Math.floor((opts.now ?? Date.now()) / 1000) + maxAgeSeconds;
  return `${value}.${exp}.${mac(key, purpose, exp, value)}`;
}

/** The value when `signed` was signed for `purpose` with this key and hasn't expired, else null. */
export function verifyCookieValue(
  purpose: string,
  signed: string | null | undefined,
  opts: SignOptions = {},
): string | null {
  if (!signed) return null;
  const key = signingKey(opts);
  if (!key) return null;
  const match = /^([A-Za-z0-9._~-]*)\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(signed);
  if (!match) return null;
  const [, value, expRaw, given] = match;
  const exp = Number(expRaw);
  const expected = Buffer.from(mac(key, purpose, exp, value), 'utf8');
  if (!timingSafeEqual(expected, Buffer.from(given, 'utf8'))) return null;
  return exp * 1000 > (opts.now ?? Date.now()) ? value : null;
}

/** `data` as JSON, base64url-encoded and signed for `purpose`; null when no key is configured. */
export function signCookieJson(purpose: string, data: unknown, maxAgeSeconds: number, opts: SignOptions = {}): string | null {
  return signCookieValue(purpose, Buffer.from(JSON.stringify(data), 'utf8').toString('base64url'), maxAgeSeconds, opts);
}

/** The JSON signed by signCookieJson for `purpose`, else null. The shape is the caller's to check. */
export function verifyCookieJson<T = unknown>(purpose: string, signed: string | null | undefined, opts: SignOptions = {}): T | null {
  const value = verifyCookieValue(purpose, signed, opts);
  if (value === null) return null;
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
