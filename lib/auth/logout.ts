import { LAST_ORDER_COOKIE } from '../graphql/orderEditorRouting.ts';
import { REGISTRATION_COOKIE } from '../graphql/registrationRouting.ts';
import { clearPunchoutCookies } from '../punchout-session/session.ts';

/**
 * `?keep=punchout-pending`: the magic-login page's logout right before its token
 * exchange, which activates the pending punchout entry (bound to that very token,
 * useless without it).
 */
export const KEEP_PUNCHOUT_PENDING = 'punchout-pending';

type CookieWriter = Parameters<typeof clearPunchoutCookies>[0];

/**
 * Expire everything a session leaves in this browser: its tokens, the last order
 * it placed (that cookie unlocks the order's thank-you page and its payment), the
 * company it just registered and any punchout session, the pending one included.
 * The next person on a shared browser inherits none of it.
 */
export function clearSessionCookies(res: CookieWriter, { keepPunchoutPending = false } = {}): void {
  // Path/secure/sameSite match the attributes the cookies were set with.
  for (const name of ['access_token', 'refresh_token', LAST_ORDER_COOKIE, REGISTRATION_COOKIE]) {
    res.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }
  clearPunchoutCookies(res, { keepPending: keepPunchoutPending });
}
