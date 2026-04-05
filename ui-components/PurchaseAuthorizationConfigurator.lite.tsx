import {
    useStore,
    Show,
    For,
    onUpdate,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    GraphQLClient,
    Company,
    PurchaseAuthorizationConfig,
    CompanyService,
    PurchaseAuthorizationConfigService,
    UserService,
    RegisterContactInput,
    Enums,
} from 'propeller-sdk-v2';

export interface PurchaseAuthorizationConfiguratorProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** The logged-in user */
    user: Contact | Customer;

    /** The companyId of the current selected company */
    companyId: number;

    /**
     * Adds a button "Add contact" above the contacts list and enables registering contacts
     * @default true
     */
    allowContactCreate?: boolean;

    /** Fires before a contact is added to the company */
    beforeContactCreate?: (input: RegisterContactInput) => void;

    /** Override: fires instead of the default UserService.registerContact() call */
    onContactCreate?: (input: RegisterContactInput) => void;

    /** Fires after a contact is registered. If not provided, refreshes contacts list. */
    afterContactCreate?: (contact: Contact) => void;

    /** Override: fires instead of the default createPurchaseAuthorizationConfig() call */
    onPurchaseAuthorizationCreate?: (pac: PurchaseAuthorizationConfig) => void;

    /** Fires after a PAC is created. If not provided, refreshes contacts list. */
    afterPurchaseAuthorizationCreate?: (pac: PurchaseAuthorizationConfig) => void;

    /** Override: fires instead of the default updatePurchaseAuthorizationConfig() call */
    onPurchaseAuthorizationUpdate?: (pac: PurchaseAuthorizationConfig) => void;

    /** Fires after a PAC is updated. If not provided, refreshes contacts list. */
    afterPurchaseAuthorizationUpdate?: (pac: PurchaseAuthorizationConfig) => void;

    /** Override: fires instead of the default deletePurchaseAuthorizationConfig() call */
    onPurchaseAuthorizationDelete?: (pac: PurchaseAuthorizationConfig) => void;

    /** Fires after a PAC is deleted. If not provided, refreshes contacts list. */
    afterPurchaseAuthorizationDelete?: (deleted: boolean) => void;

    /** Labels for the component */
    labels?: Record<string, string>;

    /** Custom CSS class for the component */
    className?: string;

    /** Configuration object from the application */
    configuration?: Record<string, any>;
}

interface RowEdit {
    role: string;
    limit: number | undefined;
    dirty: boolean;
}

interface AddContactFormState {
    gender: string;
    email: string;
    firstName: string;
    middleName: string;
    lastName: string;
    phone: string;
}

interface PurchaseAuthorizationConfiguratorState {
    company: Company | null;
    loading: boolean;
    currentPage: number;
    pageOffset: number;
    rowEdits: Record<number, RowEdit>;
    pacMap: Record<number, PurchaseAuthorizationConfig>;
    actionLoading: Record<number, boolean>;
    showAddContactModal: boolean;
    addContactForm: AddContactFormState;
    addContactLoading: boolean;
    addContactError: string;
    isAuthManager: boolean;
    getContacts: () => any[];
    getTotalPages: () => number;
    getLabel: (key: string, fallback: string) => string;
    loadCompany: (page: number) => Promise<void>;
    buildMaps: (contacts: Contact[]) => void;
    handleRoleChange: (contactId: number, role: string) => void;
    handleLimitChange: (contactId: number, value: string) => void;
    handleCreate: (contactId: number) => Promise<void>;
    handleSave: (contactId: number) => Promise<void>;
    handleDelete: (contactId: number) => Promise<void>;
    handlePageChange: (page: number) => void;
    openAddContactModal: () => void;
    closeAddContactModal: () => void;
    handleAddContactSubmit: () => Promise<void>;
    hasPac: (contactId: number) => boolean;
    isCurrentUser: (contactId: number) => boolean;
    isRowDirty: (contactId: number) => boolean;
    getRowRole: (contactId: number) => string;
    getRowLimit: (contactId: number) => number | undefined;
    isRowLoading: (contactId: number) => boolean;
}

