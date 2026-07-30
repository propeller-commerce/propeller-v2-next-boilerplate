/**
 * Server-side PunchOut wiring (OCI + cXML).
 *
 * The heavy lifting — parsing/building the wire formats and mapping the cart to
 * the ERP's fields — lives in `@propeller-commerce/propeller-v2-punchout` (pure,
 * SDK-free). This module owns the app-specific glue: enabling flag, the admin
 * SDK client that mints magic tokens, the cXML buyer-credential lookup, and the
 * config → mapping bridge.
 *
 * Server-only. Never import from a client component.
 */

import 'server-only';

import {
  GraphQLClient,
  type GraphQLClientConfig,
  MagicTokenService,
  AttributeService,
} from '@propeller-commerce/propeller-sdk-v2';
import { validateSharedSecret, type Mapping } from '@propeller-commerce/propeller-v2-punchout';
import { config } from '@/data/config';
import { readAttributeStringValues } from '@/lib/machines';

export const PUNCHOUT_COOKIE = 'punchout';
/** Non-httpOnly companion flag so the client cart page can show the transfer button. */
export const PUNCHOUT_FLAG_COOKIE = 'punchout_active';

export interface PunchoutSession {
  mode: 'oci' | 'cxml';
  /** ERP return address: HOOK_URL (OCI) / BrowserFormPost URL (cXML). */
  returnUrl: string;
  target: string;
  session: Record<string, string>;
  buyerCookie?: string;
  from?: string;
  to?: string;
  deploymentMode?: string;
}

/** Contact track attribute holding the cXML shared secret (backend side). */
const CXML_SHARED_SECRET_ATTR = 'CXML_SHARED_SECRET';

/** Master switch — a shop without punchout keeps every route 404/disabled. */
export function isPunchoutEnabled(): boolean {
  return (process.env.PUNCHOUT_ENABLED || '').trim().toLowerCase() === 'true';
}

/**
 * Debug mode — the transfer route renders a readable OCI/cXML preview page (the
 * plugin's `oci_results`/`cxml_results` sink) instead of auto-POSTing to the
 * ERP, and leaves the cart intact so it's re-testable.
 */
export function isPunchoutDebug(): boolean {
  return (process.env.PUNCHOUT_DEBUG || '').trim().toLowerCase() === 'true';
}

/**
 * `magicTokenCreate` is admin-gated (the 403 we hit during magic-token work).
 * Route it through the order-editor key by adding it to the editor mutation set
 * (same trick `lib/msp.ts` uses for paymentCreate). REPLACES the SDK default
 * list, so the defaults are repeated.
 */
const PUNCHOUT_ORDER_EDITOR_MUTATIONS = [
  'orderSetStatus',
  'passwordResetLink',
  'triggerQuoteSendRequest',
  'triggerOrderSendConfirm',
  'magicTokenCreate',
];

function createPunchoutAdminClient(): GraphQLClient {
  // PunchOut setup is a privileged server flow: it reads ANOTHER contact's
  // CXML_SHARED_SECRET (a query, authenticated by `apiKey`) and mints a magic
  // token (an admin-gated mutation, authenticated by `orderEditorApiKey`). Both
  // need elevated rights, so the order-editor key drives the whole client
  // (falling back to the general key if unset). This also sidesteps a stale
  // general BOILERPLATE_API_KEY, which the read would otherwise 401 on.
  const adminKey =
    process.env.BOILERPLATE_ORDER_EDITOR_API_KEY || process.env.BOILERPLATE_API_KEY || '';
  const cfg: GraphQLClientConfig = {
    endpoint: process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '',
    apiKey: adminKey,
    orderEditorApiKey: adminKey,
    securityMode: 'direct',
    timeout: 30000,
    orderEditorMutations: PUNCHOUT_ORDER_EDITOR_MUTATIONS,
  };
  return new GraphQLClient(cfg);
}

/** One hour, in ms — the punchout magic token's lifetime. */
const PUNCHOUT_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Mint a magic token for the buyer contact (cXML setup handoff). One-time use
 * and expiring 1h from creation, so a leaked/replayed StartPage link is inert
 * after a single sign-in or an hour, whichever comes first.
 */
export async function createPunchoutMagicToken(contactId: number): Promise<string> {
  const svc = new MagicTokenService(createPunchoutAdminClient());
  const expiresAt = new Date(Date.now() + PUNCHOUT_TOKEN_TTL_MS).toISOString();
  const token = await svc.createMagicToken({ contactId, oneTimeUse: true, expiresAt });
  return token.id;
}

/**
 * Resolve an inbound cXML request to its buyer contact, mirroring the WP plugin
 * (`CxmlTrait::handlePunchOutSetupRequest` + `validatePunchoutCredentials`).
 *
 * `CXML_CONTACT_ID` (CSV, = the plugin's `PROPELLER_CXML_CONTACT_ID`) lists the
 * candidate buyer contacts. For each we read the `CXML_SHARED_SECRET`
 * contact track attribute from the GraphQL API and constant-time compare it to
 * the request's SharedSecret — the SECRET identifies the buyer (the Sender
 * Identity is ignored, exactly as the plugin does). Returns the matching
 * contactId (whose reusable magic token we then mint).
 */
export async function resolveCxmlBuyer(sharedSecret: string): Promise<{ contactId: number } | null> {
  if (!sharedSecret) return null;
  const ids = (process.env.CXML_CONTACT_ID || '')
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
  if (ids.length === 0) return null;

  const svc = new AttributeService(createPunchoutAdminClient());
  for (const contactId of ids) {
    try {
      const res = await svc.getAttributeResultByContactId({
        contactId,
        input: { page: 1, offset: 50 },
      });
      const item = res.items?.find((i) => i.attributeDescription?.name === CXML_SHARED_SECRET_ATTR);
      const stored = readAttributeStringValues(item?.value)[0];
      if (stored && validateSharedSecret(sharedSecret, stored)) return { contactId };
    } catch {
      // Try the next candidate — a missing/forbidden contact shouldn't abort.
    }
  }
  return null;
}

type PunchoutConfig = {
  currency?: string;
  transferTarget?: string;
  freshCartOnEntry?: boolean;
  ociMapping?: Partial<Mapping>;
  cxmlMapping?: Partial<Mapping>;
};

function punchoutConfig(): PunchoutConfig {
  return (config as { punchout?: PunchoutConfig }).punchout ?? {};
}

export function punchoutCurrency(): string {
  return punchoutConfig().currency || config.currencyCode || 'EUR';
}
export function punchoutTarget(): string {
  return punchoutConfig().transferTarget || '_self';
}
export function ociMapping(): Partial<Mapping> {
  return punchoutConfig().ociMapping ?? {};
}
export function cxmlMapping(): Partial<Mapping> {
  return punchoutConfig().cxmlMapping ?? {};
}
