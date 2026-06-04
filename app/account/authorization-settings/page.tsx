'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { PurchaseAuthorizationConfigurator } from 'propeller-v2-react-ui';
import { Contact, Customer, Company } from '@propeller-commerce/propeller-sdk-v2';
import { orderEditorGraphqlClient } from '@/lib/api';
import { useTranslations } from '@/lib/i18n/client';

export default function AuthorizationSettingsPage() {
    const { state } = useAuth();
    const { selectedCompany } = useCompany();
    const { language } = useLanguage();
    const purchaseAuthorizationConfiguratorLabels = useTranslations('PurchaseAuthorizationConfigurator');

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
                    Authorization Settings
                </h1>
            </div>
            <PurchaseAuthorizationConfigurator
                graphqlClient={orderEditorGraphqlClient}
                labels={purchaseAuthorizationConfiguratorLabels}
            />
        </div>
    );
}
