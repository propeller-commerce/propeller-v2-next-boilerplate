'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import RegisterForm from '@/components/propeller/RegisterForm';
import { graphqlClient } from '@/lib/api';
import { Cart, CartService, Company, Contact, Customer } from 'propeller-sdk-v2';
import { stripLeadingUnderscores } from '@/data/defaults';
import { localizeHref, config } from '@/data/config';
import { fetchActiveCart } from '@/composables/shared/utils/fetchActiveCart';
import { mergeAnonymousCart } from '@/composables/shared/utils/mergeAnonymousCart';
import { initCart } from '@/composables/shared/utils/cartInit';

export default function RegisterPage() {
  const { state, updateUser } = useAuth();
  const { setSelectedCompany } = useCompany();
  const { language } = useLanguage();
  const { cart, saveCart, clearCart } = useCart();
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12">
        <Card className="w-full max-w-6xl mx-auto shadow-lg">
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
                <CardTitle className="text-2xl font-bold">Create account</CardTitle>
                <CardDescription>
                  Fill in the details below to create your account
                </CardDescription>
              </CardHeader>

              <CardContent>
                <RegisterForm
                  graphqlClient={graphqlClient}
                  title=""
                  requiredFields={['firstName', 'lastName']}
                  onLoginClick={() => router.push(localizeHref('/login', language))}
                  automaticLogin={true}
                  cart={cart as Cart | null}
                  countries={{
                    'NL': 'Netherlands',
                    'BE': 'Belgium',
                    'DE': 'Germany',
                    'FR': 'France',
                    'UK': 'United Kingdom',
                    'US': 'United States'
                  }}
                  afterRegistration={async (user, accessToken, refreshToken, expiresAt, anonymousCart) => {
                    // No token means the form was used with `automaticLogin: false`.
                    // The user exists server-side but isn't signed in here — send
                    // them to the login page.
                    if (!accessToken) {
                      router.push(localizeHref('/login', language));
                      return;
                    }

                    const registeredUser = stripLeadingUnderscores(user);

                    localStorage.setItem('user', JSON.stringify(registeredUser));
                    updateUser(registeredUser);

                    const company = (registeredUser as Contact).company;
                    if (company) {
                      setSelectedCompany(company as Company);
                    }

                    localStorage.setItem('accessToken', accessToken);
                    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
                    if (expiresAt) localStorage.setItem('expiresAt', expiresAt);

                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('userLoggedIn'));
                    }

                    let targetCart = await fetchActiveCart({
                      graphqlClient,
                      user: registeredUser as Contact | Customer,
                      companyId: company?.companyId,
                      language,
                      imageSearchFilters: config.imageSearchFiltersGrid,
                      imageVariantFilters: config.imageVariantFiltersSmall,
                    });

                    if (anonymousCart?.items?.length) {
                      if (!targetCart) {
                        targetCart = await initCart({
                          graphqlClient,
                          user: registeredUser as Contact | Customer,
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

                    router.push(localizeHref('/account', language));
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
