'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import OrderList from '@/components/account/OrderList';

export default function QuotesPage() {
    const { state } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!state.isAuthenticated) {
            router.push('/login');
        }
    }, [state.isAuthenticated, router]);

    if (!state.isAuthenticated) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">My Quotes</h1>
            </div>
            <div className="bg-card shadow-sm">
                <OrderList type="quotes" />
            </div>
        </div>
    );
}
