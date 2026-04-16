/**
 * usePurchaseAuthorization (React) — Purchase Authorization Configurator + Requests.
 *
 * Covers: PurchaseAuthorizationConfigurator, PurchaseAuthorizationRequests.
 * React mirror of vue/usePurchaseAuthorization.ts.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { UserService, CartService, Enums } from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Company,
  Cart,
  CartMainItem,
  Contact,
  Customer,
  PurchaseAuthorizationConfig,
  PurchaseAuthorizationConfigCreateInput,
  RegisterContactInput,
  AttributeResultSearchInput,
} from 'propeller-sdk-v2';
import { useCompany } from './useCompany';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface RowEdit {
  role: string;
  limit: number | undefined;
  dirty: boolean;
}

export interface AddContactFormState {
  gender: string;
  email: string;
  firstName: string;
  middleName: string;
  lastName: string;
  phone: string;
}

const EMPTY_CONTACT_FORM: AddContactFormState = {
  gender: '', email: '', firstName: '', middleName: '', lastName: '', phone: '',
};

/** Checks if a user is an authorization manager for the given company. Works on plain objects from localStorage. */
function checkIsAuthManager(user: Contact | Customer | null | undefined, companyId: number): boolean {
  if (!user || !('contactId' in user)) return false;
  const pacData = (user as any).purchaseAuthorizationConfigs;
  const items: any[] = pacData?.items ?? pacData?._items ?? [];
  return items.some((pac: any) => {
    const role = pac.purchaseRole ?? pac._purchaseRole;
    const pacCompanyId = pac.company?.companyId ?? pac.company?._companyId ?? pac._company?.companyId ?? pac._company?._companyId;
    return role === Enums.PurchaseRole.AUTHORIZATION_MANAGER && Number(pacCompanyId) === Number(companyId);
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// usePurchaseAuthorizationConfigurator
// ══════════════════════════════════════════════════════════════════════════════

export interface UsePurchaseAuthorizationConfiguratorOptions {
  graphqlClient: GraphQLClient;
  user: Contact | Customer | null;
  companyId: number;
  /** Rows per page (default 10) */
  pageOffset?: number;
  beforeContactCreate?: (input: RegisterContactInput) => void;
  onContactCreate?: (input: RegisterContactInput) => void;
  afterContactCreate?: (contact: Contact) => void;
  onPurchaseAuthorizationCreate?: (pac: PurchaseAuthorizationConfigCreateInput) => void;
  afterPurchaseAuthorizationCreate?: (pac: PurchaseAuthorizationConfig) => void;
  onPurchaseAuthorizationUpdate?: (pac: PurchaseAuthorizationConfig) => void;
  afterPurchaseAuthorizationUpdate?: (pac: PurchaseAuthorizationConfig) => void;
  onPurchaseAuthorizationDelete?: (pac: PurchaseAuthorizationConfig) => void;
  afterPurchaseAuthorizationDelete?: (deleted: boolean) => void;
}

export interface UsePurchaseAuthorizationConfiguratorReturn {
  // Data
  company: Company | null;
  loading: boolean;
  contacts: Contact[];
  totalPages: number;
  currentPage: number;
  // Derived
  isAuthManager: boolean;
  // Per-row state
  rowEdits: Record<number, RowEdit>;
  pacMap: Record<number, PurchaseAuthorizationConfig>;
  actionLoading: Record<number, boolean>;
  // Add-contact modal state
  showAddContactModal: boolean;
  addContactForm: AddContactFormState;
  addContactLoading: boolean;
  addContactError: string;
  // Per-row helpers
  hasPac: (contactId: number) => boolean;
  isCurrentUser: (contactId: number) => boolean;
  isRowDirty: (contactId: number) => boolean;
  getRowRole: (contactId: number) => string;
  getRowLimit: (contactId: number) => number | undefined;
  isRowLoading: (contactId: number) => boolean;
  // Handlers
  loadCompany: (page: number) => Promise<void>;
  handleRoleChange: (contactId: number, role: string) => void;
  handleLimitChange: (contactId: number, value: string) => void;
  handleCreate: (contactId: number) => Promise<void>;
  handleSave: (contactId: number) => Promise<void>;
  handleDelete: (contactId: number) => Promise<void>;
  handlePageChange: (page: number) => void;
  openAddContactModal: () => void;
  closeAddContactModal: () => void;
  setAddContactForm: React.Dispatch<React.SetStateAction<AddContactFormState>>;
  handleAddContactSubmit: () => Promise<void>;
}

export function usePurchaseAuthorizationConfigurator(
  options: UsePurchaseAuthorizationConfiguratorOptions,
): UsePurchaseAuthorizationConfiguratorReturn {
  const { graphqlClient, user, companyId, pageOffset = 10 } = options;
  // Keep callbacks in a ref so handlers don't stale-close over them
  const cbRef = useRef(options);
  cbRef.current = options;

  const { company, loading, fetchCompany, createPac, updatePac, deletePac } = useCompany({ graphqlClient });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowEdits, setRowEdits] = useState<Record<number, RowEdit>>({});
  const [pacMap, setPacMap] = useState<Record<number, PurchaseAuthorizationConfig>>({});
  const [actionLoading, setActionLoading] = useState<Record<number, boolean>>({});
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [addContactForm, setAddContactForm] = useState<AddContactFormState>(EMPTY_CONTACT_FORM);
  const [addContactLoading, setAddContactLoading] = useState(false);
  const [addContactError, setAddContactError] = useState('');

  const isAuthManager = useMemo(() => checkIsAuthManager(user, companyId), [user, companyId]);

  const contacts = useMemo<Contact[]>(
    () => (company as Company)?.contacts?.items ?? [],
    [company],
  );

  const totalPages = useMemo<number>(
    () => (company as any)?.contacts?.pages ?? 0,
    [company],
  );

  function buildMaps(contactList: Contact[]): void {
    const newPacMap: Record<number, PurchaseAuthorizationConfig> = {};
    const newRowEdits: Record<number, RowEdit> = {};
    contactList.forEach((contact: Contact) => {
      const cId = contact.contactId;
      const pacItems: PurchaseAuthorizationConfig[] = contact.purchaseAuthorizationConfigs?.items ?? [];
      if (pacItems.length > 0) newPacMap[cId] = pacItems[0];
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

  const loadCompany = useCallback(async (page: number): Promise<void> => {
    if (!graphqlClient || !companyId) return;
    await fetchCompany(companyId, {
      contactSearchArguments: { page, offset: pageOffset },
      contactPAConfigInput: { companyIds: [companyId], page: 1, offset: 100 },
      companyAttributesInput: {} as AttributeResultSearchInput,
    });
  }, [graphqlClient, companyId, pageOffset, fetchCompany]);

  // Rebuild row maps whenever company data refreshes
  useEffect(() => {
    if (company) {
      buildMaps((company as Company).contacts?.items ?? []);
    }
  }, [company]);

  // Reload when companyId or currentPage changes
  useEffect(() => {
    if (graphqlClient && companyId) {
      loadCompany(currentPage);
    }
  }, [companyId, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPac = useCallback((id: number) => !!pacMap[id], [pacMap]);
  const isCurrentUser = useCallback((id: number) => (user as Contact)?.contactId === id, [user]);
  const isRowDirty = useCallback((id: number) => !!rowEdits[id]?.dirty, [rowEdits]);
  const getRowRole = useCallback((id: number) => rowEdits[id]?.role ?? '', [rowEdits]);
  const getRowLimit = useCallback((id: number) => rowEdits[id]?.limit, [rowEdits]);
  const isRowLoading = useCallback((id: number) => !!actionLoading[id], [actionLoading]);

  const handleRoleChange = useCallback((contactId: number, role: string): void => {
    setRowEdits(prev => ({
      ...prev,
      [contactId]: { ...(prev[contactId] ?? { role: '', limit: undefined, dirty: false }), role, dirty: true },
    }));
  }, []);

  const handleLimitChange = useCallback((contactId: number, value: string): void => {
    const limit = value === '' ? undefined : Number(value);
    setRowEdits(prev => ({
      ...prev,
      [contactId]: { ...(prev[contactId] ?? { role: '', limit: undefined, dirty: false }), limit, dirty: true },
    }));
  }, []);

  const handleCreate = useCallback(async (contactId: number): Promise<void> => {
    setActionLoading(prev => ({ ...prev, [contactId]: true }));
    try {
      const edit = rowEdits[contactId] ?? { role: Enums.PurchaseRole.PURCHASER, limit: undefined, dirty: false };
      const input: PurchaseAuthorizationConfigCreateInput = {
        contactId,
        companyId,
        purchaseRole: (edit.role || Enums.PurchaseRole.PURCHASER) as Enums.PurchaseRole,
        authorizationLimit: edit.limit,
      };
      if (cbRef.current.onPurchaseAuthorizationCreate) {
        cbRef.current.onPurchaseAuthorizationCreate(input);
      } else {
        const result = await createPac(input);
        if (result.success) await loadCompany(currentPage);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [contactId]: false }));
    }
  }, [rowEdits, companyId, currentPage, createPac, loadCompany]);

  const handleSave = useCallback(async (contactId: number): Promise<void> => {
    const pac = pacMap[contactId];
    if (!pac) return;
    setActionLoading(prev => ({ ...prev, [contactId]: true }));
    try {
      const edit = rowEdits[contactId];
      if (cbRef.current.onPurchaseAuthorizationUpdate) {
        cbRef.current.onPurchaseAuthorizationUpdate(pac);
      } else {
        const result = await updatePac(pac.id, {
          purchaseRole: (edit.role || pac.purchaseRole) as Enums.PurchaseRole,
          authorizationLimit: edit.limit,
        });
        if (result.success) await loadCompany(currentPage);
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [contactId]: false }));
    }
  }, [pacMap, rowEdits, currentPage, updatePac, loadCompany]);

  const handleDelete = useCallback(async (contactId: number): Promise<void> => {
    const pac = pacMap[contactId];
    if (!pac) return;
    setActionLoading(prev => ({ ...prev, [contactId]: true }));
    try {
      if (cbRef.current.onPurchaseAuthorizationDelete) {
        cbRef.current.onPurchaseAuthorizationDelete(pac);
      } else {
        const result = await deletePac(pac.id);
        if (result.success) {
          if (cbRef.current.afterPurchaseAuthorizationDelete) {
            cbRef.current.afterPurchaseAuthorizationDelete(true);
          } else {
            await loadCompany(currentPage);
          }
        }
      }
    } finally {
      setActionLoading(prev => ({ ...prev, [contactId]: false }));
    }
  }, [pacMap, currentPage, deletePac, loadCompany]);

  const handlePageChange = useCallback((page: number): void => {
    setCurrentPage(page);
  }, []);

  const openAddContactModal = useCallback((): void => {
    setAddContactError('');
    setShowAddContactModal(true);
  }, []);

  const closeAddContactModal = useCallback((): void => {
    setShowAddContactModal(false);
    setAddContactError('');
    setAddContactForm(EMPTY_CONTACT_FORM);
  }, []);

  const handleAddContactSubmit = useCallback(async (): Promise<void> => {
    setAddContactLoading(true);
    setAddContactError('');
    try {
      const input: RegisterContactInput = {
        parentId: companyId,
        gender: addContactForm.gender as Enums.Gender,
        email: addContactForm.email,
        firstName: addContactForm.firstName,
        middleName: addContactForm.middleName,
        lastName: addContactForm.lastName,
        phone: addContactForm.phone,
      };
      if (cbRef.current.beforeContactCreate) cbRef.current.beforeContactCreate(input);
      if (cbRef.current.onContactCreate) {
        cbRef.current.onContactCreate(input);
      } else {
        const userService = new UserService(graphqlClient);
        const result = await userService.registerContact({ contactRegisterInput: input });
        if (cbRef.current.afterContactCreate) {
          cbRef.current.afterContactCreate(result.contact as Contact);
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
  }, [graphqlClient, companyId, addContactForm, currentPage, loadCompany, closeAddContactModal]);

  return {
    company, loading, contacts, totalPages, currentPage, isAuthManager,
    rowEdits, pacMap, actionLoading,
    showAddContactModal, addContactForm, addContactLoading, addContactError,
    hasPac, isCurrentUser, isRowDirty, getRowRole, getRowLimit, isRowLoading,
    loadCompany, handleRoleChange, handleLimitChange, handleCreate, handleSave, handleDelete,
    handlePageChange, openAddContactModal, closeAddContactModal, setAddContactForm,
    handleAddContactSubmit,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// usePurchaseAuthorizationRequests
// ══════════════════════════════════════════════════════════════════════════════

export interface UsePurchaseAuthorizationRequestsOptions {
  graphqlClient: GraphQLClient;
  user: Contact | Customer | null;
  companyId: number;
  configuration?: {
    language?: string;
    imageSearchFiltersGrid?: any;
    imageVariantFiltersSmall?: any;
  };
  onAcceptRequest?: (cartId: string) => void;
  afterAcceptRequest?: (cart: Cart) => void;
  onError?: (err: Error) => void;
}

export interface UsePurchaseAuthorizationRequestsReturn {
  carts: Cart[];
  loading: boolean;
  selectedCart: Cart | null;
  modalLoading: boolean;
  acceptLoading: boolean;
  isAuthManager: boolean;
  getTotalQuantity: (cart: Cart) => number;
  getContactName: (contact: Contact | null | undefined) => string;
  getModalItems: () => CartMainItem[];
  loadCarts: () => Promise<void>;
  handleViewCart: (cart: Cart) => Promise<void>;
  handleAcceptRequest: () => Promise<void>;
  closeModal: () => void;
}

export function usePurchaseAuthorizationRequests(
  options: UsePurchaseAuthorizationRequestsOptions,
): UsePurchaseAuthorizationRequestsReturn {
  const { graphqlClient, user, companyId, configuration } = options;
  const cbRef = useRef(options);
  cbRef.current = options;

  const [carts, setCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState<Cart | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [acceptLoading, setAcceptLoading] = useState(false);

  const isAuthManager = useMemo(() => checkIsAuthManager(user, companyId), [user, companyId]);

  const getTotalQuantity = useCallback((cart: Cart): number => {
    return (cart?.items || []).reduce((sum: number, item: CartMainItem) => sum + (item.quantity || 0), 0);
  }, []);

  const getContactName = useCallback((contact: Contact | null | undefined): string => {
    if (!contact) return '';
    return [contact.firstName ?? '', contact.middleName ?? '', contact.lastName ?? ''].filter(Boolean).join(' ');
  }, []);

  const getModalItems = useCallback((): CartMainItem[] => {
    return selectedCart?.items || [];
  }, [selectedCart]);

  const loadCarts = useCallback(async (): Promise<void> => {
    if (!graphqlClient || !companyId) return;
    setLoading(true);
    try {
      const service = new CartService(graphqlClient);
      const response = await service.getCarts({
        statuses: [Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION],
        companyIds: [companyId],
      });
      setCarts(response?.items || []);
    } catch (err: any) {
      cbRef.current.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, companyId]);

  const handleViewCart = useCallback(async (cart: Cart): Promise<void> => {
    setSelectedCart(cart);
    setModalLoading(true);
    try {
      const service = new CartService(graphqlClient);
      const fullCart = await service.getCart({
        cartId: cart.cartId,
        language: configuration?.language || process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
        imageSearchFilters: configuration?.imageSearchFiltersGrid,
        imageVariantFilters: configuration?.imageVariantFiltersSmall,
      });
      setSelectedCart(fullCart);
    } catch (err: any) {
      cbRef.current.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setModalLoading(false);
    }
  }, [graphqlClient, configuration]);

  const handleAcceptRequest = useCallback(async (): Promise<void> => {
    if (!selectedCart) return;
    setAcceptLoading(true);
    const cartId = selectedCart.cartId;
    try {
      let cartForCallback: Cart = selectedCart;
      if (cbRef.current.onAcceptRequest) {
        cbRef.current.onAcceptRequest(cartId);
      } else {
        const service = new CartService(graphqlClient);
        cartForCallback = await service.acceptPurchaseAuthorizationRequest({
          id: cartId,
          input: { contactId: (user as Contact)?.contactId },
          imageSearchFilters: configuration?.imageSearchFiltersGrid,
          imageVariantFilters: configuration?.imageVariantFiltersSmall,
          language: configuration?.language || 'NL',
        });
      }
      cbRef.current.afterAcceptRequest?.(cartForCallback);
      setSelectedCart(null);
      await loadCarts();
    } catch (err: any) {
      cbRef.current.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setAcceptLoading(false);
    }
  }, [graphqlClient, user, selectedCart, configuration, loadCarts]);

  const closeModal = useCallback((): void => {
    setSelectedCart(null);
  }, []);

  // Load on mount and when companyId changes
  useEffect(() => {
    if (graphqlClient && companyId) {
      loadCarts();
    }
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    carts, loading, selectedCart, modalLoading, acceptLoading, isAuthManager,
    getTotalQuantity, getContactName, getModalItems,
    loadCarts, handleViewCart, handleAcceptRequest, closeModal,
  };
}
