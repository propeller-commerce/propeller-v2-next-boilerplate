'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AccountIconAndMenu } from '@propeller-commerce/propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useRouter, usePathname } from 'next/navigation';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Contact, Customer } from '@propeller-commerce/propeller-sdk-v2';
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
    const t = useTranslations('Account');

    // Protect account routes — wait for auth to finish loading before checking.
    // Hard `window.location.replace` (not the App-Router `router.push`): during a
    // logout the auth context dispatches while this layout is mid-render, and the
    // client-side navigation was being dropped in that window (stuck on a blank
    // screen, never reaching /login). A full-document navigation is immune to
    // that race. Covers logout-while-on-page — the effect re-runs when
    // isAuthenticated flips.
    const authed = !state.isLoading && state.isAuthenticated;
    useEffect(() => {
        if (!state.isLoading && !state.isAuthenticated) {
            window.location.replace(localizeHref('/login', language));
        }
    }, [state.isLoading, state.isAuthenticated, language]);

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Header />
            <main className="flex-1 py-8">
                <div className="container-width max-w-7xl">
                    {!authed ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : (
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
                                        { label: t.navDashboard, href: localizeHref('/account', language) },
                                        { label: t.navAddresses, href: localizeHref('/account/addresses', language) },
                                        { label: t.navOrders, href: localizeHref('/account/orders', language) },
                                        { label: t.navQuotes, href: localizeHref('/account/quotes', language) },
                                        { label: t.navQuoteRequests, href: localizeHref('/account/quote-requests', language) },
                                        { label: t.navFavorites, href: localizeHref('/account/favorites', language) },
                                        ...(isAuthManagerForCompany(state.user, selectedCompany?.companyId) ? [
                                            { label: t.navAuthorizationSettings, href: localizeHref('/account/authorization-settings', language) },
                                            { label: t.navAuthorizationRequests, href: localizeHref('/account/authorization-requests', language) },
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
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