export default function PurchaseAuthorizationConfigurator(props: PurchaseAuthorizationConfiguratorProps) {
    const state = useStore<PurchaseAuthorizationConfiguratorState>({
        company: null,
        loading: true,
        currentPage: 1,
        pageOffset: 10,
        rowEdits: {} as Record<number, RowEdit>,
        pacMap: {} as Record<number, PurchaseAuthorizationConfig>,
        actionLoading: {} as Record<number, boolean>,
        showAddContactModal: false,
        addContactForm: {
            gender: '',
            email: '',
            firstName: '',
            middleName: '',
            lastName: '',
            phone: '',
        },
        addContactLoading: false,
        addContactError: '',

        get isAuthManager(): boolean {
            if (!props.user || !('contactId' in props.user)) return false;
            const pacData = (props.user as any).purchaseAuthorizationConfigs;
            const items: any[] = pacData?.items ?? pacData?._items ?? [];
            return items.some((pac: any) => {
                const role = pac.purchaseRole ?? pac._purchaseRole;
                const companyId = pac.company?.companyId ?? pac.company?._companyId ?? pac._company?.companyId ?? pac._company?._companyId;
                return role === Enums.PurchaseRole.AUTHORIZATION_MANAGER && companyId === props.companyId;
            });
        },

        getContacts(): any[] {
            if (!state.company) return [];
            const contactsData = (state.company as any).contacts ?? (state.company as any)._contacts;
            return contactsData?.items ?? contactsData?._items ?? [];
        },

        getTotalPages(): number {
            if (!state.company) return 0;
            const contactsData = (state.company as any).contacts ?? (state.company as any)._contacts;
            return contactsData?.pages ?? contactsData?._pages ?? 0;
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as any)?.[key] || fallback;
        },

        buildMaps(contacts: Contact[]): void {
            const newPacMap: Record<number, PurchaseAuthorizationConfig> = {};
            const newRowEdits: Record<number, RowEdit> = {};
            contacts.forEach((contact: any) => {
                const cId: number = contact.contactId ?? contact._contactId;
                const pacData = contact.purchaseAuthorizationConfigs ?? contact._purchaseAuthorizationConfigs;
                const pacItems: PurchaseAuthorizationConfig[] = pacData?.items ?? pacData?._items ?? [];
                if (pacItems.length > 0) {
                    newPacMap[cId] = pacItems[0];
                }
                const pac = newPacMap[cId];
                newRowEdits[cId] = {
                    role: pac ? ((pac as any).purchaseRole ?? (pac as any)._purchaseRole ?? '') : '',
                    limit: pac ? ((pac as any).authorizationLimit ?? (pac as any)._authorizationLimit) : undefined,
                    dirty: false,
                };
            });
            state.pacMap = newPacMap;
            state.rowEdits = newRowEdits;
        },

        async loadCompany(page: number): Promise<void> {
            if (!props.graphqlClient || !props.companyId) return;
            state.loading = true;
            try {
                const companyService = new CompanyService(props.graphqlClient);
                const company = await companyService.getCompany({
                    id: props.companyId,
                    $contactSearchArguments: { page: page, offset: state.pageOffset },
                    $contactPAConfigInput: { companyIds: [props.companyId], page: 1, offset: 100 },
                    $contactAttributesInput: {} as any,
                    $companyAttributesInput: {} as any,
                });
                state.company = company;
                // Extract contacts directly from the fetched result (not via state.getContacts())
                // to avoid reading stale state before React flushes the company assignment.
                const freshContactsData = (company as any).contacts ?? (company as any)._contacts;
                const freshContacts: Contact[] = freshContactsData?.items ?? freshContactsData?._items ?? [];
                state.buildMaps(freshContacts);
            } finally {
                state.loading = false;
            }
        },

        handleRoleChange(contactId: number, role: string): void {
            const current = state.rowEdits[contactId] || { role: '', limit: undefined, dirty: false };
            state.rowEdits = {
                ...state.rowEdits,
                [contactId]: { ...current, role, dirty: true },
            };
        },

        handleLimitChange(contactId: number, value: string): void {
            const current = state.rowEdits[contactId] || { role: '', limit: undefined, dirty: false };
            const limit = value === '' ? undefined : Number(value);
            state.rowEdits = {
                ...state.rowEdits,
                [contactId]: { ...current, limit, dirty: true },
            };
        },

        async handleCreate(contactId: number): Promise<void> {
            state.actionLoading = { ...state.actionLoading, [contactId]: true };
            try {
                const edit = state.rowEdits[contactId] || { role: Enums.PurchaseRole.PURCHASER, limit: undefined, dirty: false };
                const input = {
                    contactId,
                    companyId: props.companyId,
                    purchaseRole: (edit.role || Enums.PurchaseRole.PURCHASER) as Enums.PurchaseRole,
                    authorizationLimit: edit.limit,
                };
                if (props.onPurchaseAuthorizationCreate) {
                    props.onPurchaseAuthorizationCreate(input as any);
                } else {
                    const pacService = new PurchaseAuthorizationConfigService(props.graphqlClient);
                    const pac = await pacService.createPurchaseAuthorizationConfig(input);
                    if (props.afterPurchaseAuthorizationCreate) {
                        props.afterPurchaseAuthorizationCreate(pac);
                    } else {
                        await state.loadCompany(state.currentPage);
                    }
                }
            } finally {
                state.actionLoading = { ...state.actionLoading, [contactId]: false };
            }
        },

        async handleSave(contactId: number): Promise<void> {
            const pac = state.pacMap[contactId];
            if (!pac) return;
            state.actionLoading = { ...state.actionLoading, [contactId]: true };
            try {
                const edit = state.rowEdits[contactId];
                const pacId: string = (pac as any).id ?? (pac as any)._id;
                if (props.onPurchaseAuthorizationUpdate) {
                    props.onPurchaseAuthorizationUpdate(pac);
                } else {
                    const pacService = new PurchaseAuthorizationConfigService(props.graphqlClient);
                    const updated = await pacService.updatePurchaseAuthorizationConfig(pacId, {
                        purchaseRole: (edit.role || (pac as any).purchaseRole) as Enums.PurchaseRole,
                        authorizationLimit: edit.limit,
                    });
                    if (props.afterPurchaseAuthorizationUpdate) {
                        props.afterPurchaseAuthorizationUpdate(updated);
                    } else {
                        await state.loadCompany(state.currentPage);
                    }
                }
            } finally {
                state.actionLoading = { ...state.actionLoading, [contactId]: false };
            }
        },

        async handleDelete(contactId: number): Promise<void> {
            const pac = state.pacMap[contactId];
            if (!pac) return;
            state.actionLoading = { ...state.actionLoading, [contactId]: true };
            try {
                const pacId: string = (pac as any).id ?? (pac as any)._id;
                if (props.onPurchaseAuthorizationDelete) {
                    props.onPurchaseAuthorizationDelete(pac);
                } else {
                    const pacService = new PurchaseAuthorizationConfigService(props.graphqlClient);
                    const deleted = await pacService.deletePurchaseAuthorizationConfig(pacId);
                    if (props.afterPurchaseAuthorizationDelete) {
                        props.afterPurchaseAuthorizationDelete(deleted);
                    } else {
                        await state.loadCompany(state.currentPage);
                    }
                }
            } finally {
                state.actionLoading = { ...state.actionLoading, [contactId]: false };
            }
        },

        handlePageChange(page: number): void {
            state.currentPage = page;
        },

        openAddContactModal(): void {
            state.addContactError = '';
            state.showAddContactModal = true;
        },

        closeAddContactModal(): void {
            state.showAddContactModal = false;
            state.addContactError = '';
            state.addContactForm = {
                gender: '',
                email: '',
                firstName: '',
                middleName: '',
                lastName: '',
                phone: '',
            };
        },

        async handleAddContactSubmit(): Promise<void> {
            state.addContactLoading = true;
            state.addContactError = '';
            try {
                const input: RegisterContactInput = {
                    parentId: props.companyId,
                    gender: state.addContactForm.gender as Enums.Gender,
                    email: state.addContactForm.email,
                    firstName: state.addContactForm.firstName,
                    middleName: state.addContactForm.middleName,
                    lastName: state.addContactForm.lastName,
                    phone: state.addContactForm.phone,
                };
                if (props.beforeContactCreate) {
                    props.beforeContactCreate(input);
                }
                if (props.onContactCreate) {
                    props.onContactCreate(input);
                } else {
                    const userService = new UserService(props.graphqlClient);
                    const result = await userService.registerContact({ contactRegisterInput: input } as any);
                    const contact = (result as any).contact ?? (result as any)._contact ?? result;
                    if (props.afterContactCreate) {
                        props.afterContactCreate(contact as Contact);
                    } else {
                        await state.loadCompany(state.currentPage);
                    }
                }
                state.closeAddContactModal();
            } catch (err: any) {
                state.addContactError = err?.message || 'Failed to create contact';
            } finally {
                state.addContactLoading = false;
            }
        },

        hasPac(contactId: number): boolean {
            return !!state.pacMap[contactId];
        },

        isCurrentUser(contactId: number): boolean {
            const userId = (props.user as any).contactId ?? (props.user as any)._contactId;
            return userId === contactId;
        },

        isRowDirty(contactId: number): boolean {
            return !!state.rowEdits[contactId]?.dirty;
        },

        getRowRole(contactId: number): string {
            return state.rowEdits[contactId]?.role ?? '';
        },

        getRowLimit(contactId: number): number | undefined {
            return state.rowEdits[contactId]?.limit;
        },

        isRowLoading(contactId: number): boolean {
            return !!state.actionLoading[contactId];
        },
    });

    onUpdate(() => {
        if (props.graphqlClient && props.companyId) {
            state.loadCompany(state.currentPage);
        }
    }, [props.companyId, state.currentPage]);

    return (
        <div className={`purchase-authorization-configurator ${props.className || ''}`}>
            <Show when={state.isAuthManager}>
                <div className="space-y-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                            {state.getLabel('title', 'Purchase Authorization Settings')}
                        </h2>
                        <Show when={props.allowContactCreate !== false}>
                            <button
                                type="button"
                                onClick={() => state.openAddContactModal()}
                                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition text-sm font-medium"
                            >
                                {state.getLabel('addContact', 'Add contact')}
                            </button>
                        </Show>
                    </div>

                    {/* Loading state */}
                    <Show when={state.loading}>
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    </Show>

                    {/* Contacts table */}
                    <Show when={!state.loading}>
                        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                            {state.getLabel('colId', 'ID')}
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                            {state.getLabel('colName', 'Name')}
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                            {state.getLabel('colRole', 'Role')}
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                            {state.getLabel('colLimit', 'Limit')}
                                        </th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                            {state.getLabel('colActions', 'Actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <For each={state.getContacts()}>
                                        {(contact: any) => (
                                            <tr key={contact.contactId ?? contact._contactId} className="hover:bg-muted/30 transition-colors">
                                                {/* ID */}
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {contact.contactId ?? contact._contactId}
                                                </td>

                                                {/* Name + Email */}
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {[contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(' ')}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {contact.email ?? contact._email}
                                                    </div>
                                                </td>

                                                {/* Role */}
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={state.getRowRole(contact.contactId ?? contact._contactId)}
                                                        disabled={state.isCurrentUser(contact.contactId ?? contact._contactId)}
                                                        onChange={(e: any) => state.handleRoleChange(contact.contactId ?? contact._contactId, e.target.value)}
                                                        className="border border-input rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <option value="">{state.getLabel('selectRole', '— Select role —')}</option>
                                                        <option value={Enums.PurchaseRole.PURCHASER}>{state.getLabel('rolePurchaser', 'Purchaser')}</option>
                                                        <option value={Enums.PurchaseRole.AUTHORIZATION_MANAGER}>{state.getLabel('roleManager', 'Authorization Manager')}</option>
                                                    </select>
                                                </td>

                                                {/* Limit */}
                                                <td className="px-4 py-3">
                                                    <Show when={state.getRowRole(contact.contactId ?? contact._contactId) === Enums.PurchaseRole.PURCHASER}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={state.getRowLimit(contact.contactId ?? contact._contactId) ?? ''}
                                                            disabled={state.isCurrentUser(contact.contactId ?? contact._contactId)}
                                                            onChange={(e: any) => state.handleLimitChange(contact.contactId ?? contact._contactId, e.target.value)}
                                                            placeholder={state.getLabel('limitPlaceholder', '0.00')}
                                                            className="w-28 border border-input rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                                        />
                                                    </Show>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {/* Save — only when PAC exists and row is dirty */}
                                                        <Show when={state.hasPac(contact.contactId ?? contact._contactId) && state.isRowDirty(contact.contactId ?? contact._contactId)}>
                                                            <button
                                                                type="button"
                                                                disabled={state.isRowLoading(contact.contactId ?? contact._contactId)}
                                                                onClick={() => state.handleSave(contact.contactId ?? contact._contactId)}
                                                                className="text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Show when={state.isRowLoading(contact.contactId ?? contact._contactId)}>
                                                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                                                </Show>
                                                                {state.getLabel('save', 'Save')}
                                                            </button>
                                                        </Show>

                                                        {/* Create — only when no PAC exists */}
                                                        <Show when={!state.hasPac(contact.contactId ?? contact._contactId)}>
                                                            <button
                                                                type="button"
                                                                disabled={state.isRowLoading(contact.contactId ?? contact._contactId) || !state.getRowRole(contact.contactId ?? contact._contactId)}
                                                                onClick={() => state.handleCreate(contact.contactId ?? contact._contactId)}
                                                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Show when={state.isRowLoading(contact.contactId ?? contact._contactId)}>
                                                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                                                </Show>
                                                                {state.getLabel('create', 'Create')}
                                                            </button>
                                                        </Show>

                                                        {/* Delete — only when PAC exists, disabled for current user */}
                                                        <Show when={state.hasPac(contact.contactId ?? contact._contactId)}>
                                                            <button
                                                                type="button"
                                                                disabled={state.isRowLoading(contact.contactId ?? contact._contactId) || state.isCurrentUser(contact.contactId ?? contact._contactId)}
                                                                onClick={() => state.handleDelete(contact.contactId ?? contact._contactId)}
                                                                className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Show when={state.isRowLoading(contact.contactId ?? contact._contactId)}>
                                                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                                                </Show>
                                                                {state.getLabel('delete', 'Delete')}
                                                            </button>
                                                        </Show>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <Show when={state.getTotalPages() > 1}>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={state.currentPage <= 1}
                                    onClick={() => state.handlePageChange(state.currentPage - 1)}
                                    className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {state.getLabel('previous', 'Previous')}
                                </button>
                                <span className="text-sm text-muted-foreground">
                                    {state.getLabel('page', 'Page')} {state.currentPage} {state.getLabel('of', 'of')} {state.getTotalPages()}
                                </span>
                                <button
                                    type="button"
                                    disabled={state.currentPage >= state.getTotalPages()}
                                    onClick={() => state.handlePageChange(state.currentPage + 1)}
                                    className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {state.getLabel('next', 'Next')}
                                </button>
                            </div>
                        </Show>
                    </Show>
                </div>

                {/* Add Contact Modal */}
                <Show when={state.showAddContactModal}>
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        onClick={() => state.closeAddContactModal()}
                    >
                        <div
                            className="bg-background rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4"
                            onClick={(e: any) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    {state.getLabel('addContactTitle', 'Add Contact')}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => state.closeAddContactModal()}
                                    className="text-muted-foreground hover:text-foreground transition"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Company name (read-only) */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {state.getLabel('companyName', 'Company')}
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value={(state.company as any)?.name ?? (state.company as any)?._name ?? ''}
                                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-muted cursor-not-allowed"
                                />
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {state.getLabel('gender', 'Gender')}
                                </label>
                                <select
                                    value={state.addContactForm.gender}
                                    onChange={(e: any) => { state.addContactForm = { ...state.addContactForm, gender: e.target.value }; }}
                                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">{state.getLabel('selectGender', '— Select —')}</option>
                                    <option value={Enums.Gender.M}>{state.getLabel('genderM', 'Male')}</option>
                                    <option value={Enums.Gender.F}>{state.getLabel('genderF', 'Female')}</option>
                                    <option value={Enums.Gender.U}>{state.getLabel('genderU', 'Unspecified')}</option>
                                </select>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {state.getLabel('email', 'Email')} *
                                </label>
                                <input
                                    type="email"
                                    value={state.addContactForm.email}
                                    onChange={(e: any) => { state.addContactForm = { ...state.addContactForm, email: e.target.value }; }}
                                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* First / Middle / Last name */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        {state.getLabel('firstName', 'First name')}
                                    </label>
                                    <input
                                        type="text"
                                        value={state.addContactForm.firstName}
                                        onChange={(e: any) => { state.addContactForm = { ...state.addContactForm, firstName: e.target.value }; }}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        {state.getLabel('middleName', 'Middle')}
                                    </label>
                                    <input
                                        type="text"
                                        value={state.addContactForm.middleName}
                                        onChange={(e: any) => { state.addContactForm = { ...state.addContactForm, middleName: e.target.value }; }}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">
                                        {state.getLabel('lastName', 'Last name')}
                                    </label>
                                    <input
                                        type="text"
                                        value={state.addContactForm.lastName}
                                        onChange={(e: any) => { state.addContactForm = { ...state.addContactForm, lastName: e.target.value }; }}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    {state.getLabel('phone', 'Phone')}
                                </label>
                                <input
                                    type="tel"
                                    value={state.addContactForm.phone}
                                    onChange={(e: any) => { state.addContactForm = { ...state.addContactForm, phone: e.target.value }; }}
                                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {/* Error */}
                            <Show when={!!state.addContactError}>
                                <p className="text-sm text-red-600">{state.addContactError}</p>
                            </Show>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => state.closeAddContactModal()}
                                    className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition"
                                >
                                    {state.getLabel('cancel', 'Cancel')}
                                </button>
                                <button
                                    type="button"
                                    disabled={state.addContactLoading || !state.addContactForm.email}
                                    onClick={() => state.handleAddContactSubmit()}
                                    className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Show when={state.addContactLoading}>
                                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </Show>
                                    {state.getLabel('addContactSubmit', 'Add Contact')}
                                </button>
                            </div>
                        </div>
                    </div>
                </Show>
            </Show>
        </div>
    );
}
