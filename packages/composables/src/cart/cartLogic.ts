import {
  CartService,
  CartSearchInput,
  CartStartInput,
  CartStartVariables,
  Address,
  Enums,
  Cart,
  Contact,
  Customer,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';
import type { CartQueryVariables } from 'propeller-sdk-v2/dist/service/CartService';
import type { AddItemInput } from './types';

interface CartLogicConfig {
  language?: string;
  imageSearchFilters?: MediaImageProductSearchInput;
  imageVariantFilters?: TransformationsInput;
}

/**
 * Resolve an existing cart for the given user, or return null.
 * Picks the last cart from the user's cart list (matching the Mitosis AddToCart behavior).
 */
export async function resolveExistingCart(
  cartService: CartService,
  user: Contact | Customer,
  companyId?: number,
  config?: CartLogicConfig,
): Promise<Cart | null> {
  const searchInput: CartSearchInput = { offset: 100 };

  if ('contactId' in user && user.contactId) {
    searchInput.contactIds = [user.contactId];
    const resolvedCompanyId =
      companyId || (user.company && user.company.companyId);
    if (resolvedCompanyId) {
      searchInput.companyIds = [resolvedCompanyId];
    }
  } else if ('customerId' in user && (user as Customer).customerId) {
    searchInput.customerIds = [(user as Customer).customerId];
  }

  const carts = await cartService.getCarts(searchInput);

  if (!carts?.items?.length) return null;

  const lastCartId = carts.items[carts.items.length - 1].cartId;
  const language = config?.language || 'NL';

  const cartVariables: CartQueryVariables = {
    cartId: lastCartId,
    language,
    imageSearchFilters: config?.imageSearchFilters || ({} as MediaImageProductSearchInput),
    imageVariantFilters: config?.imageVariantFilters || ({} as TransformationsInput),
  };

  return cartService.getCart(cartVariables);
}

/**
 * Start a new cart and assign default invoice/delivery addresses from the user profile.
 */
export async function startCartWithAddresses(
  cartService: CartService,
  user: Contact | Customer,
  companyId?: number,
  config?: CartLogicConfig,
): Promise<Cart> {
  const language = config?.language || 'NL';

  const startCartInput: CartStartInput = { language };

  if ('contactId' in user && user.contactId) {
    startCartInput.contactId = user.contactId;
    const resolvedCompanyId = companyId || (user as any).companyId;
    if (resolvedCompanyId) {
      startCartInput.companyId = resolvedCompanyId as number;
    }
  } else if ('customerId' in user && (user as Customer).customerId) {
    startCartInput.customerId = (user as Customer).customerId;
  }

  const cartStartVars: CartStartVariables = {
    input: startCartInput,
    language,
    imageSearchFilters: config?.imageSearchFilters || ({} as MediaImageProductSearchInput),
    imageVariantFilters: config?.imageVariantFilters || ({} as TransformationsInput),
  };

  let cart = await cartService.startCart(cartStartVars);

  // Assign default addresses
  const addresses =
    'company' in user
      ? user.company?.addresses
      : (user as Customer).addresses;

  if (addresses && Array.isArray(addresses)) {
    const defaultInvoice = addresses.find(
      (addr: Address) => addr.isDefault === 'Y' && addr.type === 'invoice',
    );
    const defaultDelivery = addresses.find(
      (addr: Address) => addr.isDefault === 'Y' && addr.type === 'delivery',
    );

    if (defaultInvoice) {
      cart = await cartService.updateCartAddress({
        id: cart.cartId,
        input: {
          type: Enums.CartAddressType.INVOICE,
          firstName: defaultInvoice.firstName || '',
          lastName: defaultInvoice.lastName || '',
          street: defaultInvoice.street || '',
          postalCode: defaultInvoice.postalCode || '',
          city: defaultInvoice.city || '',
          country: defaultInvoice.country || 'NL',
          company: defaultInvoice.company || '',
          gender: defaultInvoice.gender || Enums.Gender.U,
          middleName: defaultInvoice.middleName || '',
          number: defaultInvoice.number || '',
          numberExtension: defaultInvoice.numberExtension || '',
          email: defaultInvoice.email || '',
          mobile: defaultInvoice.mobile || '',
          phone: defaultInvoice.phone || '',
          notes: defaultInvoice.notes || '',
        },
        imageSearchFilters: config?.imageSearchFilters,
        imageVariantFilters: config?.imageVariantFilters,
        language,
      });
    }

    if (defaultDelivery) {
      cart = await cartService.updateCartAddress({
        id: cart.cartId,
        input: {
          type: Enums.CartAddressType.DELIVERY,
          firstName: defaultDelivery.firstName || '',
          lastName: defaultDelivery.lastName || '',
          street: defaultDelivery.street || '',
          postalCode: defaultDelivery.postalCode || '',
          city: defaultDelivery.city || '',
          country: defaultDelivery.country || 'NL',
          company: defaultDelivery.company || '',
          gender: defaultDelivery.gender || Enums.Gender.U,
          middleName: defaultDelivery.middleName || '',
          number: defaultDelivery.number || '',
          numberExtension: defaultDelivery.numberExtension || '',
          email: defaultDelivery.email || '',
          mobile: defaultDelivery.mobile || '',
          phone: defaultDelivery.phone || '',
          notes: defaultDelivery.notes || '',
        },
        imageSearchFilters: config?.imageSearchFilters,
        imageVariantFilters: config?.imageVariantFilters,
        language,
      });
    }
  }

  return cart;
}

/**
 * Add a product to an existing cart.
 */
export async function addItemToCart(
  cartService: CartService,
  cartId: string,
  input: AddItemInput,
  config?: CartLogicConfig,
): Promise<Cart> {
  const language = config?.language || 'NL';

  const childItems = input.childItems
    ? input.childItems.map((id) => ({ productId: id, quantity: input.quantity }))
    : undefined;

  return cartService.addItemToCart({
    id: cartId,
    input: {
      productId: input.product.productId,
      quantity: input.quantity,
      ...(input.cluster?.clusterId !== undefined && {
        clusterId: input.cluster.clusterId,
      }),
      ...(childItems && { childItems }),
      ...(input.notes && { notes: input.notes }),
      ...(input.price !== undefined && { price: input.price }),
    },
    language,
    imageSearchFilters: config?.imageSearchFilters || ({} as MediaImageProductSearchInput),
    imageVariantFilters: config?.imageVariantFilters || ({} as TransformationsInput),
  });
}

/**
 * Validate stock availability for a product.
 * Returns true if stock is sufficient, false otherwise.
 */
export function validateStock(
  product: { inventory?: { totalQuantity?: number } },
  requestedQuantity: number,
): boolean {
  const available = product.inventory?.totalQuantity || 0;
  return available >= requestedQuantity;
}
