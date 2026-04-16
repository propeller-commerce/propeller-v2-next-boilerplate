import {
    useStore,
    Show,
    For,
    onMount,
    onUpdate,
} from '@builder.io/mitosis';
import {
    GraphQLClient,
    Address,
    CartAddress,
    WarehouseAddress,
    OrderAddress,
    Enums
} from 'propeller-sdk-v2';

export interface AddressCardProps {
    /** GraphQL client for the Propeller SDK (only needed when editing) */
    graphqlClient?: GraphQLClient;

    /** The address to display (Address | CartAddress | WarehouseAddress | OrderAddress) */
    address: Address | CartAddress | WarehouseAddress | OrderAddress | null;

    /** Display company name @default true */
    showCompanyName?: boolean;

    /** Display salutation (Mr./Mrs.) @default true */
    showSalutation?: boolean;

    /** Display full name @default true */
    showFullName?: boolean;

    /** Display street @default true */
    showStreet?: boolean;

    /** Display house number and extension @default true */
    showNumberExtension?: boolean;

    /** Display postal code @default true */
    showPostalCode?: boolean;

    /** Display city @default true */
    showCity?: boolean;

    /** Display country name @default true */
    showCountry?: boolean;

    /** Display email @default false */
    showEmail?: boolean;

    /** Display phone @default false */
    showPhone?: boolean;

    /** Display action buttons (edit, delete, set default) @default true */
    enableActions?: boolean;

    /** Display Edit button @default true */
    enableEdit?: boolean;

    /** Display Delete button @default true */
    enableDelete?: boolean;

    /** Display Set Default button @default true */
    enableSetDefault?: boolean;

    /** Display the "Default ... Address" badge @default false */
    showDefaultBadge?: boolean;

    /** Called when address is edited; receives the updated address object */
    onEdit?: (address: Address) => void | Promise<void>;

    /** Called after address edit completes */
    afterEdit?: (address: Address) => void | Promise<void>;

    /** Called when address is deleted; receives the address ID */
    onDelete?: (addressId: Address) => void;

    /** Called after address deletion completes */
    afterDelete?: (addressId: Address) => void;

    /** Called when address is set as default */
    onSetDefault?: (address: Address) => void;

    /** Called after address is set as default */
    afterSetDefault?: (address: Address) => void;

    /** List of countries for the country dropdown [{code: 'NL', name: 'Netherlands'}, ...] */
    countries?: { code: string; name: string }[];

    /** When true, renders in "new address" mode: auto-opens the edit form, hides the card body */
    isNew?: boolean;

    /** Called when the form is cancelled in new mode */
    onCancel?: () => void;

    /** When true, renders the form inline instead of in a modal overlay. @default false */
    inline?: boolean;

    /** Address type for new addresses (e.g., 'DELIVERY', 'INVOICE'). Used when creating, not editing. */
    addressType?: string;

    /** Show ICP/ICS (intra-community supply) checkbox. @default false */
    showIcp?: boolean;

    /** Title for the form or section */
    title?: string;

    /** Labels for form fields and buttons */
    labels?: Record<string, string>;

    /** Called before save starts */
    beforeSave?: () => void;
}

interface AddressCardState {
    showEditModal: boolean;
    showDeleteConfirm: boolean;
    localAddress: any;
    editCompany: string;
    editGender: Enums.Gender;
    editFirstName: string;
    editMiddleName: string;
    editLastName: string;
    editStreet: string;
    editNumber: string;
    editNumberExtension: string;
    editPostalCode: string;
    editCity: string;
    editCountry: string;
    editEmail: string;
    editPhone: string;
    editNotes: string;
    editIcp: Enums.YesNo;
    saving: boolean;
    getLabel: (key: string, fallback: string) => string;
    getCountryName: (code: string) => string;
    addr: any;
    showCard: boolean;
    salutation: string;
    fullName: string;
    streetLine: string;
    cityLine: string;
    formTitle: string;
    openEditModal: () => void;
    handleSaveEdit: (e: any) => Promise<void>;
    confirmDelete: () => void;
    handleSetDefault: () => void;
    closeEditModal: () => void;
}

