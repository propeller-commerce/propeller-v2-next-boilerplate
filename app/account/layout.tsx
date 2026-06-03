'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AccountIconAndMenu } from 'propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useRouter, usePathname } from 'next/navigation';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Contact, Customer } from 'propeller-sdk-v2';
import { useTranslations } from '@/lib/i18n/client';

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { state, logout, isAuthManagerForCompany } = useAuth();
    const { selectedCompany } = useCompany();
    const router = useRouter();
    const pathname = usePathname();
    const { language } = useLanguage();
    const accountIconAndMenuLabels = useTranslations('AccountIconAndMenu');
    const loginFormLabels = useTranslations('LoginForm');

    // Protect account routes — wait for auth to finish loading before checking
    useEffect(() => {
        if (!state.isLoading && !state.isAuthenticated) {
            router.push(localizeHref('/login', language));
        }
    }, [state.isLoading, state.isAuthenticated, router, language]);

    if (state.isLoading || !state.isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header />
            <main className="flex-1 py-8">
                <div className="container-width max-w-7xl">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar Navigation */}
                        <aside className="w-full lg:w-72 flex-shrink-0">
                            <Card className="overflow-hidden border-border bg-card shadow-sm sticky top-24">
                                <AccountIconAndMenu
                                    labels={accountIconAndMenuLabels}
                                    loginFormLabels={loginFormLabels}
                                    variant="sidebar"
                                    currentPath={pathname}
                                    onMenuItemClick={(href) => router.push(localizeHref(href, language))}
                                    onLogoutClick={() => logout()}
                                    menuLinks={[
                                        { label: 'Dashboard', href: localizeHref('/account', language) },
                                        { label: 'Addresses', href: localizeHref('/account/addresses', language) },
                                        { label: 'Orders', href: localizeHref('/account/orders', language) },
                                        { label: 'Quotes', href: localizeHref('/account/quotes', language) },
                                        { label: 'Quote requests', href: localizeHref('/account/quote-requests', language) },
                                        { label: 'Favorites', href: localizeHref('/account/favorites', language) },
                                        ...(isAuthManagerForCompany(state.user, selectedCompany?.companyId) ? [
                                            { label: 'Authorization settings', href: localizeHref('/account/authorization-settings', language) },
                                            { label: 'Authorization requests', href: localizeHref('/account/authorization-requests', language) },
                                        ] : []),
                                    ]}
                                />
                            </Card>
                        </aside>

                        {/* Main Content Area */}
                        <div className="flex-1 min-w-0">
                            {children}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
