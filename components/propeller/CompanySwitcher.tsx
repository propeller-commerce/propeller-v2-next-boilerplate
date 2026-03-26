'use client';
import * as React from 'react';

import { useState, useRef, useEffect } from 'react';
import { Contact, Company } from 'propeller-sdk-v2';

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

function CompanySwitcher(props: CompanySwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState<CompanySwitcherState['isOpen']>(() => false);
  const [activeCompanyId, setActiveCompanyId] = useState<CompanySwitcherState['activeCompanyId']>(
    () => null
  );
  function getCompanies(): ReturnType<CompanySwitcherState['getCompanies']> {
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
  }

  function getActiveCompany(): ReturnType<CompanySwitcherState['getActiveCompany']> {
    const idToUse = activeCompanyId ?? (props.selectedCompanyId as number | undefined) ?? null;
    if (idToUse !== null) {
      const companies = getCompanies();
      const found = companies.find((c: Company) => c.companyId === idToUse);
      return found ?? null;
    }
    return (props.user.company as Company | undefined) ?? null;
  }

  function getActiveCompanyName(): ReturnType<CompanySwitcherState['getActiveCompanyName']> {
    const company = getActiveCompany();
    return company ? company.name : 'Select company';
  }

  function getIcon(): ReturnType<CompanySwitcherState['getIcon']> {
    return props.icon ?? 'default-company-switch-icon';
  }

  function isActive(company: Company): ReturnType<CompanySwitcherState['isActive']> {
    const active = getActiveCompany();
    return active !== null && active.companyId === company.companyId;
  }

  function toggleDropdown(): ReturnType<CompanySwitcherState['toggleDropdown']> {
    setIsOpen(!isOpen);
  }

  function selectCompany(company: Company): ReturnType<CompanySwitcherState['selectCompany']> {
    setActiveCompanyId(company.companyId);
    setIsOpen(false);
    props.onCompanyChange(company);
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !(containerRef.current as any).contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);
  return (
    <div className="company-switcher relative inline-block" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-label="Switch company"
        className="company-switcher__trigger flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/10"
        onClick={(event) => toggleDropdown()}
        aria-expanded={isOpen}
      >
        <span
          aria-hidden="true"
          className={`company-switcher__icon icon-${getIcon()} flex-shrink-0`}
        />
        <span className="company-switcher__label truncate max-w-[160px]">
          {getActiveCompanyName()}
        </span>
        <span
          aria-hidden="true"
          className={`company-switcher__chevron flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
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
      {isOpen ? (
        <ul
          role="listbox"
          aria-label="Companies"
          className="company-switcher__dropdown absolute left-0 top-full z-[60] mt-1 min-w-[220px] rounded-md border border-border bg-popover text-popover-foreground shadow-lg py-1 animate-in fade-in zoom-in-95 duration-150"
        >
          {getCompanies()?.map((company) => (
            <li
              role="option"
              key={String(company.companyId)}
              aria-selected={isActive(company)}
              onClick={(event) => selectCompany(company)}
              className={`company-switcher__option flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer transition-colors hover:bg-accent hover:text-accent-foreground ${isActive(company) ? 'font-semibold text-primary' : 'font-normal text-foreground'}`}
            >
              <span className="company-switcher__option-name flex-1 truncate">{company.name}</span>
              {isActive(company) ? (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="company-switcher__option-check flex-shrink-0 w-4 h-4 text-primary"
                >
                  <path d="M2.5 8l4 4 7-7" />
                </svg>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default CompanySwitcher;
