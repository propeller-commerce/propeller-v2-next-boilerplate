import {
    useStore,
    Show,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    GraphQLClient,
    UserService,
    CompanyService,
    AddressService,
    RegisterContactResponse,
    RegisterCustomerResponse,
    Enums,
    Company,
    ContactRegisterInput,
    CustomerRegisterInput,
    CreateCompanyInput,
    CustomerAddressCreateInput,
    CompanyAddressCreateInput
} from 'propeller-sdk-v2';

export interface RegisterFormProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** Title of the register form
     * @default "Create account"
     */
    title?: string;

    /** Subtitle of the register form
     * @default ""
     */
    subtitle?: string;

    /** Label for the submit button
     * @default "Register"
     */
    buttonText?: string;

    /**
     * Enable choosing between Contact or Customer if null,
     * otherwise proceed with one user type registration only.
     * 'Contact' = Company account (has company name, VAT, CoC fields)
     * 'Customer' = Consumer/personal account
     * @default null
     */
    showUserType?: 'Contact' | 'Customer' | null;

    /**
     * Required fields for the registration form.
     * Available field names: firstName, middleName, lastName, email, password,
     * phone, mobile, gender, companyName, vatNumber, cocNumber,
     * street, number, numberExtension, postalCode, city, country
     * @default []
     */
    requiredFields?: string[];

    /**
     * Contact or Customer is automatically logged in upon registration.
     * @default true
     */
    automaticLogin?: boolean;

    /**
     * Labels for the registration form fields.
     *
     * Available keys:
     * - firstName, middleName, lastName, email, password, confirmPassword
     * - phone, gender, companyName, vatNumber, cocNumber
     * - street, number, numberExtension, postalCode, city, country
     * - userTypeLabel, contactLabel, customerLabel
     * - emailPlaceholder, passwordPlaceholder, passwordMismatch
     * - billingAddressTitle, deliveryAddressTitle, sameAsDelivery
     * - loginText, loginLink
     * - personalDetailsTitle, passwordTitle
     */
    labels?: Record<string, string>;

    /** Callback before the registration process starts */
    beforeRegistration?: () => void;

    /** Callback after the user is registered */
    afterRegistration?: (user: Contact | Customer, accessToken?: string, refreshToken?: string, expiresAt?: string) => void;

    /** Action for the login link click */
    onLoginClick?: () => void;

    /** Show/hide the login link
     * @default true
     */
    displayLoginLink?: boolean;

    /**
     * Prefered language
     * @default 'NL'
     */
    preferredLanguage?: string;

    /**
     * List of countries to display in the country dropdown
     * @default {}
     */
    countries?: Record<string, string>;
}

