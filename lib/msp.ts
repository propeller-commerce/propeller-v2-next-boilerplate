/**
 * Server-side MultiSafepay provider wiring.
 *
 * Hosts a single `MspProvider` for the app's payment flow — the MultiSafepay
 * sibling of `lib/mollie.ts`. Like `lib/server.ts`, the wiring is
 * application-specific: we build the Propeller SDK client from the boilerplate's
 * env contract (the same `direct`-mode client used for SSR, with the
 * order-editor key the webhook needs) and read the MultiSafepay keys + mode from
 * env.
 *
 * Used by:
 *   - `app/api/msp/create-payment/route.ts` — start a payment at checkout.
 *   - `app/api/msp/webhook/route.ts`        — reconcile state from MultiSafepay.
 *
 * Server-only. Never import from a client component.
 */

import 'server-only';

import { MspProvider } from '@propeller-commerce/propeller-v2-msp';
import { GraphQLClient, type GraphQLClientConfig } from '@propeller-commerce/propeller-sdk-v2';

/**
 * Mutations the backend gates behind the order-editor API key. In `direct`
 * mode the SDK routes these to `orderEditorApiKey` instead of `apiKey`.
 *
 * Identical to the Mollie flow's set: the SDK's built-in list (orderSetStatus,
 * passwordResetLink, triggerQuoteSendRequest, triggerOrderSendConfirm) does NOT
 * include the payment mutations, but our backend requires the order-editor key
 * for them too — otherwise `paymentCreate`/`paymentUpdate` 403 with "Forbidden
 * resource". `orderEditorMutations` REPLACES the default list, so we include the
 * defaults plus the payment mutations.
 */
const MSP_ORDER_EDITOR_MUTATIONS = [
  // SDK defaults (must be repeated — this option replaces, not extends):
  'orderSetStatus',
  'passwordResetLink',
  'triggerQuoteSendRequest',
  'triggerOrderSendConfirm',
  // Payment mutations the MultiSafepay flow issues, gated the same way:
  'paymentCreate',
  'paymentUpdate',
];

/**
 * Build the Propeller SDK client the MultiSafepay flow uses. Server-to-server
 * (`direct` mode) with the order-editor key — and with the payment mutations
 * added to the order-editor set so they authenticate with that key. No bearer
 * token: these run as the server, not a logged-in user.
 */
function createMspGraphqlClient(): GraphQLClient {
  const config: GraphQLClientConfig = {
    endpoint: process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '',
    apiKey: process.env.BOILERPLATE_API_KEY || '',
    orderEditorApiKey: process.env.BOILERPLATE_ORDER_EDITOR_API_KEY || '',
    securityMode: 'direct',
    timeout: 30000,
    orderEditorMutations: MSP_ORDER_EDITOR_MUTATIONS,
  };
  return new GraphQLClient(config);
}

/**
 * Whether MultiSafepay is the active payment provider. Gated so a shop without
 * MSP keys keeps the previous "place order → straight to thank-you" behaviour.
 * Set `PAYMENT_PROVIDER=multisafepay` (server) to turn it on. Only one PSP is
 * active at a time (this and `isMollieEnabled` are mutually exclusive).
 */
export function isMspEnabled(): boolean {
  return (process.env.PAYMENT_PROVIDER || '').trim().toLowerCase() === 'multisafepay';
}

/** Public origin of this site, used to build redirect + webhook URLs. */
function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || '';
  return raw.replace(/\/$/, '');
}

/**
 * Absolute URL MultiSafepay POSTs notifications to. Must be publicly reachable
 * over HTTPS (MultiSafepay can't reach localhost/LAN IPs).
 *
 * Prefers an explicit `MSP_WEBHOOK_URL` override so the webhook can point at a
 * tunnel (cloudflared / ngrok) while the shopper-facing redirect stays on the
 * normal `NEXT_PUBLIC_SITE_URL`. If the override is just an origin (no path), we
 * append `/api/msp/webhook`; if it already includes a path, it's used as-is.
 * Falls back to `NEXT_PUBLIC_SITE_URL` + the route path.
 */
export function mspWebhookUrl(): string {
  const override = (process.env.MSP_WEBHOOK_URL || '').trim();
  if (override) {
    return /\/api\/msp\/webhook\/?$/.test(override)
      ? override
      : `${override.replace(/\/$/, '')}/api/msp/webhook`;
  }
  return `${siteOrigin()}/api/msp/webhook`;
}

/**
 * Build a fresh `MspProvider`.
 *
 * A new instance per request is fine (cheap): the client is a thin fetch
 * wrapper. The provider needs no auth cookie — its mutations run with the server
 * `BOILERPLATE_API_KEY` / `…_ORDER_EDITOR_API_KEY`, so we don't pass a bearer
 * token.
 *
 * @throws if MSP keys are missing (caller should guard with `isMspEnabled`).
 */
export function getMspProvider(): MspProvider {
  const liveApiKey = process.env.MSP_LIVE_KEY || '';
  const testApiKey = process.env.MSP_TEST_KEY || '';
  const testMode = (process.env.MSP_TEST_MODE || 'true').trim().toLowerCase() === 'true';

  return new MspProvider(
    { liveApiKey, testApiKey, testMode },
    {
      // `direct`-mode client whose order-editor set includes paymentCreate/
      // paymentUpdate, so all of MultiSafepay's mutations use the order-editor key.
      client: createMspGraphqlClient(),
      webhookUrl: mspWebhookUrl(),
    }
  );
}
