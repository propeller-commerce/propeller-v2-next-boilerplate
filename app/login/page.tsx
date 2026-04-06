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
import { Company, Contact, Customer } from 'propeller-sdk-v2';
import { stripLeadingUnderscores } from '@/data/defaults';
import { localizeHref } from '@/data/config';

export default function LoginPage() {
  const { state, updateUser } = useAuth();
  const { setSelectedCompany } = useCompany();
  const { language, setLanguage } = useLanguage();
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
                  onForgotPasswordClick={() => router.push(localizeHref('/forgot-password', language))}
                  onRegisterClick={() => router.push(localizeHref('/register', language))}
                  afterLogin={(user, accessToken, refreshToken, expiresAt) => {
                    const loggedInUser = stripLeadingUnderscores(user);
                    localStorage.setItem('user', JSON.stringify(loggedInUser));
                    updateUser(loggedInUser);

                    if ((loggedInUser as Contact).company) {
                      setSelectedCompany((loggedInUser as Contact).company as Company);
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

                    router.push(localizeHref('/account', userLang || language))
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
