export const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

export interface RecaptchaConfig {
  secret: string;
  minScore: number;
}

export type RecaptchaResult = 'ok' | 'failed' | 'unavailable';

// Enabled only when both the secret and the public site key are set.
export function recaptchaConfig(env: Record<string, string | undefined>): RecaptchaConfig | null {
  const secret = env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret || !env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim()) return null;
  const parsed = Number.parseFloat(env.RECAPTCHA_MIN_SCORE ?? '');
  return { secret, minScore: Number.isFinite(parsed) ? parsed : 0.5 };
}

export async function verifyRecaptcha(opts: {
  token: unknown;
  action: string;
  remoteIp: string;
  config: RecaptchaConfig;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): Promise<RecaptchaResult> {
  if (typeof opts.token !== 'string' || !opts.token) return 'failed';

  const form = new URLSearchParams({ secret: opts.config.secret, response: opts.token });
  if (opts.remoteIp && opts.remoteIp !== 'unknown') form.set('remoteip', opts.remoteIp);

  let data: { success?: unknown; score?: unknown; action?: unknown };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('reCAPTCHA timeout')), opts.timeoutMs ?? 5000);
  try {
    const res = await (opts.fetch ?? fetch)(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: controller.signal,
    });
    if (!res.ok) return 'unavailable';
    data = await res.json();
  } catch {
    return 'unavailable';
  } finally {
    clearTimeout(timer);
  }

  const passed =
    data?.success === true &&
    typeof data.score === 'number' &&
    data.score >= opts.config.minScore &&
    data.action === opts.action;
  return passed ? 'ok' : 'failed';
}
