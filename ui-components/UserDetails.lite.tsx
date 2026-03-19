import {
    useStore,
    onMount,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    Company,
    Address,
} from 'propeller-sdk-v2';

export interface UserDetailsProps {
    /** The currently logged in user (Contact or Customer) */
    user: Contact | Customer;

    /**
     * The currently active company
     */
    activeCompany: Company | null;

    /**
     * Display basic company information for the default company if the user is Contact
     * @default true
     */
    showCompanyInfo?: boolean;

    /**
     * Display a list of all companies if the user is Contact
     * @default false
     */
    listAllContactCompanies?: boolean;

    /**
     * Display details of the user's default invoice address
     * @default true
     */
    showDefaultInvoiceAddress?: boolean;

    /**
     * Display details of the user's default delivery address
     * @default false
     */
    showDefaultDeliveryAddress?: boolean;

    /** Country code-to-name mapping for address display */
    countries?: { code: string; name: string }[];
}

interface UserDetailsState {
    isMounted: boolean;
    isContact: () => boolean;
    getName: () => string;
    getActiveCompany: () => Company | null;
    getCompanies: () => Company[];
    getAllAddresses: () => Address[];
    getDefaultInvoiceAddress: () => Address | null;
    getDefaultDeliveryAddress: () => Address | null;
    getAddressName: (addr: Address) => string;
    getAddressLine1: (addr: Address) => string;
    getAddressLine2: (addr: Address) => string;
    getCountryName: (code: string) => string;
    shouldShowCompanyInfo: () => boolean;
    shouldListCompanies: () => boolean;
    shouldShowInvoiceAddress: () => boolean;
    shouldShowDeliveryAddress: () => boolean;
}

