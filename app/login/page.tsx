'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoginForm from '@/components/propeller/LoginForm';
import { graphqlClient } from '@/lib/api';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { Cart, CartService, Company, Contact, Customer } from 'propeller-sdk-v2';
import { stripLeadingUnderscores } from '@/data/defaults';
import { localizeHref, config } from '@/data/config';
import { fetchActiveCart } from '@/composables/shared/utils/fetchActiveCart';
import { mergeAnonymousCart } from '@/composables/shared/utils/mergeAnonymousCart';
import { initCart } from '@/composables/shared/utils/cartInit';

export default function LoginPage() {
  const { state, updateUser } = useAuth();
  const { setSelectedCompany } = useCompany();
  const { language, setLanguage } = useLanguage();
  const { cart, saveCart, clearCart } = useCart();
  const router = useRouter();


  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container-width flex items-center justify-center py-12">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          {state.isAuthenticated ? (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Already logged in</CardTitle>
                <CardDescription>
                  You are already signed in to your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Button className="w-full" onClick={() => router.push(localizeHref('/account', language))}>
                  Go to My Account
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push(localizeHref('/', language))}>
                  Go to Home
                </Button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>

              <CardContent>
                <LoginForm
                  graphqlClient={graphqlClient}
                  title=""
                  accountHeaderLoginForm={false}
                  displayGuestCheckoutLink={false}
                  cart={cart as Cart | null}
                  onForgotPasswordClick={() => router.push(localizeHref('/forgot-password', language))}
                  onRegisterClick={() => router.push(localizeHref('/register', language))}
                  afterLogin={async (user, accessToken, refreshToken, expiresAt, anonymousCart) => {
                    const loggedInUser = stripLeadingUnderscores(user);
                    localStorage.setItem('user', JSON.stringify(loggedInUser));
                    updateUser(loggedInUser);

                    const company = (loggedInUser as Contact).company;
                    if (company) {
                      setSelectedCompany(company as Company);
                    }

                    if (accessToken && refreshToken && expiresAt) {
                      localStorage.setItem('accessToken', accessToken);
                      localStorage.setItem('refreshToken', refreshToken);
                      localStorage.setItem('expiresAt', expiresAt);
                    }

                    // Dispatch event for AuthContext
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('userLoggedIn'));
                    }

                    // Switch to user's preferred language if available
                    const userLang = (loggedInUser as Contact | Customer).primaryLanguage;
                    if (userLang && userLang !== language) {
                      setLanguage(userLang);
                    }

                    let targetCart = await fetchActiveCart({
                      graphqlClient,
                      user: loggedInUser as Contact | Customer,
                      companyId: company?.companyId,
                      language,
                      imageSearchFilters: config.imageSearchFiltersGrid,
                      imageVariantFilters: config.imageVariantFiltersSmall,
                    });

                    if (anonymousCart?.items?.length) {
                      if (!targetCart) {
                        targetCart = await initCart({
                          graphqlClient,
                          user: loggedInUser as Contact | Customer,
                          companyId: company?.companyId,
                          language,
                          imageSearchFilters: config.imageSearchFiltersGrid,
                          imageVariantFilters: config.imageVariantFiltersSmall,
                        });
                      }
                      const merged = await mergeAnonymousCart({
                        graphqlClient,
                        targetCartId: targetCart.cartId,
                        anonymousCart,
                        language,
                        imageSearchFilters: config.imageSearchFiltersGrid,
                        imageVariantFilters: config.imageVariantFiltersSmall,
                      });
                      if (merged) targetCart = merged;

                      if (anonymousCart.cartId && anonymousCart.cartId !== targetCart.cartId) {
                        try {
                          await new CartService(graphqlClient).deleteCart({ id: anonymousCart.cartId });
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
