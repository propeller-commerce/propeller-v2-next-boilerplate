/**
 * Cart event utilities
 * Separate from useCartSync to avoid circular dependencies
 */

/**
 * Utility function to dispatch cart update events
 * Call this whenever cart is modified to notify all listeners
 */
export const dispatchCartUpdate = () => {
  console.log('Dispatching cart update event...');
  const event = new CustomEvent('cartUpdated');
  window.dispatchEvent(event);
};
