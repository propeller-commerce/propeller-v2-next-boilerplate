import { Cart } from 'propeller-sdk-v2';

/**
 * Converts a Cart object to a plain object without private property prefixes
 * This is used when saving to localStorage
 */
export const serializeCart = (cart: Cart): string => {
  // The Cart object already has proper getters, so we can access properties directly
  // We'll create a clean object structure
  const cleanCart = {
    cartId: cart.cartId,
    channelId: cart.channelId,
    shopId: cart.shopId,
    contactId: cart.contactId,
    customerId: cart.customerId,
    companyId: cart.companyId,
    notes: cart.notes,
    reference: cart.reference,
    items: cart.items,
    total: cart.total,
    invoiceAddress: cart.invoiceAddress,
    deliveryAddress: cart.deliveryAddress,
    createdAt: cart.createdAt,
    lastModifiedAt: cart.lastModifiedAt,
    language: cart.language,
    status: cart.status,
    payMethods: cart.payMethods,
    carriers: cart.carriers,
    actionCode: cart.actionCode,
    vouchers: cart.vouchers,
  };

  return JSON.stringify(cleanCart);
};

/**
 * Deserializes a cart from localStorage and creates a proper Cart instance
 */
export const deserializeCart = (cartJson: string): Cart | null => {
  try {
    const cartData = JSON.parse(cartJson);
    return new Cart(cartData);
  } catch (error) {
    console.error('Failed to deserialize cart:', error);
    return null;
  }
};
