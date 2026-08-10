'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoginForm } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import { Cart } from '@propeller-commerce/propeller-sdk-v2';
import { localizeHref } from '@/data/config';
import { useAfterLogin } from '@/lib/useAfterLogin';

export default function LoginPage() {
  const { state } = useAuth();
  const { language } = useLanguage();
  const { cart } = useCart();
  const loginFormLabels = useTranslations('LoginForm');
  const t = useTranslations('AuthPages');
  const router = useRouter();
  // Shared post-login sequence (cookie + cart-merge + company + language),
  // reused by the magic-login page. See lib/useAfterLogin.ts.
  const runAfterLogin = useAfterLogin();


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
                  buttonText={loginFormLabels.submitButton}
                  accountHeaderLoginForm={false}
                  displayGuestCheckoutLink={false}
                  cart={cart as Cart | null}
                  onForgotPasswordClick={() => router.push(localizeHref('/forgot-password', language))}
                  onRegisterClick={() => router.push(localizeHref('/register', language))}
                  afterLogin={async (user, accessToken, refreshToken, expiresAt, anonymousCart) => {
                    const { effectiveLanguage } = await runAfterLogin(
                      user,
                      accessToken,
                      refreshToken,
                      expiresAt,
                      anonymousCart,
                    );
                    router.push(localizeHref('/account', effectiveLanguage));
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