export default function RegisterForm(props: RegisterFormProps) {
    const state = useStore({
        // Personal details
        _firstName: '',
        _middleName: '',
        _lastName: '',
        _email: '',
        _password: '',
        _confirmPassword: '',
        _phone: '',
        _gender: Enums.Gender.U,

        // Company fields (Contact only)
        _companyName: '',
        _vatNumber: '',
        _cocNumber: '',

        // Billing/Invoice address
        _billingStreet: '',
        _billingNumber: '',
        _billingNumberExtension: '',
        _billingPostalCode: '',
        _billingCity: '',
        _billingCountry: '',

        // Delivery address
        _sameAsDelivery: true,
        _deliveryStreet: '',
        _deliveryNumber: '',
        _deliveryNumberExtension: '',
        _deliveryPostalCode: '',
        _deliveryCity: '',
        _deliveryCountry: '',

        // User type
        _selectedUserType: '' as '' | 'Contact' | 'Customer',

        // State
        _loading: false,
        _error: '',
        _submitted: false,

        get resolvedTitle(): string {
            return props.title !== undefined ? props.title : 'Create account';
        },
        get resolvedButtonText(): string {
            return props.buttonText || 'Register';
        },
        get showUserTypeSelector(): boolean {
            return props.showUserType === undefined || props.showUserType === null;
        },
        get effectiveUserType(): string {
            if (props.showUserType) return props.showUserType;
            return state._selectedUserType;
        },
        get isContact(): boolean {
            return state.effectiveUserType === 'Contact';
        },
        get isCustomer(): boolean {
            return state.effectiveUserType === 'Customer';
        },
        get showLoginLink(): boolean {
            return props.displayLoginLink !== false;
        },

        // Section labels
        get personalDetailsTitle(): string { return props.labels?.personalDetailsTitle || 'Your details'; },
        get billingAddressTitle(): string { return props.labels?.billingAddressTitle || 'Billing address'; },
        get deliveryAddressTitle(): string { return props.labels?.deliveryAddressTitle || 'Delivery address'; },
        get passwordTitle(): string { return props.labels?.passwordTitle || 'Password'; },
        get sameAsDeliveryLabel(): string { return props.labels?.sameAsDelivery || 'Delivery address is the same as billing address'; },

        // Field labels
        get firstNameLabel(): string { return props.labels?.firstName || 'First name'; },
        get middleNameLabel(): string { return props.labels?.middleName || 'Insertion'; },
        get lastNameLabel(): string { return props.labels?.lastName || 'Last name'; },
        get emailLabel(): string { return props.labels?.email || 'Email address'; },
        get passwordLabel(): string { return props.labels?.password || 'Password'; },
        get confirmPasswordLabel(): string { return props.labels?.confirmPassword || 'Repeat password'; },
        get phoneLabel(): string { return props.labels?.phone || 'Phone number'; },
        get genderLabel(): string { return props.labels?.gender || 'Title'; },
        get companyNameLabel(): string { return props.labels?.companyName || 'Company name'; },
        get vatNumberLabel(): string { return props.labels?.vatNumber || 'VAT number'; },
        get cocNumberLabel(): string { return props.labels?.cocNumber || 'CoC number'; },
        get streetLabel(): string { return props.labels?.street || 'Street'; },
        get numberLabel(): string { return props.labels?.number || 'Number'; },
        get numberExtensionLabel(): string { return props.labels?.numberExtension || 'Apt/Suite/Unit'; },
        get postalCodeLabel(): string { return props.labels?.postalCode || 'Postal code'; },
        get cityLabel(): string { return props.labels?.city || 'City'; },
        get countryLabel(): string { return props.labels?.country || 'Country'; },
        get userTypeLabel(): string { return props.labels?.userTypeLabel || 'Account type'; },
        get contactLabel(): string { return props.labels?.contactLabel || 'Company'; },
        get customerLabel(): string { return props.labels?.customerLabel || 'Consumer'; },
        get emailPlaceholder(): string { return props.labels?.emailPlaceholder || 'name@example.com'; },
        get passwordPlaceholder(): string { return props.labels?.passwordPlaceholder || '••••••••'; },
        get passwordMismatchText(): string { return props.labels?.passwordMismatch || 'Passwords do not match'; },
        get loginText(): string { return props.labels?.loginText || 'Already have an account?'; },
        get loginLinkText(): string { return props.labels?.loginLink || 'Log in'; },

        isFieldRequired(fieldName: string): boolean {
            if (!props.requiredFields) return false;
            return props.requiredFields.indexOf(fieldName) !== -1;
        },

        async handleSubmit(e: Event | any) {
            e.preventDefault();

            if (!state.effectiveUserType) {
                state._error = 'Please select an account type.';
                return;
            }

            if (state._password !== state._confirmPassword) {
                state._error = state.passwordMismatchText;
                return;
            }

            if (state._loading) return;

            if (props.beforeRegistration) {
                props.beforeRegistration();
            }

            state._loading = true;
            state._error = '';

            try {
                const userService = new UserService(props.graphqlClient as GraphQLClient);
                const addressService = new AddressService(props.graphqlClient as GraphQLClient);

                const baseInput: Record<string, unknown> = {
                    email: state._email,
                    password: state._password,
                };

                baseInput.firstName = state._firstName;
                baseInput.middleName = state._middleName;
                baseInput.lastName = state._lastName;
                baseInput.phone = state._phone;
                baseInput.gender = state._gender;
                baseInput.primaryLanguage = props.preferredLanguage || 'NL';

                let response: RegisterContactResponse | RegisterCustomerResponse;
                let userId: number = 0;
                let company: Company | null = null;

                if (state.isContact) {
                    // Create company if company fields are filled
                    if (state._companyName) {
                        const companyService = new CompanyService(props.graphqlClient as GraphQLClient);
                        const companyInput: CreateCompanyInput = {
                            name: state._companyName,
                            taxNumber: state._vatNumber,
                            cocNumber: state._cocNumber,
                            email: state._email,
                            phone: state._phone,
                        };
                        company = await companyService.createCompany(companyInput);
                    }

                    const contactInput: ContactRegisterInput = {
                        contactRegisterInput: {
                            ...baseInput,
                            parentId: company?.companyId as number,
                        },
                        companyAttributesInput: {},
                        contactAttributesInput: {},
                        contactPAConfigInput: {
                            page: 1,
                            offset: 10
                        }
                    };

                    response = await userService.registerContact(contactInput);
                    userId = Number((response as RegisterContactResponse)?.contact?.id || 0);

                    // Authenticate before creating company/addresses
                    const session = (response as RegisterContactResponse)?.session;
                    if (session?.accessToken) {
                        const currentConfig = (props.graphqlClient as GraphQLClient).getConfig();
                        (props.graphqlClient as GraphQLClient).updateConfig({
                            headers: {
                                ...currentConfig.headers,
                                'Authorization': 'Bearer ' + session.accessToken,
                            },
                        });
                    }
                } else {
                    const customerInput: CustomerRegisterInput = {
                        customerRegisterInput: {
                            ...baseInput,
                            gender: state._gender,
                            primaryLanguage: props.preferredLanguage || 'NL',
                        },
                        customerAttributesInput: {}
                    };
                    response = await userService.registerCustomer(customerInput);
                    userId = Number((response as RegisterCustomerResponse)?.customer?.id || 0);

                    // Authenticate before creating addresses
                    const session = (response as RegisterCustomerResponse)?.session;
                    if (session?.accessToken) {
                        const currentConfig = (props.graphqlClient as GraphQLClient).getConfig();
                        (props.graphqlClient as GraphQLClient).updateConfig({
                            headers: {
                                ...currentConfig.headers,
                                'Authorization': 'Bearer ' + session.accessToken,
                            },
                        });
                    }
                }

                const session = (response as RegisterContactResponse | RegisterCustomerResponse)?.session;
                const user = state.isContact ? (response as RegisterContactResponse)?.contact : (response as RegisterCustomerResponse)?.customer;

                // Create invoice/billing address

                let invoiceAddress: CustomerAddressCreateInput | CompanyAddressCreateInput;

                if (state.isCustomer) {
                    invoiceAddress = {
                        firstName: state._firstName,
                        middleName: state._middleName,
                        lastName: state._lastName,
                        street: state._billingStreet,
                        number: state._billingNumber,
                        numberExtension: state._billingNumberExtension,
                        postalCode: state._billingPostalCode,
                        city: state._billingCity,
                        country: state._billingCountry,
                        type: Enums.AddressType.invoice,
                        isDefault: Enums.YesNo.Y,
                        customerId: userId,
                    };

                    await addressService.createCustomerAddress(invoiceAddress);
                } else {
                    invoiceAddress = {
                        firstName: state._firstName,
                        middleName: state._middleName,
                        lastName: state._lastName,
                        company: state._companyName,
                        street: state._billingStreet,
                        number: state._billingNumber,
                        numberExtension: state._billingNumberExtension,
                        postalCode: state._billingPostalCode,
                        city: state._billingCity,
                        country: state._billingCountry,
                        type: Enums.AddressType.invoice,
                        isDefault: Enums.YesNo.Y,
                        companyId: company?.companyId as number,
                    };

                    await addressService.createCompanyAddress(invoiceAddress);
                }

                // Create delivery address
                if (state._sameAsDelivery) {
                    if (state.isCustomer) {
                        const deliveryAddress: CustomerAddressCreateInput = {
                            ...invoiceAddress as CustomerAddressCreateInput,
                        };

                        deliveryAddress.type = Enums.AddressType.delivery;

                        await addressService.createCustomerAddress(deliveryAddress);
                    } else {
                        const deliveryAddress: CompanyAddressCreateInput = {
                            ...invoiceAddress as CompanyAddressCreateInput,
                        };

                        deliveryAddress.type = Enums.AddressType.delivery;

                        await addressService.createCompanyAddress(deliveryAddress);
                    }
                } else {
                    if (state.isCustomer) {
                        const deliveryAddress: CustomerAddressCreateInput = {
                            firstName: state._firstName,
                            middleName: state._middleName,
                            lastName: state._lastName,
                            street: state._deliveryStreet,
                            number: state._deliveryNumber,
                            numberExtension: state._deliveryNumberExtension,
                            postalCode: state._deliveryPostalCode,
                            city: state._deliveryCity,
                            country: state._deliveryCountry,
                            type: Enums.AddressType.delivery,
                            isDefault: Enums.YesNo.Y,
                            customerId: userId,
                        };

                        await addressService.createCustomerAddress(deliveryAddress);
                    } else {
                        const deliveryAddress: CompanyAddressCreateInput = {
                            firstName: state._firstName,
                            middleName: state._middleName,
                            lastName: state._lastName,
                            street: state._deliveryStreet,
                            number: state._deliveryNumber,
                            numberExtension: state._deliveryNumberExtension,
                            postalCode: state._deliveryPostalCode,
                            city: state._deliveryCity,
                            country: state._deliveryCountry,
                            type: Enums.AddressType.delivery,
                            isDefault: Enums.YesNo.Y,
                            companyId: company?.companyId as number,
                        };

                        await addressService.createCompanyAddress(deliveryAddress);
                    }
                }

                state._submitted = true;

                // Auto-login if enabled and session tokens are present
                if ((props.automaticLogin !== false) && session?.accessToken && session?.refreshToken) {
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('userLoggedIn'));
                    }
                }

                if (props.afterRegistration) {
                    if ((props.automaticLogin !== false) && session?.accessToken && session?.refreshToken) {
                        props.afterRegistration(user as unknown as Contact | Customer, session?.accessToken, session?.refreshToken, session?.expirationTime);
                    } else {
                        props.afterRegistration(user as unknown as Contact | Customer);
                    }
                }
            } catch (err: any) {
                state._error = err?.message || 'Registration failed. Please try again.';
            } finally {
                state._loading = false;
            }
        },
    });

    return (
        <div className="register-form">
            <Show when={state.resolvedTitle}>
                <div className="space-y-1 text-center mb-6">
                    <h2 className="text-2xl font-bold">{state.resolvedTitle}</h2>
                    <Show when={props.subtitle}>
                        <p className="text-sm text-gray-500">{props.subtitle}</p>
                    </Show>
                </div>
            </Show>

            <Show when={!state._submitted}>
                <form onSubmit={(e) => state.handleSubmit(e)} className="space-y-6">

                    {/* ── SECTION: Your Details ── */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">{state.personalDetailsTitle}</h3>

                        {/* User type selector */}
                        <Show when={state.showUserTypeSelector}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none">
                                    {state.userTypeLabel}
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { state._selectedUserType = 'Contact'; }}
                                        className={
                                            'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' +
                                            (state._selectedUserType === 'Contact'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-gray-300 hover:bg-gray-50')
                                        }
                                    >
                                        {state.contactLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { state._selectedUserType = 'Customer'; }}
                                        className={
                                            'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' +
                                            (state._selectedUserType === 'Customer'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-gray-300 hover:bg-gray-50')
                                        }
                                    >
                                        {state.customerLabel}
                                    </button>
                                </div>
                            </div>
                        </Show>

                        {/* Gender / Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">{state.genderLabel}</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="M"
                                        checked={state._gender === Enums.Gender.M}
                                        onChange={() => { state._gender = Enums.Gender.M; }}
                                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                        disabled={state._loading}
                                    />
                                    Mr.
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="F"
                                        checked={state._gender === Enums.Gender.F}
                                        onChange={() => { state._gender = Enums.Gender.F; }}
                                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                        disabled={state._loading}
                                    />
                                    Mrs.
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        name="gender"
                                        value="U"
                                        checked={state._gender === Enums.Gender.U}
                                        onChange={() => { state._gender = Enums.Gender.U; }}
                                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                        disabled={state._loading}
                                    />
                                    Other
                                </label>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="register-email" className="text-sm font-medium leading-none">
                                {state.emailLabel}
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="email"
                                id="register-email"
                                name="email"
                                value={state._email}
                                onChange={(e) => { state._email = (e.target as HTMLInputElement).value; }}
                                placeholder={state.emailPlaceholder}
                                required
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={state._loading}
                            />
                        </div>

                        {/* Company fields (Contact only) */}
                        <Show when={state.isContact}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label htmlFor="register-vatNumber" className="text-sm font-medium leading-none">
                                            {state.vatNumberLabel}
                                            <Show when={state.isFieldRequired('vatNumber')}>
                                                <span className="text-red-500 ml-1">*</span>
                                            </Show>
                                        </label>
                                        <input
                                            type="text"
                                            id="register-vatNumber"
                                            name="vatNumber"
                                            value={state._vatNumber}
                                            onChange={(e) => { state._vatNumber = (e.target as HTMLInputElement).value; }}
                                            required={state.isFieldRequired('vatNumber')}
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="register-cocNumber" className="text-sm font-medium leading-none">
                                            {state.cocNumberLabel}
                                            <Show when={state.isFieldRequired('cocNumber')}>
                                                <span className="text-red-500 ml-1">*</span>
                                            </Show>
                                        </label>
                                        <input
                                            type="text"
                                            id="register-cocNumber"
                                            name="cocNumber"
                                            value={state._cocNumber}
                                            onChange={(e) => { state._cocNumber = (e.target as HTMLInputElement).value; }}
                                            required={state.isFieldRequired('cocNumber')}
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="register-companyName" className="text-sm font-medium leading-none">
                                        {state.companyNameLabel}
                                        <Show when={state.isFieldRequired('companyName')}>
                                            <span className="text-red-500 ml-1">*</span>
                                        </Show>
                                    </label>
                                    <input
                                        type="text"
                                        id="register-companyName"
                                        name="companyName"
                                        value={state._companyName}
                                        onChange={(e) => { state._companyName = (e.target as HTMLInputElement).value; }}
                                        required={state.isFieldRequired('companyName')}
                                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={state._loading}
                                    />
                                </div>
                            </div>
                        </Show>

                        {/* Name fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label htmlFor="register-firstName" className="text-sm font-medium leading-none">
                                    {state.firstNameLabel}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="register-firstName"
                                    name="firstName"
                                    value={state._firstName}
                                    onChange={(e) => { state._firstName = (e.target as HTMLInputElement).value; }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register-middleName" className="text-sm font-medium leading-none">
                                    {state.middleNameLabel}
                                </label>
                                <input
                                    type="text"
                                    id="register-middleName"
                                    name="middleName"
                                    value={state._middleName}
                                    onChange={(e) => { state._middleName = (e.target as HTMLInputElement).value; }}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label htmlFor="register-lastName" className="text-sm font-medium leading-none">
                                    {state.lastNameLabel}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="register-lastName"
                                    name="lastName"
                                    value={state._lastName}
                                    onChange={(e) => { state._lastName = (e.target as HTMLInputElement).value; }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register-phone" className="text-sm font-medium leading-none">
                                    {state.phoneLabel}
                                    <Show when={state.isFieldRequired('phone')}>
                                        <span className="text-red-500 ml-1">*</span>
                                    </Show>
                                </label>
                                <input
                                    type="tel"
                                    id="register-phone"
                                    name="phone"
                                    value={state._phone}
                                    onChange={(e) => { state._phone = (e.target as HTMLInputElement).value; }}
                                    required={state.isFieldRequired('phone')}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION: Billing Address ── */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">{state.billingAddressTitle}</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label htmlFor="register-billingPostalCode" className="text-sm font-medium leading-none">
                                    {state.postalCodeLabel}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="register-billingPostalCode"
                                    name="billingPostalCode"
                                    value={state._billingPostalCode}
                                    onChange={(e) => { state._billingPostalCode = (e.target as HTMLInputElement).value; }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register-billingStreet" className="text-sm font-medium leading-none">
                                    {state.streetLabel}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="register-billingStreet"
                                    name="billingStreet"
                                    value={state._billingStreet}
                                    onChange={(e) => { state._billingStreet = (e.target as HTMLInputElement).value; }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label htmlFor="register-billingNumber" className="text-sm font-medium leading-none">
                                    {state.numberLabel}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="register-billingNumber"
                                    name="billingNumber"
                                    value={state._billingNumber}
                                    onChange={(e) => { state._billingNumber = (e.target as HTMLInputElement).value; }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register-billingNumberExtension" className="text-sm font-medium leading-none">
                                    {state.numberExtensionLabel}
                                </label>
                                <input
                                    type="text"
                                    id="register-billingNumberExtension"
                                    name="billingNumberExtension"
                                    value={state._billingNumberExtension}
                                    onChange={(e) => { state._billingNumberExtension = (e.target as HTMLInputElement).value; }}
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label htmlFor="register-billingCity" className="text-sm font-medium leading-none">
                                    {state.cityLabel}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="register-billingCity"
                                    name="billingCity"
                                    value={state._billingCity}
                                    onChange={(e) => { state._billingCity = (e.target as HTMLInputElement).value; }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="register-billingCountry" className="text-sm font-medium leading-none">
                                    {state.countryLabel}
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <select
                                    id="register-billingCountry"
                                    name="billingCountry"
                                    value={state._billingCountry}
                                    onChange={(e) => { state._billingCountry = (e.target as HTMLSelectElement).value; }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={state._loading}
                                >
                                    <option value="">Select country</option>
                                    {Object.entries(props.countries || {}).map((entry) => (
                                        <option key={entry[0]} value={entry[0]}>{entry[1]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── SECTION: Delivery Address ── */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">{state.deliveryAddressTitle}</h3>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="register-sameAsDelivery"
                                name="sameAsDelivery"
                                checked={state._sameAsDelivery}
                                onChange={(e) => { state._sameAsDelivery = (e.target as HTMLInputElement).checked; }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={state._loading}
                            />
                            <label htmlFor="register-sameAsDelivery" className="text-sm font-medium leading-none">
                                {state.sameAsDeliveryLabel}
                            </label>
                        </div>

                        <Show when={!state._sameAsDelivery}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label htmlFor="register-deliveryPostalCode" className="text-sm font-medium leading-none">
                                            {state.postalCodeLabel}
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="register-deliveryPostalCode"
                                            name="deliveryPostalCode"
                                            value={state._deliveryPostalCode}
                                            onChange={(e) => { state._deliveryPostalCode = (e.target as HTMLInputElement).value; }}
                                            required
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="register-deliveryStreet" className="text-sm font-medium leading-none">
                                            {state.streetLabel}
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="register-deliveryStreet"
                                            name="deliveryStreet"
                                            value={state._deliveryStreet}
                                            onChange={(e) => { state._deliveryStreet = (e.target as HTMLInputElement).value; }}
                                            required
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label htmlFor="register-deliveryNumber" className="text-sm font-medium leading-none">
                                            {state.numberLabel}
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="register-deliveryNumber"
                                            name="deliveryNumber"
                                            value={state._deliveryNumber}
                                            onChange={(e) => { state._deliveryNumber = (e.target as HTMLInputElement).value; }}
                                            required
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="register-deliveryNumberExtension" className="text-sm font-medium leading-none">
                                            {state.numberExtensionLabel}
                                        </label>
                                        <input
                                            type="text"
                                            id="register-deliveryNumberExtension"
                                            name="deliveryNumberExtension"
                                            value={state._deliveryNumberExtension}
                                            onChange={(e) => { state._deliveryNumberExtension = (e.target as HTMLInputElement).value; }}
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label htmlFor="register-deliveryCity" className="text-sm font-medium leading-none">
                                            {state.cityLabel}
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="register-deliveryCity"
                                            name="deliveryCity"
                                            value={state._deliveryCity}
                                            onChange={(e) => { state._deliveryCity = (e.target as HTMLInputElement).value; }}
                                            required
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="register-deliveryCountry" className="text-sm font-medium leading-none">
                                            {state.countryLabel}
                                            <span className="text-red-500 ml-1">*</span>
                                        </label>
                                        <select
                                            id="register-deliveryCountry"
                                            name="deliveryCountry"
                                            value={state._deliveryCountry}
                                            onChange={(e) => { state._deliveryCountry = (e.target as HTMLSelectElement).value; }}
                                            required
                                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                            disabled={state._loading}
                                        >
                                            <option value="">Select country</option>
                                            {Object.entries(props.countries || {}).map((entry) => (
                                                <option key={entry[0]} value={entry[0]}>{entry[1]}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </Show>
                    </div>

                    {/* ── SECTION: Password ── */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">{state.passwordTitle}</h3>

                        <div className="space-y-2">
                            <label htmlFor="register-password" className="text-sm font-medium leading-none">
                                {state.passwordLabel}
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="password"
                                id="register-password"
                                name="password"
                                value={state._password}
                                onChange={(e) => { state._password = (e.target as HTMLInputElement).value; }}
                                placeholder={state.passwordPlaceholder}
                                required
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={state._loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="register-confirmPassword" className="text-sm font-medium leading-none">
                                {state.confirmPasswordLabel}
                                <span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                                type="password"
                                id="register-confirmPassword"
                                name="confirmPassword"
                                value={state._confirmPassword}
                                onChange={(e) => { state._confirmPassword = (e.target as HTMLInputElement).value; }}
                                placeholder={state.passwordPlaceholder}
                                required
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={state._loading}
                            />
                        </div>
                    </div>

                    {/* Error message */}
                    <Show when={state._error}>
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            {state._error}
                        </div>
                    </Show>

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={state._loading}
                        className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Show when={state._loading}>
                            <svg
                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        </Show>
                        {state._loading ? 'Registering...' : state.resolvedButtonText}
                    </button>
                </form>
            </Show>

            <Show when={state._submitted}>
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <svg
                            className="h-12 w-12 text-green-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-600">
                        Your account has been created successfully.
                    </p>
                </div>
            </Show>

            <Show when={state.showLoginLink}>
                <div className="mt-6 border-t pt-6">
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">{state.loginText}</p>
                        <button
                            type="button"
                            onClick={() => { if (props.onLoginClick) props.onLoginClick(); }}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            {state.loginLinkText}
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
}
