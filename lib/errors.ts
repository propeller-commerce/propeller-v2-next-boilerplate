/**
 * Classifies an SDK / GraphQL error string into a user-facing error kind.
 *
 * The SDK doesn't surface HTTP status cleanly through the proxy, so we
 * string-match the message — same pragmatic approach as
 * `lib/services/BaseApiService.ts` `handleApiError`. If the SDK changes
 * its wording, update the matchers here.
 *
 * Used by pages that fetch an order / resource by id and need to render a
 * friendly Not-Authorized / Not-Found view instead of leaking the raw
 * GraphQL error string.
 */
export type ApiErrorKind = 'forbidden' | 'not-found' | 'generic';

export function classifyApiError(error: unknown): ApiErrorKind {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : '';
  if (!message) return 'generic';
  const lower = message.toLowerCase();
  if (
    lower.includes('forbidden') ||
    lower.includes('403') ||
    lower.includes('access denied') ||
    lower.includes('unauthorized') ||
    lower.includes('401')
  ) {
    return 'forbidden';
  }
  if (lower.includes('not found') || lower.includes('404')) {
    return 'not-found';
  }
  return 'generic';
}
