'use client';

/**
 * useAfterLogin — the shared post-authentication sequence.
 *
 * Extracted verbatim from `app/login/page.tsx`'s `afterLogin` so password login
 * AND magic-token login run the identical flow: persist the thin user hint,
 * update the auth/company/language stores, write the httpOnly session cookie
 * (`/api/auth/session`), and reconcile the cart (fetch active → merge anonymous
 * → drop the anonymous cart). It returns the resolved `effectiveLanguage` and
 * leaves the final redirect to the caller (login → /account, magic-login → /),
 * so redirect policy stays at the call site.
 */

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { services } from '@/lib/api';
import { config } from '@/data/config';
import { pickUserHint } from '@/lib/userHint';
import {
  fetchActiveCart,
  mergeAnonymousCart,
  initCart,
} from '@propeller-commerce/propeller-v2-react-ui';
import type { Cart, Company, Contact, Customer } from '@propeller-commerce/propeller-sdk-v2';

export type AfterLogin = (
  user: Contact | Customer,
  accessToken?: string,
  refreshToken?: string,
  expiresAt?: string,
  anonymousCart?: Cart | null,
) => Promise<{ effectiveLanguage: string }>;

export function useAfterLogin(): AfterLogin {
  const { updateUser } = useAuth();
  const { setSelectedCompany } = useCompany();
  const { language, setLanguage } = useLanguage();
  const { saveCart, clearCart } = useCart();

  return async (user, accessToken, refreshToken, expiresAt, anonymousCart) => {
    // Persist ONLY the thin hint — never the PII-bearing Contact. Full profile
    // is re-fetched via getViewer() on mount. See lib/userHint.ts.
    const hint = pickUserHint(user);
    if (hint) localStorage.setItem('user', JSON.stringify(hint));
    updateUser(user);

    const company = (user as Contact).company;
    if (company) {
      setSelectedCompany(company as Company);
    }

    // Persist the token in the httpOnly cookie (server-side), not localStorage —
    // JS can't read it. Survives reloads via the /api/graphql proxy.
    if (accessToken) {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, refreshToken }),
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('userLoggedIn'));
    }

    // Switch to user's preferred language if available.
    const userLang = (user as Contact | Customer).primaryLanguage;
    if (userLang && userLang !== language) {
      setLanguage(userLang);
    }

    let targetCart = await fetchActiveCart({
      services,
      user: user as Contact | Customer,
      companyId: company?.companyId,
      language,
      imageSearchFilters: config.imageSearchFiltersGrid,
      imageVariantFilters: config.imageVariantFiltersSmall,
    });

    if (anonymousCart?.items?.length) {
      if (!targetCart) {
        targetCart = await initCart({
          services,
          user: user as Contact | Customer,
          companyId: company?.companyId,
          language,
          imageSearchFilters: config.imageSearchFiltersGrid,
          imageVariantFilters: config.imageVariantFiltersSmall,
        });
      }
      const merged = await mergeAnonymousCart({
        services,
        targetCartId: targetCart.cartId,
        anonymousCart,
        language,
        imageSearchFilters: config.imageSearchFiltersGrid,
        imageVariantFilters: config.imageVariantFiltersSmall,
      });
      if (merged) targetCart = merged;

      if (anonymousCart.cartId && anonymousCart.cartId !== targetCart.cartId) {
        try {
          await services.cart.deleteCart({ id: anonymousCart.cartId });
        } catch (e) {
          console.error('[auth] Failed to delete anonymous cart', e);
        }
      }
    }

    if (targetCart) saveCart(targetCart);
    else clearCart();

    return { effectiveLanguage: userLang || language };
  };
}
