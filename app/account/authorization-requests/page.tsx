'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { PurchaseAuthorizationRequests } from '@propeller-commerce/propeller-v2-react-ui';
import { serializeCart } from '@/utils/cartHelpers';
import { Contact, Customer, Cart } from '@propeller-commerce/propeller-sdk-v2';
import { useTranslations } from '@/lib/i18n/client';

export default function AuthorizationRequestsPage() {
    const { state } = useAuth();
    const { selectedCompany } = useCompany();
    const { cart, saveCart } = useCart();
    const router = useRouter();
    const purchaseAuthorizationRequestsLabels = useTranslations('PurchaseAuthorizationRequests');
    const t = useTranslations('Account');

    const isContact = (u: Contact | Customer | null): u is Contact =>
        u !== null && 'contactId' in u;

    const companyId = selectedCompany?.companyId;

    // Guard: only authenticated contacts with a companyId can access this page
    if (!state.isAuthenticated || !isContact(state.user) || !companyId) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">
                    {t.authorizationRequestsTitle}
                </h1>
            </div>
            <PurchaseAuthorizationRequests
                afterAcceptRequest={(acceptedCart: Cart) => {
                    if (cart) {
                        localStorage.setItem('manager_cart', serializeCart(cart));
                    }
                    saveCart(acceptedCart);
                    router.push('/cart');
                }}
                labels={purchaseAuthorizationRequestsLabels}
            />
        </div>
    );
}
