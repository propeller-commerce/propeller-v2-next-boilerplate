import { NextRequest, NextResponse } from 'next/server';

/**
 * Reports whether an auth session cookie is present, so the client can decide
 * (on mount) whether to treat the cached `user` profile as authenticated.
 *
 * This does NOT expose the token to JS — it only returns a boolean. The token
 * itself is validated upstream by the real GraphQL API on the next data call
 * (the `/api/graphql` proxy injects it from the cookie). If the token is
 * expired/invalid that call will fail and the client clears its state.
 */
export async function GET(request: NextRequest) {
  const hasSession = !!request.cookies.get('access_token')?.value;
  return NextResponse.json({ authenticated: hasSession });
}
