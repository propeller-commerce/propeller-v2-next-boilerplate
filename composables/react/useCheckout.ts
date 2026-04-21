/**
 * useCheckout (React) — Multi-step checkout SDK logic.
 *
 * Encapsulates all SDK service calls for the checkout flow:
 * - Pre-populating cart addresses from user's saved default addresses
 * - Updating cart invoice/delivery addresses
 * - Updating cart shipping + payment data
 * - Placing an order or quote request (processCart → setOrderStatus → optional triggerQuoteSendRequest)
 * - Syncing a user's stored account address after in-checkout edits
 */

import { useState, useCallback } from 'react';
import { CartService, OrderService, AddressService, Enums } from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Cart,
  CartUpdateAddressInput,
  CartUpdateInput,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';
import type { AnyUser } from '../shared/utils/userIdentity';
import { isContact, isCustomer } from '../shared/utils/userIdentity';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseCheckoutOptions {
  graphqlClient: GraphQLClient;
  user: AnyUser;
  companyId?: number;
  language?: string;
  configuration?: {
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersSmall?: TransformationsInput;
  };
}

export interface PlaceOrderOptions {
  cartId: string;
  orderStatus: 'NEW' | 'REQUEST';
  reference?: string;
  notes?: string;
  isQuoteMode?: boolean;
}

