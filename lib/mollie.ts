/**
 * Server-side Mollie provider wiring.
 *
 * Hosts a single `MollieProvider` for the app's payment flow. Like `lib/server.ts`,
 * the wiring is application-specific: we build the Propeller SDK client from the
 * boilerplate's env contract (the same `direct`-mode client used for SSR, with
 * the order-editor key the webhook needs) and read the Mollie keys + mode from
 * env.
 *
 * Used by:
 *   - `app/api/mollie/create-payment/route.ts` — start a payment at checkout.
 *   - `app/api/mollie/webhook/route.ts`        — reconcile state from Mollie.
 *
 * Server-only. Never import from a client component.
 */

import 'server-only';

import { MollieProvider } from '@propeller-commerce/propeller-v2-mollie';
import { createServerClient } from '@/lib/server';

/**
 * Whether Mollie is the active payment provider. Gated so a shop without Mollie
 * keys keeps the previous "place order → straight to thank-you" behaviour.
 * Set `PAYMENT_PROVIDER=mollie` (server) to turn it on.
 */
export function isMollieEnabled(): boolean {
  return (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'mollie';
}

/** Public origin of this site, used to build redirect + webhook URLs. */
function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || '';
  return raw.replace(/\/$/, '');
}

/**
 * Absolute URL Mollie POSTs webhooks to. Must be publicly reachable over HTTPS
 * (Mollie can't reach localhost/LAN IPs).
 *
 * Prefers an explicit `MOLLIE_WEBHOOK_URL` override so the webhook can point at
 * a tunnel (ngrok / cloudflared) while the shopper-facing redirect stays on the
 * normal `NEXT_PUBLIC_SITE_URL`. If the override is just an origin (no path), we
 * append `/api/mollie/webhook`; if it already includes a path, it's used as-is.
 * Falls back to `NEXT_PUBLIC_SITE_URL` + the route path.
 */
export function mollieWebhookUrl(): string {
  const override = (process.env.MOLLIE_WEBHOOK_URL || '').trim();
  if (override) {
    // If the override already targets the webhook path, use it verbatim;
    // otherwise treat it as an origin and append the route.
    return /\/api\/mollie\/webhook\/?$/.test(override)
      ? override
      : `${override.replace(/\/$/, '')}/api/mollie/webhook`;
  }
  return `${siteOrigin()}/api/mollie/webhook`;
}

/**
 * Build a fresh `MollieProvider`.
 *
 * A new instance per request is fine (cheap): `createServerClient()` returns a
 * fresh client anyway (it closes over a per-request cookie snapshot), and the
 * Mollie client is a thin HTTP wrapper. The provider needs no auth cookie — its
 * mutations run with the server `BOILERPLATE_API_KEY` / `…_ORDER_EDITOR_API_KEY`,
 * so we don't pass a bearer token.
 *
 * @throws if Mollie keys are missing (caller should guard with `isMollieEnabled`).
 */
export function getMollieProvider(): MollieProvider {
  const liveApiKey = process.env.MOLLIE_LIVE_KEY || '';
  const testApiKey = process.env.MOLLIE_TEST_KEY || '';
  const testMode = (process.env.MOLLIE_TEST_MODE || 'true').trim().toLowerCase() === 'true';

  return new MollieProvider(
    { liveApiKey, testApiKey, testMode },
    {
      // Server SDK client in `direct` mode — carries BOILERPLATE_ORDER_EDITOR_API_KEY,
      // which the webhook's order-status mutations require.
      client: createServerClient(),
      webhookUrl: mollieWebhookUrl(),
    }
  );
}
