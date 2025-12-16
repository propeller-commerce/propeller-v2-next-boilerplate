'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { FileText } from 'lucide-react';

export default function InvoicesPage() {
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
            <h1 className="text-3xl font-bold tracking-tight">My Invoices</h1>
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="bg-muted p-4 rounded-full">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-lg font-medium">No invoices found</p>
                        <p className="text-muted-foreground">You don't have any invoices yet.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
