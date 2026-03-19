'use client';

import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AccountIconAndMenu from '@/components/propeller/AccountIconAndMenu';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Card } from '@/components/ui/Card';

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { state, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // Protect account routes
    useEffect(() => {
        if (!state.isAuthenticated) {
            router.push('/login');
        }
    }, [state.isAuthenticated, router]);

    if (!state.isAuthenticated) {
        return null; // or loading spinner
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
                                    variant="sidebar"
                                    currentPath={pathname}
                                    user={state.user}
                                    onMenuItemClick={(href) => router.push(href)}
                                    onLogoutClick={() => logout()}
                                    menuLinks={[
                                        { label: 'Dashboard', href: '/account' },
                                        { label: 'Addresses', href: '/account/addresses' },
                                        { label: 'Orders', href: '/account/orders' },
                                        { label: 'Quotes', href: '/account/quotes' },
                                        { label: 'Favorites', href: '/account/favorites' },
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
