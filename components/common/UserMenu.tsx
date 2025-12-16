'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { User, MapPin, Package, FileText, Heart, Calculator, LogOut, LayoutDashboard } from 'lucide-react';

interface UserMenuProps {
    className?: string;
    onItemClick?: () => void;
}

export default function UserMenu({ className = '', onItemClick }: UserMenuProps) {
    const { state: authState, logout } = useAuth();
    const pathname = usePathname();

    if (!authState.isAuthenticated) {
        return null;
    }

    const getUserFullName = (): string => {
        try {
            const user = authState.user;
            if (user) {
                if ('firstName' in user || 'lastName' in user) {
                    const u = user as any;
                    const nameParts = [u.firstName, u.lastName].filter(Boolean);
                    if (nameParts.length > 0) return nameParts.join(' ');
                }
                if ('name' in user) {
                    const u = user as any;
                    if (u.name) return u.name;
                }
                if ('email' in user && user.email) return user.email;
            }
        } catch (error) {
            console.error('Error getting user name:', error);
        }
        return 'User';
    };

    const handleLogout = async () => {
        try {
            await logout();
            onItemClick?.();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const menuItems = [
        { path: '/account', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/account/addresses', label: 'Addresses', icon: MapPin },
        { path: '/account/orders', label: 'Orders', icon: Package },
        { path: '/account/quotes', label: 'Quotes', icon: FileText },
        { path: '/account/invoices', label: 'Invoices', icon: FileText },
        { path: '/account/favorites', label: 'Favorites', icon: Heart },
        { path: '/account/price-requests', label: 'Price Requests', icon: Calculator },
    ];

    const isActive = (itemPath: string) => {
        if (itemPath === '/account') return pathname === '/account';
        return pathname?.startsWith(itemPath);
    };

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <div className="p-4 border-b border-border bg-muted/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Signed in as</p>
                <p className="font-medium text-foreground truncate" title={getUserFullName()}>{getUserFullName()}</p>
            </div>

            <nav className="flex-1 py-2">
                <ul className="space-y-0.5 px-2">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <li key={item.path}>
                                <Link
                                    href={item.path}
                                    onClick={onItemClick}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                        active
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-2 mt-auto border-t border-border">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Log Out
                </button>
            </div>
        </div>
    );
}
