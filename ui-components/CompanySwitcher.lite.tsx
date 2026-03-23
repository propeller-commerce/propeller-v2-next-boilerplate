import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    Contact,
    Company,
} from 'propeller-sdk-v2';

export interface CompanySwitcherProps {
    /** The contact to whom the companies are assigned. Default company is user.company, all companies are in user.companies. */
    user: Contact;

    /** Icon identifier for the company switcher trigger button. @default 'default-company-switch-icon' */
    icon?: string;

    /** Currently selected company ID (from CompanyContext). Syncs the switcher with external state. */
    selectedCompanyId?: number;

    /** Callback fired when the user selects a company. */
    onCompanyChange: (company: Company) => void;
}

interface CompanySwitcherState {
    isOpen: boolean;
    activeCompanyId: number | null;
    getCompanies: () => Company[];
    getActiveCompany: () => Company | null;
    getActiveCompanyName: () => string;
    getIcon: () => string;
    isActive: (company: Company) => boolean;
    toggleDropdown: () => void;
    selectCompany: (company: Company) => void;
}

export default function CompanySwitcher(props: CompanySwitcherProps) {
    const state = useStore<CompanySwitcherState>({
        isOpen: false,
        activeCompanyId: null,

        getCompanies(): Company[] {
            // sanitizeUser in AuthContext is not recursive, so CompaniesResponse fields
            // may still have their raw _items key instead of the getter-based items.
            const companiesRaw = props.user.companies as any;
            const items = (companiesRaw?.items ?? companiesRaw?._items) as Company[] | undefined;
            if (Array.isArray(items) && items.length > 0) {
                return items;
            }
            const defaultCompany = props.user.company;
            if (defaultCompany) {
                return [defaultCompany];
            }
            return [];
        },

        getActiveCompany(): Company | null {
            const idToUse = state.activeCompanyId ?? (props.selectedCompanyId as number | undefined) ?? null;
            if (idToUse !== null) {
                const companies = state.getCompanies();
                const found = companies.find(
                    (c: Company) => c.companyId === idToUse
                );
                return found ?? null;
            }
            return (props.user.company as Company | undefined) ?? null;
        },

        getActiveCompanyName(): string {
            const company = state.getActiveCompany();
            return company ? company.name : 'Select company';
        },

        getIcon(): string {
            return props.icon ?? 'default-company-switch-icon';
        },

        isActive(company: Company): boolean {
            const active = state.getActiveCompany();
            return active !== null && active.companyId === company.companyId;
        },

        toggleDropdown(): void {
            state.isOpen = !state.isOpen;
        },

        selectCompany(company: Company): void {
            state.activeCompanyId = company.companyId;
            state.isOpen = false;
            props.onCompanyChange(company);
        },
    });

    return (
        <div className="company-switcher relative inline-block">
            <button
                type="button"
                onClick={() => state.toggleDropdown()}
                className="company-switcher__trigger flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10"
                aria-haspopup="listbox"
                aria-expanded={state.isOpen}
                aria-label="Switch company"
            >
                <span
                    className={`company-switcher__icon icon-${state.getIcon()} flex-shrink-0`}
                    aria-hidden="true"
                />
                <span className="company-switcher__label truncate max-w-[160px]">
                    {state.getActiveCompanyName()}
                </span>
                <span
                    className={`company-switcher__chevron flex-shrink-0 transition-transform duration-200 ${state.isOpen ? 'rotate-180' : 'rotate-0'}`}
                    aria-hidden="true"
                >
                    <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M2 4l4 4 4-4" />
                    </svg>
                </span>
            </button>

            <Show when={state.isOpen}>
                <ul
                    role="listbox"
                    aria-label="Companies"
                    className="company-switcher__dropdown absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-md border border-border bg-popover text-popover-foreground shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150"
                >
                    <For each={state.getCompanies()}>
                        {(company: Company) => (
                            <li
                                key={String(company.companyId)}
                                role="option"
                                aria-selected={state.isActive(company)}
                                className={`company-switcher__option flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${state.isActive(company) ? 'font-semibold text-primary' : 'font-normal text-foreground'}`}
                                onClick={() => state.selectCompany(company)}
                            >
                                <span className="company-switcher__option-name flex-1 truncate">
                                    {company.name}
                                </span>
                                <Show when={state.isActive(company)}>
                                    <svg
                                        className="company-switcher__option-check flex-shrink-0 w-4 h-4 text-primary"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M2.5 8l4 4 7-7" />
                                    </svg>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
        </div>
    );
}
