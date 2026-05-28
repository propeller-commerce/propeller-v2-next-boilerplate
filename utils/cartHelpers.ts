import { Cart } from 'propeller-sdk-v2';

/**
 * Recursively strips underscore-prefixed keys from SDK class instances
 * e.g. { _street: 'Main St' } → { street: 'Main St' }
 */
function deepPlain(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepPlain);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const cleanKey = key.startsWith('_') ? key.slice(1) : key;
      result[cleanKey] = deepPlain(value);
    }
    return result;
  }
  return obj;
}

/**
 * Converts a Cart object to a plain object without private property prefixes
 * This is used when saving to localStorage
 */
export const serializeCart = (cart: Cart): string => {
  const cleanCart = {
    cartId: cart.cartId,
    channelId: cart.channelId,
    contactId: cart.contactId,
    customerId: cart.customerId,
    companyId: cart.companyId,
    notes: cart.notes,
    reference: cart.reference,
    items: deepPlain(cart.items),
    bonusItems: deepPlain(cart.bonusItems),
    total: deepPlain(cart.total),
    invoiceAddress: deepPlain(cart.invoiceAddress),
    deliveryAddress: deepPlain(cart.deliveryAddress),
    createdAt: cart.createdAt,
    lastModifiedAt: cart.lastModifiedAt,
    language: cart.language,
    status: cart.status,
    payMethods: deepPlain(cart.payMethods),
    carriers: deepPlain(cart.carriers),
    actionCode: cart.actionCode,
    vouchers: deepPlain(cart.vouchers),
    paymentData: deepPlain(cart.paymentData),
    postageData: deepPlain(cart.postageData),
    taxLevels: deepPlain(cart.taxLevels),
  };

  return JSON.stringify(cleanCart);
};

/**
 * Deserializes a cart from localStorage and creates a proper Cart instance
 */
export const deserializeCart = (cartJson: string): Cart | null => {
  try {
    const cartData = JSON.parse(cartJson);
    return cartData as Cart;
  } catch (error) {
    console.error('Failed to deserialize cart:', error);
    return null;
  }
};

/**
 * Restore the manager's own cart after they finish acting on a requester's
 * authorization cart.
 *
 * When a manager accepts an authorization request, their own cart is parked in
 * `manager_cart` (see the account/authorization-requests page) and the
 * requester's cart is loaded. Whether the manager completes that cart by
 * placing the order OR by submitting it for further authorization, control of
 * the storefront returns to the manager — so their parked cart must come back.
 *
 * Returns the restored Cart when one was parked (caller should saveCart it),
 * or `null` when there was nothing to restore (caller should clear).
 */
export const restoreManagerCart = (): Cart | null => {
  if (typeof window === 'undefined') return null;
  const parked = localStorage.getItem('manager_cart');
  if (!parked) return null;
  localStorage.removeItem('manager_cart');
  return deserializeCart(parked);
};
