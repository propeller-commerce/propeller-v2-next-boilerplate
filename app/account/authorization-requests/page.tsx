'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { PurchaseAuthorizationRequests } from '@propeller-commerce/propeller-v2-react-ui';
import { serializeCart } from '@/utils/cartHelpers';
import { track } from '@/lib/tracking';
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
                    // Procurement approving a request: the step between
                    // "cart built" and "order placed" that is invisible in the
                    // mutation stream today (PWP-910).
                    track(
                        'propeller.authorization_request_approved',
                        {
                            cart_id: acceptedCart?.cartId ?? null,
                            value: acceptedCart?.total?.totalGross ?? null,
                            item_count: acceptedCart?.items?.length ?? 0,
                        },
                        `authorization_request_approved:${acceptedCart?.cartId ?? ''}`
                    );
                    if (cart) {
                        localStorage.setItem('manager_cart', serializeCart(cart));
                    }
                    saveCart(acceptedCart);
                    router.push('/cart');
                }}
                afterDeleteRequest={(cartId: string) => {
                    // "Delete" IS the rejection in this UI — a manager refusing
                    // the request. No new package callback was needed for it;
                    // the taxonomy name just never got wired (PWP-910). The
                    // callback carries only the id, so value/item_count are
                    // deliberately absent rather than guessed.
                    track(
                        'propeller.authorization_request_rejected',
                        { cart_id: cartId ?? null },
                        `authorization_request_rejected:${cartId ?? ''}`
                    );
                }}
                labels={purchaseAuthorizationRequestsLabels}
            />
        </div>
    );
}