export interface UseCheckoutReturn {
  loading: boolean;
  error: string | null;
  /** Pre-populate cart addresses from user's default saved addresses. Returns updated cart. */
  populateCartAddresses: (cart: Cart) => Promise<Cart>;
  /** Update a single cart address (invoice or delivery). Returns updated cart. */
  updateCartAddress: (cartId: string, input: CartUpdateAddressInput) => Promise<Cart>;
  /** Update cart shipping carrier + payment method. Returns updated cart. */
  updateCartShipping: (cartId: string, input: CartUpdateInput) => Promise<Cart>;
  /** Process cart to order/quote, set status, optionally trigger quote send. Returns orderId on success. */
  placeOrder: (options: PlaceOrderOptions) => Promise<{ success: boolean; orderId?: number; error?: string }>;
  /** Sync a user's stored account address with data entered during checkout. */
  updateUserAccountAddress: (addressData: Record<string, unknown>, type: Enums.CartAddressType) => Promise<void>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useCheckout(options: UseCheckoutOptions): UseCheckoutReturn {
  const { graphqlClient, user, companyId } = options;
  const language = options.language ?? 'NL';
  const configuration = options.configuration ?? {};

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function getActiveCompany() {
    if (!user || !isContact(user)) return null;
    if (companyId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companiesRaw = (user as any).companies;
      const items = (companiesRaw?.items ?? companiesRaw?._items ?? companiesRaw) as Array<{ companyId: number; addresses?: unknown[] }> | undefined;
      if (Array.isArray(items)) {
        const found = items.find((c) => c.companyId === companyId);
        if (found) return found;
      }
    }
    return user.company ?? null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getUserDefaultAddress(type: 'invoice' | 'delivery'): any | null {
    if (!user) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let addresses: any[] = [];
    if (isContact(user)) {
      const company = getActiveCompany();
      if (company) addresses = (company as { addresses?: unknown[] }).addresses as typeof addresses || [];
    } else if (isCustomer(user)) {
      addresses = user.addresses || [];
    }
    const addressType = type === 'invoice' ? Enums.AddressType.invoice : Enums.AddressType.delivery;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return addresses.find((a: any) => a.type === addressType && a.isDefault === 'Y')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      || addresses.find((a: any) => a.type === addressType)
      || null;
  }

  // ── Populate cart addresses ───────────────────────────────────────────────

  const populateCartAddresses = useCallback(
    async (cart: Cart): Promise<Cart> => {
      const cartService = new CartService(graphqlClient);
      const imageSearchFilters = configuration.imageSearchFiltersGrid;
      const imageVariantFilters = configuration.imageVariantFiltersSmall;
      const hasInvoice = !!cart.invoiceAddress?.street;
      const hasDelivery = !!cart.deliveryAddress?.street;

      let updatedCart = cart;

      if (!hasInvoice) {
        const defaultInvoice = getUserDefaultAddress('invoice');
        if (defaultInvoice) {
          const input: CartUpdateAddressInput = {
            type: Enums.CartAddressType.INVOICE,
            firstName: defaultInvoice.firstName || '',
            lastName: defaultInvoice.lastName || '',
            street: defaultInvoice.street || '',
            postalCode: defaultInvoice.postalCode || '',
            city: defaultInvoice.city || '',
            company: defaultInvoice.company,
            gender: defaultInvoice.gender,
            middleName: defaultInvoice.middleName,
            number: defaultInvoice.number,
            numberExtension: defaultInvoice.numberExtension,
            country: defaultInvoice.country,
            email: defaultInvoice.email,
            mobile: defaultInvoice.mobile,
            phone: defaultInvoice.phone,
          };
          updatedCart = await cartService.updateCartAddress({
            id: updatedCart.cartId,
            input,
            imageVariantFilters,
            imageSearchFilters,
            language,
          });
        }
      }

      if (!hasDelivery) {
        const defaultDelivery = getUserDefaultAddress('delivery');
        if (defaultDelivery) {
          const input: CartUpdateAddressInput = {
            type: Enums.CartAddressType.DELIVERY,
            firstName: defaultDelivery.firstName || '',
            lastName: defaultDelivery.lastName || '',
            street: defaultDelivery.street || '',
            postalCode: defaultDelivery.postalCode || '',
            city: defaultDelivery.city || '',
            company: defaultDelivery.company,
            gender: defaultDelivery.gender,
            middleName: defaultDelivery.middleName,
            number: defaultDelivery.number,
            numberExtension: defaultDelivery.numberExtension,
            country: defaultDelivery.country,
            email: defaultDelivery.email,
            mobile: defaultDelivery.mobile,
            phone: defaultDelivery.phone,
          };
          updatedCart = await cartService.updateCartAddress({
            id: updatedCart.cartId,
            input,
            imageVariantFilters,
            imageSearchFilters,
            language,
          });
        }
      }

      return updatedCart;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphqlClient, user, companyId, language, configuration]
  );

  // ── Update cart address ───────────────────────────────────────────────────

  const updateCartAddress = useCallback(
    async (cartId: string, input: CartUpdateAddressInput): Promise<Cart> => {
      const cartService = new CartService(graphqlClient);
      return cartService.updateCartAddress({
        id: cartId,
        input,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        language,
      });
    },
    [graphqlClient, language, configuration]
  );

  // ── Update cart shipping ──────────────────────────────────────────────────

  const updateCartShipping = useCallback(
    async (cartId: string, input: CartUpdateInput): Promise<Cart> => {
      const cartService = new CartService(graphqlClient);
      return cartService.updateCart({
        id: cartId,
        input,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        language,
      });
    },
    [graphqlClient, language, configuration]
  );

  // ── Place order ───────────────────────────────────────────────────────────

  const placeOrder = useCallback(
    async (opts: PlaceOrderOptions): Promise<{ success: boolean; orderId?: number; error?: string }> => {
      setLoading(true);
      setError(null);
      try {
        const cartService = new CartService(graphqlClient);
        const orderService = new OrderService(graphqlClient);
        const { cartId, orderStatus, reference, notes, isQuoteMode } = opts;

        if (reference || notes) {
          await cartService.updateCart({
            id: cartId,
            input: { reference: reference || undefined, notes: notes || undefined },
            imageVariantFilters: configuration.imageVariantFiltersSmall,
            imageSearchFilters: configuration.imageSearchFiltersGrid,
            language,
          });
        }

        const response = await cartService.processCart({
          id: cartId,
          input: { orderStatus: orderStatus as string, language },
        });

        if (!response?.cartOrderId) {
          throw new Error('No order ID returned from processCart');
        }

        const orderId = response.cartOrderId;

        await orderService.setOrderStatus({
          orderId,
          status: orderStatus as string,
          payStatus: Enums.PaymentStatuses.OPEN,
          sendOrderConfirmationEmail: !isQuoteMode,
          addPDFAttachment: !isQuoteMode,
          triggerOrderSendConfirmEvent: !isQuoteMode,
          deleteCart: true,
        });

        if (isQuoteMode) {
          await orderService.triggerQuoteSendRequest({ orderId, language });
        }

        return { success: true, orderId };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to place order';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [graphqlClient, language, configuration]
  );

  // ── Update user account address ───────────────────────────────────────────

  const updateUserAccountAddress = useCallback(
    async (addressData: Record<string, unknown>, type: Enums.CartAddressType): Promise<void> => {
      if (!user) return;

      const addressService = new AddressService(graphqlClient);
      const addressType = type === Enums.CartAddressType.INVOICE
        ? Enums.AddressType.invoice
        : Enums.AddressType.delivery;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let addresses: any[] = [];
      const company = isContact(user) ? getActiveCompany() : null;
      if (isContact(user)) {
        if (!company) return;
        addresses = (company as { addresses?: unknown[] }).addresses as typeof addresses || [];
      } else if (isCustomer(user)) {
        addresses = user.addresses || [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchedAddr = addresses.find((a: any) => a.type === addressType && a.isDefault === 'Y')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        || addresses.find((a: any) => a.type === addressType);

      if (!matchedAddr?.id) return;

      try {
        const commonFields = {
          id: Number(matchedAddr.id),
          company: addressData.company as string | undefined,
          gender: addressData.gender as Enums.Gender | undefined,
          firstName: addressData.firstName as string | undefined,
          middleName: addressData.middleName as string | undefined,
          lastName: addressData.lastName as string | undefined,
          email: addressData.email as string | undefined,
          street: addressData.street as string | undefined,
          number: addressData.number as string | undefined,
          numberExtension: addressData.numberExtension as string | undefined,
          postalCode: addressData.postalCode as string | undefined,
          city: addressData.city as string | undefined,
          country: addressData.country as string | undefined,
          isDefault: matchedAddr.isDefault,
        };

        if (isContact(user) && company) {
          await addressService.updateCompanyAddress({
            ...commonFields,
            companyId: (company as { companyId: number }).companyId,
          });
        } else if (isCustomer(user)) {
          await addressService.updateCustomerAddress({
            ...commonFields,
            customerId: user.customerId,
          });
        }
      } catch (e: unknown) {
        console.error('Error updating user account address:', e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graphqlClient, user, companyId]
  );

  return {
    loading,
    error,
    populateCartAddresses,
    updateCartAddress,
    updateCartShipping,
    placeOrder,
    updateUserAccountAddress,
  };
}
