/**
 * Payment-method classification shared by client + server.
 *
 * "On-account" methods (e.g. REKENING, ON_ACCOUNT) are settled outside the PSP
 * — the order is placed straight to NEW with no Mollie hand-off. Every other
 * method goes through Mollie, where the order starts as UNFINISHED and the
 * webhook later promotes it based on the Mollie payment state.
 *
 * The list is configured via env:
 *   - `ON_ACCOUNT_PAYMENTS`            — server (route handlers, lib/mollie)
 *   - `NEXT_PUBLIC_ON_ACCOUNT_PAYMENTS`— client (the checkout page)
 * Comma-separated, case-insensitive. Keep the two in sync. Defaults to
 * `REKENING,ON_ACCOUNT` when unset.
 *
 * No `'server-only'` here on purpose — the checkout client component imports
 * this to decide the order status + whether to start a Mollie payment.
 */

const DEFAULT_ON_ACCOUNT = ['REKENING', 'ON_ACCOUNT'];

/** Parse the configured on-account method codes, upper-cased and trimmed. */
export function onAccountMethods(): string[] {
  // Prefer the public mirror (available on both client and server); fall back
  // to the server var (route handlers), then the default.
  const raw =
    process.env.NEXT_PUBLIC_ON_ACCOUNT_PAYMENTS ??
    process.env.ON_ACCOUNT_PAYMENTS ??
    '';
  const list = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return list.length > 0 ? list : DEFAULT_ON_ACCOUNT;
}

/**
 * Whether a payment-method code settles "on account" (no PSP). Comparison is
 * case-insensitive.
 *
 * Used to decide both the placement order status (on-account → NEW; PSP →
 * UNFINISHED until the webhook resolves it) and whether to start a Mollie
 * payment at all. The full decision (which also accounts for whether Mollie is
 * enabled and quote mode) lives in the checkout page.
 */
export function isOnAccountMethod(method: string | undefined | null): boolean {
  if (!method) return false;
  return onAccountMethods().includes(method.trim().toUpperCase());
}