export default function AddressCard(props: AddressCardProps) {
    const state = useStore<AddressCardState>({
        showEditModal: false,
        showDeleteConfirm: false,
        saving: false,
        localAddress: null as any,
        editCompany: '',
        editGender: Enums.Gender.U,
        editFirstName: '',
        editMiddleName: '',
        editLastName: '',
        editStreet: '',
        editNumber: '',
        editNumberExtension: '',
        editPostalCode: '',
        editCity: '',
        editCountry: '',
        editEmail: '',
        editPhone: '',
        editNotes: '',
        editIcp: Enums.YesNo.N,

        getLabel(key: string, fallback: string) {
            return (props.labels as any)?.[key] || fallback;
        },

        getCountryName(code: string): string {
            if (!code) return '';
            const list = props.countries || [];
            for (let i = 0; i < list.length; i++) {
                if (list[i].code === code) return list[i].name;
            }
            return code;
        },

        /** Returns the address to display: local optimistic state or props */
        get addr(): any {
            return state.localAddress || props.address;
        },

        get showCard(): boolean {
            if (props.isNew) return false;
            if (props.inline && !props.address) return false;
            return true;
        },

        get salutation(): string {
            const g = state.addr?.gender;
            if (g === 'M') return 'Mr.';
            if (g === 'F') return 'Mrs.';
            return '';
        },

        get fullName(): string {
            const parts: string[] = [];
            if (props.showSalutation !== false && state.salutation) {
                parts.push(state.salutation);
            }
            if (state.addr?.firstName) parts.push(state.addr.firstName);
            if (state.addr?.middleName) parts.push(state.addr.middleName);
            if (state.addr?.lastName) parts.push(state.addr.lastName);
            return parts.join(' ');
        },

        get streetLine(): string {
            const parts: string[] = [];
            if (state.addr?.street) parts.push(state.addr.street);
            if (props.showNumberExtension !== false) {
                if (state.addr?.number) parts.push(state.addr.number);
                if (state.addr?.numberExtension) parts.push(state.addr.numberExtension);
            }
            return parts.join(' ');
        },

        get cityLine(): string {
            const parts: string[] = [];
            if (props.showPostalCode !== false && state.addr?.postalCode) {
                parts.push(state.addr.postalCode);
            }
            if (props.showCity !== false && state.addr?.city) {
                parts.push(state.addr.city);
            }
            return parts.join(' ');
        },

        get formTitle(): string {
            if (props.title) return props.title;
            if (props.isNew) return state.getLabel('newTitle', 'New Address');
            return state.getLabel('editTitle', 'Edit Address');
        },

        openEditModal() {
            const a = state.addr;
            state.editCompany = a?.company || '';
            state.editGender = a?.gender || 'M';
            state.editFirstName = a?.firstName || '';
            state.editMiddleName = a?.middleName || '';
            state.editLastName = a?.lastName || '';
            state.editStreet = a?.street || '';
            state.editNumber = a?.number || '';
            state.editNumberExtension = a?.numberExtension || '';
            state.editPostalCode = a?.postalCode || '';
            state.editCity = a?.city || '';
            state.editCountry = a?.country || '';
            state.editEmail = a?.email || '';
            state.editPhone = a?.phone || '';
            state.editNotes = a?.notes || '';
            state.editIcp = a?.icp || Enums.YesNo.N;
            state.showEditModal = true;
        },

        async handleSaveEdit(e: any) {
            e.preventDefault();
            if (state.saving) return;
            state.saving = true;
            if (props.beforeSave) {
                props.beforeSave();
            }
            const editedAddress = {
                id: state.addr?.id,
                type: state.addr?.type || props.addressType || '',
                isDefault: state.addr?.isDefault,
                company: state.editCompany,
                gender: state.editGender,
                firstName: state.editFirstName,
                middleName: state.editMiddleName,
                lastName: state.editLastName,
                street: state.editStreet,
                number: state.editNumber,
                numberExtension: state.editNumberExtension,
                postalCode: state.editPostalCode,
                city: state.editCity,
                country: state.editCountry,
                email: state.editEmail,
                phone: state.editPhone,
                notes: state.editNotes,
                icp: state.editIcp as Enums.YesNo,
            } as unknown as Address;
            state.localAddress = editedAddress;
            try {
                if (props.onEdit) {
                    await props.onEdit(editedAddress);
                }
                state.showEditModal = false;
                if (props.afterEdit) {
                    await props.afterEdit(editedAddress);
                }
            } finally {
                state.saving = false;
            }
        },

        confirmDelete() {
            const id = state.addr?.id;
            if (id != null) {
                if (props.onDelete) {
                    props.onDelete(state.addr);
                }
                state.showDeleteConfirm = false;
                if (props.afterDelete) {
                    props.afterDelete(state.addr);
                }
            } else {
                state.showDeleteConfirm = false;
            }
        },

        handleSetDefault() {
            if (props.onSetDefault) {
                props.onSetDefault(state.addr);
            }
            if (props.afterSetDefault) {
                props.afterSetDefault(state.addr);
            }
        },

        closeEditModal() {
            state.showEditModal = false;
            if (props.isNew && props.onCancel) {
                props.onCancel();
            }
        },
    });

    onUpdate(() => {
        state.localAddress = null;
    }, [props.address]);

    onMount(() => {
        if (props.isNew || (props.inline && !props.address)) {
            state.openEditModal();
        }
    });

    return (
        <div>
            {/* Address Card */}
            <Show when={state.showCard}>
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
                    <div className="flex-grow">
                        <Show when={props.showCompanyName !== false && state.addr?.company}>
                            <div className="font-bold text-lg mb-1">{state.addr?.company}</div>
                        </Show>
                        <Show when={props.showFullName !== false && state.fullName}>
                            <div className="font-medium mb-1">{state.fullName}</div>
                        </Show>
                        <Show when={props.showStreet !== false && state.streetLine}>
                            <div className="text-gray-600">{state.streetLine}</div>
                        </Show>
                        <Show when={state.cityLine}>
                            <div className="text-gray-600">{state.cityLine}</div>
                        </Show>
                        <Show when={props.showCountry !== false && state.addr?.country}>
                            <div className="text-gray-600">{state.getCountryName(state.addr?.country)}</div>
                        </Show>
                        <Show when={!!props.showEmail && state.addr?.email}>
                            <div className="text-gray-600">{state.addr?.email}</div>
                        </Show>
                        <Show when={!!props.showPhone && state.addr?.phone}>
                            <div className="text-gray-600">{state.addr?.phone}</div>
                        </Show>

                        <Show when={props.showDefaultBadge === true && state.addr?.isDefault === 'Y'}>
                            <div className="mt-2">
                                <span className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded-full">
                                    Default {state.addr?.type} Address
                                </span>
                            </div>
                        </Show>
                    </div>

                    <Show when={props.enableActions !== false}>
                        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
                            <Show when={props.enableEdit !== false}>
                                <button
                                    className="text-primary hover:text-primary/80 text-sm font-medium"
                                    onClick={() => state.openEditModal()}
                                >
                                    {state.getLabel('edit', 'Edit')}
                                </button>
                            </Show>
                            <Show when={props.enableDelete !== false}>
                                <button
                                    className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                                    onClick={() => { state.showDeleteConfirm = true; }}
                                >
                                    {state.getLabel('delete', 'Delete')}
                                </button>
                            </Show>
                            <Show when={props.enableSetDefault !== false && state.addr?.isDefault !== 'Y'}>
                                <button
                                    className="text-primary hover:text-primary/80 text-sm font-medium ml-auto"
                                    onClick={() => state.handleSetDefault()}
                                >
                                    {state.getLabel('setDefault', 'Set Default')}
                                </button>
                            </Show>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Inline Form (no modal overlay) */}
            <Show when={props.inline && state.showEditModal}>
                <div className="bg-white p-6 rounded-lg border">
                    <form onSubmit={(e) => state.handleSaveEdit(e)}>
                        <Show when={!!state.formTitle}>
                            <h3 className="text-xl font-bold mb-4">{state.formTitle}</h3>
                        </Show>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('gender', 'Gender')}</label>
                                    <select
                                        value={state.editGender}
                                        onChange={(e) => { state.editGender = e.target.value as Enums.Gender; }}
                                        className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                                    >
                                        <option value="M">{state.getLabel('genderMale', 'Male')}</option>
                                        <option value="F">{state.getLabel('genderFemale', 'Female')}</option>
                                        <option value="U">{state.getLabel('genderOther', 'Other')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('company', 'Company')}</label>
                                    <input type="text" value={state.editCompany} onChange={(e) => { state.editCompany = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('firstName', 'First Name')} *</label>
                                    <input type="text" value={state.editFirstName} onChange={(e) => { state.editFirstName = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('middleName', 'Middle Name')}</label>
                                    <input type="text" value={state.editMiddleName} onChange={(e) => { state.editMiddleName = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('lastName', 'Last Name')} *</label>
                                    <input type="text" value={state.editLastName} onChange={(e) => { state.editLastName = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-8">
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('street', 'Street')} *</label>
                                    <input type="text" value={state.editStreet} onChange={(e) => { state.editStreet = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('number', 'Number')} *</label>
                                    <input type="text" value={state.editNumber} onChange={(e) => { state.editNumber = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('numberExtension', 'Ext')}</label>
                                    <input type="text" value={state.editNumberExtension} onChange={(e) => { state.editNumberExtension = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('postalCode', 'Postal Code')} *</label>
                                    <input type="text" value={state.editPostalCode} onChange={(e) => { state.editPostalCode = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('city', 'City')} *</label>
                                    <input type="text" value={state.editCity} onChange={(e) => { state.editCity = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{state.getLabel('country', 'Country')} *</label>
                                <select value={state.editCountry} onChange={(e) => { state.editCountry = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white" required>
                                    <option value="">{state.getLabel('selectCountry', 'Select country')}</option>
                                    <For each={props.countries || []}>
                                        {(c: any) => (
                                            <option key={c.code} value={c.code}>{c.name}</option>
                                        )}
                                    </For>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('email', 'Email')} *</label>
                                    <input type="email" value={state.editEmail} onChange={(e) => { state.editEmail = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('phone', 'Phone')}</label>
                                    <input type="tel" value={state.editPhone} onChange={(e) => { state.editPhone = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                </div>
                            </div>

                            <Show when={!!props.showIcp}>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="icp-inline"
                                        checked={state.editIcp === Enums.YesNo.Y}
                                        onChange={(e) => { state.editIcp = e.target.checked ? Enums.YesNo.Y : Enums.YesNo.N; }}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="icp-inline" className="text-sm font-medium">{state.getLabel('icp', 'ICP/ICS (Intra-Community Supply)')}</label>
                                </div>
                            </Show>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                            <Show when={!props.isNew}>
                                <button type="button" onClick={() => state.closeEditModal()} disabled={state.saving} className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50">
                                    {state.getLabel('cancel', 'Cancel')}
                                </button>
                            </Show>
                            <Show when={props.isNew && !!props.onCancel}>
                                <button type="button" onClick={() => state.closeEditModal()} disabled={state.saving} className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50">
                                    {state.getLabel('cancel', 'Cancel')}
                                </button>
                            </Show>
                            <button type="submit" disabled={state.saving} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">
                                {state.saving ? state.getLabel('saving', 'Saving...') : state.getLabel('save', 'Save')}
                            </button>
                        </div>
                    </form>
                </div>
            </Show>

            {/* Modal Form (with overlay) */}
            <Show when={!props.inline && state.showEditModal}>
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
                    <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 shadow-xl">
                        <form onSubmit={(e) => state.handleSaveEdit(e)}>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold">{state.formTitle}</h3>
                                <button type="button" onClick={() => state.closeEditModal()} className="text-gray-500 hover:text-gray-700 text-xl leading-none">
                                    &times;
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('gender', 'Gender')}</label>
                                        <select
                                            value={state.editGender}
                                            onChange={(e) => { state.editGender = e.target.value as Enums.Gender; }}
                                            className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                                        >
                                            <option value="M">{state.getLabel('genderMale', 'Male')}</option>
                                            <option value="F">{state.getLabel('genderFemale', 'Female')}</option>
                                            <option value="U">{state.getLabel('genderOther', 'Other')}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('company', 'Company')}</label>
                                        <input type="text" value={state.editCompany} onChange={(e) => { state.editCompany = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('firstName', 'First Name')} *</label>
                                        <input type="text" value={state.editFirstName} onChange={(e) => { state.editFirstName = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('middleName', 'Middle Name')}</label>
                                        <input type="text" value={state.editMiddleName} onChange={(e) => { state.editMiddleName = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('lastName', 'Last Name')} *</label>
                                        <input type="text" value={state.editLastName} onChange={(e) => { state.editLastName = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                    </div>
                                </div>

                                <div className="grid grid-cols-12 gap-4">
                                    <div className="col-span-8">
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('street', 'Street')} *</label>
                                        <input type="text" value={state.editStreet} onChange={(e) => { state.editStreet = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('number', 'Number')} *</label>
                                        <input type="text" value={state.editNumber} onChange={(e) => { state.editNumber = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('numberExtension', 'Ext')}</label>
                                        <input type="text" value={state.editNumberExtension} onChange={(e) => { state.editNumberExtension = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('postalCode', 'Postal Code')} *</label>
                                        <input type="text" value={state.editPostalCode} onChange={(e) => { state.editPostalCode = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('city', 'City')} *</label>
                                        <input type="text" value={state.editCity} onChange={(e) => { state.editCity = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">{state.getLabel('country', 'Country')} *</label>
                                    <select value={state.editCountry} onChange={(e) => { state.editCountry = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white" required>
                                        <option value="">{state.getLabel('selectCountry', 'Select country')}</option>
                                        <For each={props.countries || []}>
                                            {(c: any) => (
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            )}
                                        </For>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('email', 'Email')} *</label>
                                        <input type="email" value={state.editEmail} onChange={(e) => { state.editEmail = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{state.getLabel('phone', 'Phone')}</label>
                                        <input type="tel" value={state.editPhone} onChange={(e) => { state.editPhone = e.target.value; }} className="w-full h-10 px-3 rounded-md border border-gray-300" />
                                    </div>
                                </div>

                                <Show when={!!props.showIcp}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="icp-modal"
                                            checked={state.editIcp === Enums.YesNo.Y}
                                            onChange={(e) => { state.editIcp = e.target.checked ? Enums.YesNo.Y : Enums.YesNo.N; }}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="icp-modal" className="text-sm font-medium">{state.getLabel('icp', 'ICP/ICS (Intra-Community Supply)')}</label>
                                    </div>
                                </Show>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                                <button type="button" onClick={() => state.closeEditModal()} disabled={state.saving} className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50">
                                    {state.getLabel('cancel', 'Cancel')}
                                </button>
                                <button type="submit" disabled={state.saving} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-50">
                                    {state.saving ? state.getLabel('saving', 'Saving...') : state.getLabel('save', 'Save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </Show>

            {/* Delete Confirmation */}
            <Show when={state.showDeleteConfirm}>
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">{state.getLabel('confirmDeleteTitle', 'Confirm Delete')}</h3>
                        <p className="mb-6 text-gray-600">{state.getLabel('confirmDeleteMessage', 'Are you sure you want to delete this address?')}</p>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => { state.showDeleteConfirm = false; }} className="px-4 py-2 border rounded hover:bg-gray-100">
                                {state.getLabel('cancel', 'Cancel')}
                            </button>
                            <button onClick={() => state.confirmDelete()} className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80">
                                {state.getLabel('delete', 'Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
