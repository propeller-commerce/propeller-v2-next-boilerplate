'use client';
import type { PurchaseAuthorizationConfig } from '@propeller-commerce/propeller-sdk-v2';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useLanguage } from '@/context/LanguageContext';
import { PurchaseAuthorizationConfigurator } from '@propeller-commerce/propeller-v2-react-ui';
import { Contact, Customer, Company } from '@propeller-commerce/propeller-sdk-v2';
import { orderEditorGraphqlClient } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/client';
import { track } from '@/lib/tracking';

export default function AuthorizationSettingsPage() {
    const { state } = useAuth();
    const { selectedCompany } = useCompany();
    const purchaseAuthorizationConfiguratorLabels = useTranslations('PurchaseAuthorizationConfigurator');
    const t = useTranslations('Account');

    const isContact = (u: Contact | Customer | null): u is Contact =>
        u !== null && 'contactId' in u;

    const getActiveCompany = (): Company | null => {
        if (!state.user || !isContact(state.user)) return null;
        return selectedCompany ?? null;
    };

    const companyId = getActiveCompany()?.companyId;

    // Guard: only contacts with a companyId can access this page
    if (!state.isAuthenticated || !isContact(state.user) || !companyId) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">
                    {t.authorizationSettingsTitle}
                </h1>
            </div>
            <PurchaseAuthorizationConfigurator
                graphqlClient={orderEditorGraphqlClient}
                labels={purchaseAuthorizationConfiguratorLabels}
                afterPurchaseAuthorizationCreate={(pac) => trackPac('created', pac)}
                afterPurchaseAuthorizationUpdate={(pac) => trackPac('updated', pac)}
                afterPurchaseAuthorizationDelete={(deleted) => {
                    if (deleted) trackPac('deleted', null);
                }}
            />
        </div>
    );
}

/**
 * Procurement rules changing is a maturing buying process, which typically
 * precedes larger orders (PWP-910). One event with an `action` prop rather than
 * three: nobody will ever filter created vs updated separately here.
 */
function trackPac(
    action: 'created' | 'updated' | 'deleted',
    pac: PurchaseAuthorizationConfig | null
) {
    track(
        'propeller.purchase_authorization_config_changed',
        {
            action,
            role: pac?.purchaseRole ?? null,
            limit: pac?.authorizationLimit ?? null,
        },
        `pac_changed:${action}:${pac?.id ?? ''}:${Math.floor(Date.now() / 2000)}`
    );
}
