'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
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
  AttributeResultSearchInput,
  PurchaseAuthorizationConfigCreateInput,
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

  /** Override: fires instead of the default PurchaseAuthorizationConfigCreateInput() call */
  onPurchaseAuthorizationCreate?: (pac: PurchaseAuthorizationConfigCreateInput) => void;

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
  isAuthManager: () => boolean;
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
function PurchaseAuthorizationConfigurator(props: PurchaseAuthorizationConfiguratorProps) {
  const [company, setCompany] = useState<PurchaseAuthorizationConfiguratorState['company']>(
    () => null
  );
  const [loading, setLoading] = useState<PurchaseAuthorizationConfiguratorState['loading']>(
    () => true
  );
  const [currentPage, setCurrentPage] = useState<
    PurchaseAuthorizationConfiguratorState['currentPage']
  >(() => 1);
  const [pageOffset, setPageOffset] = useState<
    PurchaseAuthorizationConfiguratorState['pageOffset']
  >(() => 10);
  const [rowEdits, setRowEdits] = useState<PurchaseAuthorizationConfiguratorState['rowEdits']>(
    () => ({})
  );
  const [pacMap, setPacMap] = useState<PurchaseAuthorizationConfiguratorState['pacMap']>(
    () => ({})
  );
  const [actionLoading, setActionLoading] = useState<
    PurchaseAuthorizationConfiguratorState['actionLoading']
  >(() => ({}));
  const [showAddContactModal, setShowAddContactModal] = useState<
    PurchaseAuthorizationConfiguratorState['showAddContactModal']
  >(() => false);
  const [addContactForm, setAddContactForm] = useState<
    PurchaseAuthorizationConfiguratorState['addContactForm']
  >(() => ({
    gender: '',
    email: '',
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
  }));
  const [addContactLoading, setAddContactLoading] = useState<
    PurchaseAuthorizationConfiguratorState['addContactLoading']
  >(() => false);
  const [addContactError, setAddContactError] = useState<
    PurchaseAuthorizationConfiguratorState['addContactError']
  >(() => '');
  function isAuthManager(): ReturnType<PurchaseAuthorizationConfiguratorState['isAuthManager']> {
    if (!props.user || !('contactId' in props.user)) return false;
    const pacData = (props.user as Contact).purchaseAuthorizationConfigs;
    const items: PurchaseAuthorizationConfig[] = pacData?.items ?? [];
    return items.some((pac: PurchaseAuthorizationConfig) => {
      const role = pac.purchaseRole;
      const companyId = pac.company?.companyId;
      return role === Enums.PurchaseRole.AUTHORIZATION_MANAGER && companyId === props.companyId;
    });
  }
  function getContacts(): ReturnType<PurchaseAuthorizationConfiguratorState['getContacts']> {
    if (!company) return [];
    const contactsData = (company as Company).contacts;
    return contactsData?.items ?? [];
  }
  function getTotalPages(): ReturnType<PurchaseAuthorizationConfiguratorState['getTotalPages']> {
    if (!company) return 0;
    const contactsData = (company as Company).contacts;
    return contactsData?.pages ?? 0;
  }
  function getLabel(
    key: string,
    fallback: string
  ): ReturnType<PurchaseAuthorizationConfiguratorState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }
  function buildMaps(
    contacts: Contact[]
  ): ReturnType<PurchaseAuthorizationConfiguratorState['buildMaps']> {
    const newPacMap: Record<number, PurchaseAuthorizationConfig> = {};
    const newRowEdits: Record<number, RowEdit> = {};
    contacts.forEach((contact: Contact) => {
      const cId: number = contact.contactId;
      const pacData = contact.purchaseAuthorizationConfigs;
      const pacItems: PurchaseAuthorizationConfig[] = pacData?.items ?? [];
      if (pacItems.length > 0) {
        newPacMap[cId] = pacItems[0];
      }
      const pac = newPacMap[cId];
      newRowEdits[cId] = {
        role: pac ? pac.purchaseRole : '',
        limit: pac ? pac.authorizationLimit : undefined,
        dirty: false,
      };
    });
    setPacMap(newPacMap);
    setRowEdits(newRowEdits);
  }
  async function loadCompany(
    page: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['loadCompany']> {
    if (!props.graphqlClient || !props.companyId) return;
    setLoading(true);
    try {
      const companyService = new CompanyService(props.graphqlClient);
      const company = await companyService.getCompany({
        id: props.companyId,
        $contactSearchArguments: {
          page: page,
          offset: pageOffset,
        },
        $contactPAConfigInput: {
          companyIds: [props.companyId],
          page: 1,
          offset: 100,
        },
        $companyAttributesInput: {} as AttributeResultSearchInput,
      });
      setCompany(company);
      // Extract contacts directly from the fetched result (not via state.getContacts())
      // to avoid reading stale state before React flushes the company assignment.
      const freshContactsData = company.contacts;
      const freshContacts: Contact[] = freshContactsData?.items ?? [];
      buildMaps(freshContacts);
    } finally {
      setLoading(false);
    }
  }
  function handleRoleChange(
    contactId: number,
    role: string
  ): ReturnType<PurchaseAuthorizationConfiguratorState['handleRoleChange']> {
    const current = rowEdits[contactId] || {
      role: '',
      limit: undefined,
      dirty: false,
    };
    setRowEdits({
      ...rowEdits,
      [contactId]: {
        ...current,
        role,
        dirty: true,
      },
    });
  }
  function handleLimitChange(
    contactId: number,
    value: string
  ): ReturnType<PurchaseAuthorizationConfiguratorState['handleLimitChange']> {
    const current = rowEdits[contactId] || {
      role: '',
      limit: undefined,
      dirty: false,
    };
    const limit = value === '' ? undefined : Number(value);
    setRowEdits({
      ...rowEdits,
      [contactId]: {
        ...current,
        limit,
        dirty: true,
      },
    });
  }
  async function handleCreate(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['handleCreate']> {
    setActionLoading({
      ...actionLoading,
      [contactId]: true,
    });
    try {
      const edit = rowEdits[contactId] || {
        role: Enums.PurchaseRole.PURCHASER,
        limit: undefined,
        dirty: false,
      };
      const input: PurchaseAuthorizationConfigCreateInput = {
        contactId,
        companyId: props.companyId,
        purchaseRole: (edit.role || Enums.PurchaseRole.PURCHASER) as Enums.PurchaseRole,
        authorizationLimit: edit.limit,
      };
      if (props.onPurchaseAuthorizationCreate) {
        props.onPurchaseAuthorizationCreate(input);
      } else {
        const pacService = new PurchaseAuthorizationConfigService(props.graphqlClient);
        const pac = await pacService.createPurchaseAuthorizationConfig(input);
        if (props.afterPurchaseAuthorizationCreate) {
          props.afterPurchaseAuthorizationCreate(pac);
        } else {
          await loadCompany(currentPage);
        }
      }
    } finally {
      setActionLoading({
        ...actionLoading,
        [contactId]: false,
      });
    }
  }
  async function handleSave(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['handleSave']> {
    const pac = pacMap[contactId];
    if (!pac) return;
    setActionLoading({
      ...actionLoading,
      [contactId]: true,
    });
    try {
      const edit = rowEdits[contactId];
      const pacId: string = pac.id;
      if (props.onPurchaseAuthorizationUpdate) {
        props.onPurchaseAuthorizationUpdate(pac);
      } else {
        const pacService = new PurchaseAuthorizationConfigService(props.graphqlClient);
        const updated = await pacService.updatePurchaseAuthorizationConfig(pacId, {
          purchaseRole: (edit.role || pac.purchaseRole) as Enums.PurchaseRole,
          authorizationLimit: edit.limit,
        });
        if (props.afterPurchaseAuthorizationUpdate) {
          props.afterPurchaseAuthorizationUpdate(updated);
        } else {
          await loadCompany(currentPage);
        }
      }
    } finally {
      setActionLoading({
        ...actionLoading,
        [contactId]: false,
      });
    }
  }
  async function handleDelete(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['handleDelete']> {
    const pac = pacMap[contactId];
    if (!pac) return;
    setActionLoading({
      ...actionLoading,
      [contactId]: true,
    });
    try {
      const pacId: string = pac.id;
      if (props.onPurchaseAuthorizationDelete) {
        props.onPurchaseAuthorizationDelete(pac);
      } else {
        const pacService = new PurchaseAuthorizationConfigService(props.graphqlClient);
        const deleted = await pacService.deletePurchaseAuthorizationConfig(pacId);
        if (props.afterPurchaseAuthorizationDelete) {
          props.afterPurchaseAuthorizationDelete(deleted);
        } else {
          await loadCompany(currentPage);
        }
      }
    } finally {
      setActionLoading({
        ...actionLoading,
        [contactId]: false,
      });
    }
  }
  function handlePageChange(
    page: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['handlePageChange']> {
    setCurrentPage(page);
  }
  function openAddContactModal(): ReturnType<
    PurchaseAuthorizationConfiguratorState['openAddContactModal']
  > {
    setAddContactError('');
    setShowAddContactModal(true);
  }
  function closeAddContactModal(): ReturnType<
    PurchaseAuthorizationConfiguratorState['closeAddContactModal']
  > {
    setShowAddContactModal(false);
    setAddContactError('');
    setAddContactForm({
      gender: '',
      email: '',
      firstName: '',
      middleName: '',
      lastName: '',
      phone: '',
    });
  }
  async function handleAddContactSubmit(): ReturnType<
    PurchaseAuthorizationConfiguratorState['handleAddContactSubmit']
  > {
    setAddContactLoading(true);
    setAddContactError('');
    try {
      const input: RegisterContactInput = {
        parentId: props.companyId,
        gender: addContactForm.gender as Enums.Gender,
        email: addContactForm.email,
        firstName: addContactForm.firstName,
        middleName: addContactForm.middleName,
        lastName: addContactForm.lastName,
        phone: addContactForm.phone,
      };
      if (props.beforeContactCreate) {
        props.beforeContactCreate(input);
      }
      if (props.onContactCreate) {
        props.onContactCreate(input);
      } else {
        const userService = new UserService(props.graphqlClient);
        const result = await userService.registerContact({
          contactRegisterInput: input,
        });
        const contact = result.contact;
        if (props.afterContactCreate) {
          props.afterContactCreate(contact as any);
        } else {
          await loadCompany(currentPage);
        }
      }
      closeAddContactModal();
    } catch (err: any) {
      setAddContactError(err?.message || 'Failed to create contact');
    } finally {
      setAddContactLoading(false);
    }
  }
  function hasPac(contactId: number): ReturnType<PurchaseAuthorizationConfiguratorState['hasPac']> {
    return !!pacMap[contactId];
  }
  function isCurrentUser(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['isCurrentUser']> {
    const userId = (props.user as Contact).contactId;
    return userId === contactId;
  }
  function isRowDirty(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['isRowDirty']> {
    return !!rowEdits[contactId]?.dirty;
  }
  function getRowRole(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['getRowRole']> {
    return rowEdits[contactId]?.role ?? '';
  }
  function getRowLimit(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['getRowLimit']> {
    return rowEdits[contactId]?.limit;
  }
  function isRowLoading(
    contactId: number
  ): ReturnType<PurchaseAuthorizationConfiguratorState['isRowLoading']> {
    return !!actionLoading[contactId];
  }
  useEffect(() => {
    if (props.graphqlClient && props.companyId) {
      loadCompany(currentPage);
    }
  }, [props.companyId, currentPage]);
  return (
    <div className={`purchase-authorization-configurator ${props.className || ''}`}>
      {isAuthManager() ? (
        <>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {getLabel('title', 'Purchase Authorization Settings')}
              </h2>
              {props.allowContactCreate !== false ? (
                <button
                  type="button"
                  className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition text-sm font-medium"
                  onClick={(event) => openAddContactModal()}
                >
                  {getLabel('addContact', 'Add contact')}
                </button>
              ) : null}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}
            {!loading ? (
              <>
                <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colId', 'ID')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colName', 'Name')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colRole', 'Role')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colLimit', 'Limit')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colActions', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {getContacts()?.map((contact) => (
                        <tr className="hover:bg-muted/30 transition-colors" key={contact.contactId}>
                          <td className="px-4 py-3 text-muted-foreground">{contact.contactId}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {[contact.firstName, contact.middleName, contact.lastName]
                                .filter(Boolean)
                                .join(' ')}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{contact.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="border border-input rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              value={getRowRole(contact.contactId)}
                              disabled={isCurrentUser(contact.contactId)}
                              onChange={(e) => handleRoleChange(contact.contactId, e.target.value)}
                            >
                              <option value="">{getLabel('selectRole', '— Select role —')}</option>
                              <option value={Enums.PurchaseRole.PURCHASER}>
                                {getLabel('rolePurchaser', 'Purchaser')}
                              </option>
                              <option value={Enums.PurchaseRole.AUTHORIZATION_MANAGER}>
                                {getLabel('roleManager', 'Authorization Manager')}
                              </option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            {getRowRole(contact.contactId) === Enums.PurchaseRole.PURCHASER ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-28 border border-input rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                value={getRowLimit(contact.contactId) ?? ''}
                                disabled={isCurrentUser(contact.contactId)}
                                onChange={(e) =>
                                  handleLimitChange(contact.contactId, e.target.value)
                                }
                                placeholder={getLabel('limitPlaceholder', '0.00')}
                              />
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {hasPac(contact.contactId) && isRowDirty(contact.contactId) ? (
                                <button
                                  type="button"
                                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={isRowLoading(contact.contactId)}
                                  onClick={(event) => handleSave(contact.contactId)}
                                >
                                  {isRowLoading(contact.contactId) ? (
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                  ) : null}
                                  {getLabel('save', 'Save')}
                                </button>
                              ) : null}
                              {!hasPac(contact.contactId) ? (
                                <button
                                  type="button"
                                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={
                                    isRowLoading(contact.contactId) ||
                                    !getRowRole(contact.contactId)
                                  }
                                  onClick={(event) => handleCreate(contact.contactId)}
                                >
                                  {isRowLoading(contact.contactId) ? (
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                  ) : null}
                                  {getLabel('create', 'Create')}
                                </button>
                              ) : null}
                              {hasPac(contact.contactId) ? (
                                <button
                                  type="button"
                                  className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  disabled={
                                    isRowLoading(contact.contactId) ||
                                    isCurrentUser(contact.contactId)
                                  }
                                  onClick={(event) => handleDelete(contact.contactId)}
                                >
                                  {isRowLoading(contact.contactId) ? (
                                    <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                  ) : null}
                                  {getLabel('delete', 'Delete')}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {getTotalPages() > 1 ? (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      type="button"
                      className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={currentPage <= 1}
                      onClick={(event) => handlePageChange(currentPage - 1)}
                    >
                      {getLabel('previous', 'Previous')}
                    </button>
                    <span className="text-sm text-muted-foreground">
                      {getLabel('page', 'Page')}
                      {currentPage}
                      {getLabel('of', 'of')}
                      {getTotalPages()}
                    </span>
                    <button
                      type="button"
                      className="text-sm px-3 py-1.5 border border-border rounded-md hover:bg-muted transition disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={currentPage >= getTotalPages()}
                      onClick={(event) => handlePageChange(currentPage + 1)}
                    >
                      {getLabel('next', 'Next')}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
          {showAddContactModal ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={(event) => closeAddContactModal()}
            >
              <div
                className="bg-background rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    {getLabel('addContactTitle', 'Add Contact')}
                  </h3>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition"
                    onClick={(event) => closeAddContactModal()}
                  >
                    ✕
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('companyName', 'Company')}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-muted cursor-not-allowed"
                    readOnly
                    value={(company as Company)?.name ?? ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('gender', 'Gender')}
                  </label>
                  <select
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={addContactForm.gender}
                    onChange={(e) => {
                      setAddContactForm({
                        ...addContactForm,
                        gender: e.target.value,
                      });
                    }}
                  >
                    <option value="">{getLabel('selectGender', '— Select —')}</option>
                    <option value={Enums.Gender.M}>{getLabel('genderM', 'Male')}</option>
                    <option value={Enums.Gender.F}>{getLabel('genderF', 'Female')}</option>
                    <option value={Enums.Gender.U}>{getLabel('genderU', 'Unspecified')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('email', 'Email')} *
                  </label>
                  <input
                    type="email"
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={addContactForm.email}
                    onChange={(e) => {
                      setAddContactForm({
                        ...addContactForm,
                        email: e.target.value,
                      });
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('firstName', 'First name')}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={addContactForm.firstName}
                      onChange={(e) => {
                        setAddContactForm({
                          ...addContactForm,
                          firstName: e.target.value,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('middleName', 'Middle')}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={addContactForm.middleName}
                      onChange={(e) => {
                        setAddContactForm({
                          ...addContactForm,
                          middleName: e.target.value,
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('lastName', 'Last name')}
                    </label>
                    <input
                      type="text"
                      className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      value={addContactForm.lastName}
                      onChange={(e) => {
                        setAddContactForm({
                          ...addContactForm,
                          lastName: e.target.value,
                        });
                      }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('phone', 'Phone')}
                  </label>
                  <input
                    type="tel"
                    className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    value={addContactForm.phone}
                    onChange={(e) => {
                      setAddContactForm({
                        ...addContactForm,
                        phone: e.target.value,
                      });
                    }}
                  />
                </div>
                {!!addContactError ? (
                  <p className="text-sm text-red-600">{addContactError}</p>
                ) : null}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition"
                    onClick={(event) => closeAddContactModal()}
                  >
                    {getLabel('cancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    disabled={addContactLoading || !addContactForm.email}
                    onClick={(event) => handleAddContactSubmit()}
                  >
                    {addContactLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : null}
                    {getLabel('addContactSubmit', 'Add Contact')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default PurchaseAuthorizationConfigurator;
