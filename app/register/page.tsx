'use client';

import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import RegisterForm from '@/components/propeller/RegisterForm';
import { graphqlClient } from '@/lib/api';
import { Company, Contact } from 'propeller-sdk-v2';

export default function RegisterPage() {
  const { state, updateUser } = useAuth();
  const { setSelectedCompany } = useCompany();
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
                  onLoginClick={() => router.push('/login')}
                  automaticLogin={true}
                  countries={{
                    'NL': 'Netherlands',
                    'BE': 'Belgium',
                    'DE': 'Germany',
                    'FR': 'France',
                    'UK': 'United Kingdom',
                    'US': 'United States'
                  }}
                  afterRegistration={(user, accessToken, refreshToken, expiresAt) => {
                    if ((user as Contact).company) {
                      setSelectedCompany((user as Contact).company as Company);
                    }

                    localStorage.setItem('user', JSON.stringify(user));

                    updateUser(user);

                    if (accessToken && refreshToken && expiresAt) {
                      localStorage.setItem('accessToken', accessToken);
                      localStorage.setItem('refreshToken', refreshToken);
                      localStorage.setItem('expiresAt', expiresAt);
                    }

                    router.push('/account')
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
