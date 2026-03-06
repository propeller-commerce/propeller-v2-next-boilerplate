'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoginForm from '@/components/propeller/LoginForm';
import { graphqlClient } from '@/lib/api';

export default function LoginPage() {
  const { state } = useAuth();
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
                <Button className="w-full" onClick={() => router.push('/account')}>
                  Go to My Account
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
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
                  displayGuestCheckoutLink={false}
                  onForgotPasswordClick={() => router.push('/forgot-password')}
                  onRegisterClick={() => router.push('/register')}
                  afterLogin={() => router.push('/account')}
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