export default function UserDetails(props: UserDetailsProps) {
    const state = useStore<UserDetailsState>({
        isMounted: false,
        isContact(): boolean {
            return props.user !== null && 'company' in props.user;
        },

        getName(): string {
            if (props.user && props.user.firstName) {
                return [props.user.firstName, props.user.lastName].filter(Boolean).join(' ');
            }
            return 'User';
        },

        getActiveCompany(): Company | null {
            return state.isContact() ? props.activeCompany : null;
        },

        getCompanies(): Company[] {
            if (!state.isContact()) return [];
            const contact = props.user as Contact;
            const companiesResponse = contact.companies;
            if (companiesResponse?.items && companiesResponse.items.length > 0) {
                return companiesResponse.items;
            }
            const defaultCompany = contact.company;
            if (defaultCompany) {
                return [defaultCompany];
            }
            return [];
        },

        getAllAddresses(): Address[] {
            if (state.isContact()) {
                const company = state.getActiveCompany();
                return company?.addresses || [];
            }
            const customer = props.user as Customer;
            return customer.addresses || [];
        },

        getDefaultInvoiceAddress(): Address | null {
            const addresses = state.getAllAddresses();
            return addresses.find(
                (addr: Address) => addr.type === 'invoice' && addr.isDefault === 'Y'
            ) ?? null;
        },

        getDefaultDeliveryAddress(): Address | null {
            const addresses = state.getAllAddresses();
            return addresses.find(
                (addr: Address) => addr.type === 'delivery' && addr.isDefault === 'Y'
            ) ?? null;
        },

        getAddressName(addr: Address): string {
            const parts = [addr.firstName, addr.middleName, addr.lastName].filter(Boolean);
            return parts.join(' ');
        },

        getAddressLine1(addr: Address): string {
            const parts = [addr.street, addr.number, addr.numberExtension].filter(Boolean);
            return parts.join(' ');
        },

        getAddressLine2(addr: Address): string {
            const parts = [addr.postalCode, addr.city].filter(Boolean);
            return parts.join(' ');
        },

        getCountryName(code: string): string {
            if (!code) return '';
            const list = props.countries || [];
            for (let i = 0; i < list.length; i++) {
                if (list[i].code === code) return list[i].name;
            }
            return code;
        },

        shouldShowCompanyInfo(): boolean {
            return (props.showCompanyInfo !== false) && state.isContact();
        },

        shouldListCompanies(): boolean {
            return (props.listAllContactCompanies === true) && state.isContact();
        },

        shouldShowInvoiceAddress(): boolean {
            return props.showDefaultInvoiceAddress !== false;
        },

        shouldShowDeliveryAddress(): boolean {
            return props.showDefaultDeliveryAddress === true;
        },
    });

    onMount(() => {
        state.isMounted = true;
    });

    return (
        <div className="user-details space-y-6">
            <Show when={state.isMounted}>
                {/* Personal Information */}
                <div className="user-details__personal rounded-lg bg-card text-card-foreground shadow-sm">
                    <div className="p-6 pb-2">
                        <h3 className="text-lg font-semibold">Personal Information</h3>
                    </div>
                    <div className="p-6 pt-2 space-y-4">
                        <div className="grid grid-cols-1 gap-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
                            <div className="font-medium">{state.getName()}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                            <div className="font-medium">{props.user.email}</div>
                        </div>
                    </div>
                </div>

                {/* Company Information */}
                <Show when={state.shouldShowCompanyInfo() && state.getActiveCompany()}>
                    <div className="user-details__company rounded-lg bg-card text-card-foreground shadow-sm">
                        <div className="p-6 pb-2">
                            <h3 className="text-lg font-semibold">Company Information</h3>
                        </div>
                        <div className="p-6 pt-2 space-y-4">
                            <div className="grid grid-cols-1 gap-1">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company Name</label>
                                <div className="font-medium">{state.getActiveCompany()?.name}</div>
                            </div>
                            <Show when={state.getActiveCompany()?.taxNumber}>
                                <div className="grid grid-cols-1 gap-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tax Number</label>
                                    <div className="font-medium">{state.getActiveCompany()?.taxNumber}</div>
                                </div>
                            </Show>
                            <Show when={state.getActiveCompany()?.cocNumber}>
                                <div className="grid grid-cols-1 gap-1">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CoC Number</label>
                                    <div className="font-medium">{state.getActiveCompany()?.cocNumber}</div>
                                </div>
                            </Show>
                        </div>
                    </div>
                </Show>

                {/* All Companies List */}
                <Show when={state.shouldListCompanies() && state.getCompanies().length > 0}>
                    <div className="user-details__companies rounded-lg bg-card text-card-foreground shadow-sm">
                        <div className="p-6 pb-2">
                            <h3 className="text-lg font-semibold">Companies</h3>
                        </div>
                        <div className="p-6 pt-2">
                            <ul className="space-y-2">
                                <For each={state.getCompanies()}>
                                    {(company: Company) => (
                                        <li
                                            key={String(company.companyId)}
                                            className={`flex items-center gap-2 py-2 px-3 rounded-md ${state.getActiveCompany()?.companyId === company.companyId
                                                ? 'bg-primary/10 font-semibold text-primary'
                                                : 'text-foreground'
                                                }`}
                                        >
                                            <span className="truncate">{company.name}</span>
                                            <Show when={state.getActiveCompany()?.companyId === company.companyId}>
                                                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Active</span>
                                            </Show>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </div>
                    </div>
                </Show>

                {/* Default Addresses */}
                <Show when={state.shouldShowInvoiceAddress() || state.shouldShowDeliveryAddress()}>
                    <div className="user-details__addresses rounded-lg bg-card text-card-foreground shadow-sm">
                        <div className="p-6 pb-2">
                            <h3 className="text-lg font-semibold">Default Addresses</h3>
                        </div>
                        <div className="p-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Invoice Address */}
                                <Show when={state.shouldShowInvoiceAddress()}>
                                    <div className="space-y-3">
                                        <h4 className="text-base font-bold">Invoice Address</h4>
                                        <Show when={state.getDefaultInvoiceAddress()}>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <Show when={state.getDefaultInvoiceAddress()?.company}>
                                                    <div className="font-bold text-lg mb-1">{state.getDefaultInvoiceAddress()?.company}</div>
                                                </Show>
                                                <Show when={state.getAddressName(state.getDefaultInvoiceAddress()!)}>
                                                    <div className="font-medium mb-1">{state.getAddressName(state.getDefaultInvoiceAddress()!)}</div>
                                                </Show>
                                                <div className="text-gray-600">{state.getAddressLine1(state.getDefaultInvoiceAddress()!)}</div>
                                                <div className="text-gray-600">{state.getAddressLine2(state.getDefaultInvoiceAddress()!)}</div>
                                                <Show when={state.getDefaultInvoiceAddress()?.country}>
                                                    <div className="text-gray-600">{state.getCountryName(state.getDefaultInvoiceAddress()?.country || '')}</div>
                                                </Show>
                                            </div>
                                        </Show>
                                        <Show when={!state.getDefaultInvoiceAddress()}>
                                            <p className="text-gray-500 italic">No invoice address found</p>
                                        </Show>
                                    </div>
                                </Show>

                                {/* Delivery Address */}
                                <Show when={state.shouldShowDeliveryAddress()}>
                                    <div className="space-y-3">
                                        <h4 className="text-base font-bold">Delivery Address</h4>
                                        <Show when={state.getDefaultDeliveryAddress()}>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                                                <Show when={state.getDefaultDeliveryAddress()?.company}>
                                                    <div className="font-bold text-lg mb-1">{state.getDefaultDeliveryAddress()?.company}</div>
                                                </Show>
                                                <Show when={state.getAddressName(state.getDefaultDeliveryAddress()!)}>
                                                    <div className="font-medium mb-1">{state.getAddressName(state.getDefaultDeliveryAddress()!)}</div>
                                                </Show>
                                                <div className="text-gray-600">{state.getAddressLine1(state.getDefaultDeliveryAddress()!)}</div>
                                                <div className="text-gray-600">{state.getAddressLine2(state.getDefaultDeliveryAddress()!)}</div>
                                                <Show when={state.getDefaultDeliveryAddress()?.country}>
                                                    <div className="text-gray-600">{state.getCountryName(state.getDefaultDeliveryAddress()?.country || '')}</div>
                                                </Show>
                                            </div>
                                        </Show>
                                        <Show when={!state.getDefaultDeliveryAddress()}>
                                            <p className="text-gray-500 italic">No delivery address found</p>
                                        </Show>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </div>
                </Show>
            </Show>
        </div>
    );
}
