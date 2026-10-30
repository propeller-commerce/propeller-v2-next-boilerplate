'use client';

interface Grecaptcha {
  ready(cb: () => void): void;
  execute(siteKey: string, opts: { action: string }): Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

// Literal access so Next inlines it at build time.
const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

let loading: Promise<Grecaptcha> | null = null;

export const recaptchaSiteKeySet = (): boolean => !!SITE_KEY;

// Injects api.js once; call when a protected form mounts.
export function loadRecaptcha(): Promise<Grecaptcha> | null {
  if (!SITE_KEY || typeof window === 'undefined') return null;
  if (loading) return loading;
  loading = new Promise<Grecaptcha>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
    script.async = true;
    script.onload = () => (window.grecaptcha ? resolve(window.grecaptcha) : reject(new Error('grecaptcha missing')));
    script.onerror = () => reject(new Error('reCAPTCHA failed to load'));
    document.head.appendChild(script);
  }).catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

// Token for the action, or undefined when reCAPTCHA is off or unreachable.
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  const pending = loadRecaptcha();
  if (!pending) return undefined;
  try {
    const g = await pending;
    return await new Promise<string>((resolve, reject) => {
      g.ready(() => {
        g.execute(SITE_KEY, { action }).then(resolve, reject);
      });
    });
  } catch {
    return undefined;
  }
}
