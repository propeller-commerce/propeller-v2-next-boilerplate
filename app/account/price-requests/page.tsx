'use client';

import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { FileQuestion } from 'lucide-react';

export default function PriceRequestsPage() {
    const { state } = useAuth();

    if (!state.isAuthenticated) return null;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Price Requests</h1>
            <Card>
                <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="bg-muted p-4 rounded-full">
                        <FileQuestion className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-lg font-medium">No price requests found</p>
                        <p className="text-muted-foreground">You don't have any price requests yet.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
