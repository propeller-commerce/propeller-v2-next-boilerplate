/**
 * usePurchaseAuthorization (Vue) — Purchase Authorization Configurator + Requests.
 *
 * Covers: PurchaseAuthorizationConfigurator, PurchaseAuthorizationRequests.
 * Vue mirror of react/usePurchaseAuthorization.ts.
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
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
  user: Ref<Contact | Customer | null>;
  companyId: Ref<number>;
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
  company: Ref<Company | null>;
  loading: Ref<boolean>;
  contacts: ComputedRef<Contact[]>;
  totalPages: ComputedRef<number>;
  currentPage: Ref<number>;
  // Derived
  isAuthManager: ComputedRef<boolean>;
  // Per-row state
  rowEdits: Ref<Record<number, RowEdit>>;
  pacMap: Ref<Record<number, PurchaseAuthorizationConfig>>;
  actionLoading: Ref<Record<number, boolean>>;
  // Add-contact modal state
  showAddContactModal: Ref<boolean>;
  addContactForm: Ref<AddContactFormState>;
  addContactLoading: Ref<boolean>;
  addContactError: Ref<string>;
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
  handleAddContactSubmit: () => Promise<void>;
}

export function usePurchaseAuthorizationConfigurator(
  options: UsePurchaseAuthorizationConfiguratorOptions,
): UsePurchaseAuthorizationConfiguratorReturn {
  const { graphqlClient, user, companyId, pageOffset = 10 } = options;

  const { company, loading, fetchCompany, createPac, updatePac, deletePac } = useCompany({ graphqlClient });

  const currentPage = ref(1);
  const rowEdits = ref<Record<number, RowEdit>>({});
  const pacMap = ref<Record<number, PurchaseAuthorizationConfig>>({});
  const actionLoading = ref<Record<number, boolean>>({});
  const showAddContactModal = ref(false);
  const addContactForm = ref<AddContactFormState>({ ...EMPTY_CONTACT_FORM });
  const addContactLoading = ref(false);
  const addContactError = ref('');

  const isAuthManager = computed(() => checkIsAuthManager(user.value, companyId.value));

  const contacts = computed<Contact[]>(() => (company.value as Company)?.contacts?.items ?? []);

  const totalPages = computed<number>(() => (company.value as any)?.contacts?.pages ?? 0);

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
    pacMap.value = newPacMap;
    rowEdits.value = newRowEdits;
  }

  async function loadCompany(page: number): Promise<void> {
    if (!graphqlClient || !companyId.value) return;
    await fetchCompany(companyId.value, {
      contactSearchArguments: { page, offset: pageOffset },
      contactPAConfigInput: { companyIds: [companyId.value], page: 1, offset: 100 },
      companyAttributesInput: {} as AttributeResultSearchInput,
    });
    buildMaps((company.value as Company)?.contacts?.items ?? []);
  }

  // Reload when companyId or currentPage changes
  watch(
    [companyId, currentPage],
    () => {
      if (graphqlClient && companyId.value) {
        loadCompany(currentPage.value);
      }
    },
    { immediate: true },
  );

  function hasPac(contactId: number): boolean { return !!pacMap.value[contactId]; }
  function isCurrentUser(contactId: number): boolean { return (user.value as Contact)?.contactId === contactId; }
  function isRowDirty(contactId: number): boolean { return !!rowEdits.value[contactId]?.dirty; }
  function getRowRole(contactId: number): string { return rowEdits.value[contactId]?.role ?? ''; }
  function getRowLimit(contactId: number): number | undefined { return rowEdits.value[contactId]?.limit; }
  function isRowLoading(contactId: number): boolean { return !!actionLoading.value[contactId]; }

  function handleRoleChange(contactId: number, role: string): void {
    const current = rowEdits.value[contactId] ?? { role: '', limit: undefined, dirty: false };
    rowEdits.value = { ...rowEdits.value, [contactId]: { ...current, role, dirty: true } };
  }

  function handleLimitChange(contactId: number, value: string): void {
    const limit = value === '' ? undefined : Number(value);
    const current = rowEdits.value[contactId] ?? { role: '', limit: undefined, dirty: false };
    rowEdits.value = { ...rowEdits.value, [contactId]: { ...current, limit, dirty: true } };
  }

  async function handleCreate(contactId: number): Promise<void> {
    actionLoading.value = { ...actionLoading.value, [contactId]: true };
    try {
      const edit = rowEdits.value[contactId] ?? { role: Enums.PurchaseRole.PURCHASER, limit: undefined, dirty: false };
      const input: PurchaseAuthorizationConfigCreateInput = {
        contactId,
        companyId: companyId.value,
        purchaseRole: (edit.role || Enums.PurchaseRole.PURCHASER) as Enums.PurchaseRole,
        authorizationLimit: edit.limit,
      };
      if (options.onPurchaseAuthorizationCreate) {
        options.onPurchaseAuthorizationCreate(input);
      } else {
        const result = await createPac(input);
        if (result.success) await loadCompany(currentPage.value);
      }
    } finally {
      actionLoading.value = { ...actionLoading.value, [contactId]: false };
    }
  }

  async function handleSave(contactId: number): Promise<void> {
    const pac = pacMap.value[contactId];
    if (!pac) return;
    actionLoading.value = { ...actionLoading.value, [contactId]: true };
    try {
      const edit = rowEdits.value[contactId];
      if (options.onPurchaseAuthorizationUpdate) {
        options.onPurchaseAuthorizationUpdate(pac);
      } else {
        const result = await updatePac(pac.id, {
          purchaseRole: (edit.role || pac.purchaseRole) as Enums.PurchaseRole,
          authorizationLimit: edit.limit,
        });
        if (result.success) await loadCompany(currentPage.value);
      }
    } finally {
      actionLoading.value = { ...actionLoading.value, [contactId]: false };
    }
  }

  async function handleDelete(contactId: number): Promise<void> {
    const pac = pacMap.value[contactId];
    if (!pac) return;
    actionLoading.value = { ...actionLoading.value, [contactId]: true };
    try {
      if (options.onPurchaseAuthorizationDelete) {
        options.onPurchaseAuthorizationDelete(pac);
      } else {
        const result = await deletePac(pac.id);
        if (result.success) {
          if (options.afterPurchaseAuthorizationDelete) {
            options.afterPurchaseAuthorizationDelete(true);
          } else {
            await loadCompany(currentPage.value);
          }
        }
      }
    } finally {
      actionLoading.value = { ...actionLoading.value, [contactId]: false };
    }
  }

  function handlePageChange(page: number): void {
    currentPage.value = page;
  }

  function openAddContactModal(): void {
    addContactError.value = '';
    showAddContactModal.value = true;
  }

  function closeAddContactModal(): void {
    showAddContactModal.value = false;
    addContactError.value = '';
    addContactForm.value = { ...EMPTY_CONTACT_FORM };
  }

  async function handleAddContactSubmit(): Promise<void> {
    addContactLoading.value = true;
    addContactError.value = '';
    try {
      const input: RegisterContactInput = {
        parentId: companyId.value,
        gender: addContactForm.value.gender as Enums.Gender,
        email: addContactForm.value.email,
        firstName: addContactForm.value.firstName,
        middleName: addContactForm.value.middleName,
        lastName: addContactForm.value.lastName,
        phone: addContactForm.value.phone,
      };
      if (options.beforeContactCreate) options.beforeContactCreate(input);
      if (options.onContactCreate) {
        options.onContactCreate(input);
      } else {
        const userService = new UserService(graphqlClient);
        const result = await userService.registerContact({ contactRegisterInput: input });
        if (options.afterContactCreate) {
          options.afterContactCreate(result.contact as Contact);
        } else {
          await loadCompany(currentPage.value);
        }
      }
      closeAddContactModal();
    } catch (err: any) {
      addContactError.value = err?.message || 'Failed to create contact';
    } finally {
      addContactLoading.value = false;
    }
  }

  return {
    company: company as Ref<Company | null>,
    loading,
    contacts,
    totalPages,
    currentPage,
    isAuthManager,
    rowEdits,
    pacMap,
    actionLoading,
    showAddContactModal,
    addContactForm,
    addContactLoading,
    addContactError,
    hasPac,
    isCurrentUser,
    isRowDirty,
    getRowRole,
    getRowLimit,
    isRowLoading,
    loadCompany,
    handleRoleChange,
    handleLimitChange,
    handleCreate,
    handleSave,
    handleDelete,
    handlePageChange,
    openAddContactModal,
    closeAddContactModal,
    handleAddContactSubmit,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// usePurchaseAuthorizationRequests
// ══════════════════════════════════════════════════════════════════════════════

export interface UsePurchaseAuthorizationRequestsOptions {
  graphqlClient: GraphQLClient;
  user: Ref<Contact | Customer | null>;
  companyId: Ref<number>;
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
  carts: Ref<Cart[]>;
  loading: Ref<boolean>;
  selectedCart: Ref<Cart | null>;
  modalLoading: Ref<boolean>;
  acceptLoading: Ref<boolean>;
  isAuthManager: ComputedRef<boolean>;
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

  const carts = ref<Cart[]>([]) as Ref<Cart[]>;
  const loading = ref(true);
  const selectedCart = ref<Cart | null>(null) as Ref<Cart | null>;
  const modalLoading = ref(false);
  const acceptLoading = ref(false);

  const isAuthManager = computed(() => checkIsAuthManager(user.value, companyId.value));

  function getTotalQuantity(cart: Cart): number {
    return (cart?.items || []).reduce((sum: number, item: CartMainItem) => sum + (item.quantity || 0), 0);
  }

  function getContactName(contact: Contact | null | undefined): string {
    if (!contact) return '';
    return [contact.firstName ?? '', contact.middleName ?? '', contact.lastName ?? ''].filter(Boolean).join(' ');
  }

  function getModalItems(): CartMainItem[] {
    return selectedCart.value?.items || [];
  }

  async function loadCarts(): Promise<void> {
    if (!graphqlClient || !companyId.value) return;
    loading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const response = await service.getCarts({
        statuses: [Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION],
        companyIds: [companyId.value],
      });
      carts.value = response?.items || [];
    } catch (err: any) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      loading.value = false;
    }
  }

  async function handleViewCart(cart: Cart): Promise<void> {
    selectedCart.value = cart;
    modalLoading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const fullCart = await service.getCart({
        cartId: cart.cartId,
        language: configuration?.language || process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
        imageSearchFilters: configuration?.imageSearchFiltersGrid,
        imageVariantFilters: configuration?.imageVariantFiltersSmall,
      });
      selectedCart.value = fullCart;
    } catch (err: any) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      modalLoading.value = false;
    }
  }

  async function handleAcceptRequest(): Promise<void> {
    if (!selectedCart.value) return;
    acceptLoading.value = true;
    const cartId = selectedCart.value.cartId;
    try {
      let cartForCallback: Cart = selectedCart.value;
      if (options.onAcceptRequest) {
        options.onAcceptRequest(cartId);
      } else {
        const service = new CartService(graphqlClient);
        cartForCallback = await service.acceptPurchaseAuthorizationRequest({
          id: cartId,
          input: { contactId: (user.value as Contact)?.contactId },
          imageSearchFilters: configuration?.imageSearchFiltersGrid,
          imageVariantFilters: configuration?.imageVariantFiltersSmall,
          language: configuration?.language || 'NL',
        });
      }
      options.afterAcceptRequest?.(cartForCallback);
      selectedCart.value = null;
      await loadCarts();
    } catch (err: any) {
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      acceptLoading.value = false;
    }
  }

  function closeModal(): void {
    selectedCart.value = null;
  }

  // Reload when companyId changes
  watch(
    companyId,
    () => {
      if (graphqlClient && companyId.value) {
        loadCarts();
      }
    },
    { immediate: true },
  );

  return {
    carts, loading, selectedCart, modalLoading, acceptLoading, isAuthManager,
    getTotalQuantity, getContactName, getModalItems,
    loadCarts, handleViewCart, handleAcceptRequest, closeModal,
  };
}
