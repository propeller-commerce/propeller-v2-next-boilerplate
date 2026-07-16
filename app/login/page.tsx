'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoginForm } from '@propeller-commerce/propeller-v2-react-ui';
import { graphqlClient, services } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/client';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { Cart, Company, Contact, Customer } from '@propeller-commerce/propeller-sdk-v2';
import { localizeHref, config } from '@/data/config';
import { pickUserHint } from '@/lib/userHint';
import { fetchActiveCart } from '@propeller-commerce/propeller-v2-react-ui';
import { mergeAnonymousCart } from '@propeller-commerce/propeller-v2-react-ui';
import { initCart } from '@propeller-commerce/propeller-v2-react-ui';

export default function LoginPage() {
  const { state, updateUser } = useAuth();
  const { setSelectedCompany } = useCompany();
  const { language, setLanguage } = useLanguage();
  const { cart, saveCart, clearCart } = useCart();
  const loginFormLabels = useTranslations('LoginForm');
  const t = useTranslations('AuthPages');
  const router = useRouter();


  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container-width flex items-center justify-center py-12">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          {state.isAuthenticated ? (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">{t.alreadyLoggedIn}</CardTitle>
                <CardDescription>
                  {t.alreadyLoggedInDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button className="w-full" onClick={() => router.push(localizeHref('/account', language))}>
                  {t.goToAccount}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push(localizeHref('/', language))}>
                  {t.goToHome}
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">{t.welcomeBack}</CardTitle>
                <CardDescription>
                  {t.welcomeBackDesc}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <LoginForm
                  labels={loginFormLabels}
                  title=""
                  accountHeaderLoginForm={false}
                  displayGuestCheckoutLink={false}
                  cart={cart as Cart | null}
                  onForgotPasswordClick={() => router.push(localizeHref('/forgot-password', language))}
                  onRegisterClick={() => router.push(localizeHref('/register', language))}
                  afterLogin={async (user, accessToken, refreshToken, expiresAt, anonymousCart) => {
                    // Persist ONLY the thin hint — never the PII-bearing Contact.
                    // Matches AuthService/refreshUser/updateUser; full profile is
                    // re-fetched via getViewer() on mount. See lib/userHint.ts.
                    const hint = pickUserHint(user);
                    if (hint) localStorage.setItem('user', JSON.stringify(hint));
                    updateUser(user);

                    const company = (user as Contact).company;
                    if (company) {
                      setSelectedCompany(company as Company);
                    }

                    // Persist the token in the httpOnly cookie (server-side),
                    // not localStorage — JS can't read it. Survives reloads via
                    // the /api/graphql proxy.
                    if (accessToken) {
                      await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ accessToken, refreshToken }),
                      });
                    }

                    // Dispatch event for AuthContext
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('userLoggedIn'));
                    }

                    // Switch to user's preferred language if available
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

                    router.push(localizeHref('/account', userLang || language));
                  }}
                />
              </CardContent>
            </>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
