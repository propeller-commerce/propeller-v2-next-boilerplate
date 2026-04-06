'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useCart } from '@/context/CartContext';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import PurchaseAuthorizationRequests from '@/components/propeller/PurchaseAuthorizationRequests';
import { serializeCart } from '@/utils/cartHelpers';
import { Contact, Customer, Cart } from 'propeller-sdk-v2';

export default function AuthorizationRequestsPage() {
    const { state } = useAuth();
    const { selectedCompany } = useCompany();
    const { cart, saveCart } = useCart();

    const isContact = (u: Contact | Customer | null): u is Contact =>
        u !== null && 'contactId' in u;

    const companyId = selectedCompany?.companyId;

    // Guard: only authenticated contacts with a companyId can access this page
    if (!state.isAuthenticated || !isContact(state.user) || !companyId) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">
                    Authorization Requests
                </h1>
            </div>
            <PurchaseAuthorizationRequests
                graphqlClient={graphqlClient}
                user={state.user}
                companyId={companyId}
                configuration={config}
                afterAcceptRequest={(acceptedCart: Cart) => {
                    // Save manager's current cart so it can be restored later
                    if (cart) {
                        localStorage.setItem('manager_cart', serializeCart(cart));
                    }
                    // Replace active cart with the accepted authorization request cart
                    saveCart(acceptedCart);
                }}
                labels={{
                    title: 'Authorization Requests',
                    colId: '#',
                    colDate: 'Date',
                    colQuantity: 'Quantity',
                    colTotal: 'Total',
                    colRequestedBy: 'Requested by',
                    colActions: 'Actions',
                    view: 'View',
                    modalTitle: 'Authorization Request',
                    requesterInfo: 'Requester',
                    itemsTitle: 'Items',
                    itemProduct: 'Product',
                    itemQty: 'Qty',
                    itemUnitPrice: 'Unit price',
                    itemTotal: 'Total',
                    totalExclVat: 'Total excl. VAT:',
                    totalVat: 'VAT:',
                    total: 'Total:',
                    cancel: 'Cancel',
                    acceptRequest: 'Accept request',
                    accepting: 'Accepting...',
                    empty: 'No pending authorization requests',
                }}
            />
        </div>
    );
}
