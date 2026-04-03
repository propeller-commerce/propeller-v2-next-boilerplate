"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveExistingCart = resolveExistingCart;
exports.startCartWithAddresses = startCartWithAddresses;
exports.addItemToCart = addItemToCart;
exports.validateStock = validateStock;
const propeller_sdk_v2_1 = require("propeller-sdk-v2");
/**
 * Resolve an existing cart for the given user, or return null.
 * Picks the last cart from the user's cart list (matching the Mitosis AddToCart behavior).
 */
async function resolveExistingCart(cartService, user, companyId, config) {
    const searchInput = { offset: 100 };
    if ('contactId' in user && user.contactId) {
        searchInput.contactIds = [user.contactId];
        const resolvedCompanyId = companyId || (user.company && user.company.companyId);
        if (resolvedCompanyId) {
            searchInput.companyIds = [resolvedCompanyId];
        }
    }
    else if ('customerId' in user && user.customerId) {
        searchInput.customerIds = [user.customerId];
    }
    const carts = await cartService.getCarts(searchInput);
    if (!carts?.items?.length)
        return null;
    const lastCartId = carts.items[carts.items.length - 1].cartId;
    const language = config?.language || 'NL';
    const cartVariables = {
        cartId: lastCartId,
        language,
        imageSearchFilters: config?.imageSearchFilters || {},
        imageVariantFilters: config?.imageVariantFilters || {},
    };
    return cartService.getCart(cartVariables);
}
/**
 * Start a new cart and assign default invoice/delivery addresses from the user profile.
 */
async function startCartWithAddresses(cartService, user, companyId, config) {
    const language = config?.language || 'NL';
    const startCartInput = { language };
    if ('contactId' in user && user.contactId) {
        startCartInput.contactId = user.contactId;
        const resolvedCompanyId = companyId || user.companyId;
        if (resolvedCompanyId) {
            startCartInput.companyId = resolvedCompanyId;
        }
    }
    else if ('customerId' in user && user.customerId) {
        startCartInput.customerId = user.customerId;
    }
    const cartStartVars = {
        input: startCartInput,
        language,
        imageSearchFilters: config?.imageSearchFilters || {},
        imageVariantFilters: config?.imageVariantFilters || {},
    };
    let cart = await cartService.startCart(cartStartVars);
    // Assign default addresses
    const addresses = 'company' in user
        ? user.company?.addresses
        : user.addresses;
    if (addresses && Array.isArray(addresses)) {
        const defaultInvoice = addresses.find((addr) => addr.isDefault === 'Y' && addr.type === 'invoice');
        const defaultDelivery = addresses.find((addr) => addr.isDefault === 'Y' && addr.type === 'delivery');
        if (defaultInvoice) {
            cart = await cartService.updateCartAddress({
                id: cart.cartId,
                input: {
                    type: propeller_sdk_v2_1.Enums.CartAddressType.INVOICE,
                    firstName: defaultInvoice.firstName || '',
                    lastName: defaultInvoice.lastName || '',
                    street: defaultInvoice.street || '',
                    postalCode: defaultInvoice.postalCode || '',
                    city: defaultInvoice.city || '',
                    country: defaultInvoice.country || 'NL',
                    company: defaultInvoice.company || '',
                    gender: defaultInvoice.gender || propeller_sdk_v2_1.Enums.Gender.U,
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
                    type: propeller_sdk_v2_1.Enums.CartAddressType.DELIVERY,
                    firstName: defaultDelivery.firstName || '',
                    lastName: defaultDelivery.lastName || '',
                    street: defaultDelivery.street || '',
                    postalCode: defaultDelivery.postalCode || '',
                    city: defaultDelivery.city || '',
                    country: defaultDelivery.country || 'NL',
                    company: defaultDelivery.company || '',
                    gender: defaultDelivery.gender || propeller_sdk_v2_1.Enums.Gender.U,
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
async function addItemToCart(cartService, cartId, input, config) {
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
        imageSearchFilters: config?.imageSearchFilters || {},
        imageVariantFilters: config?.imageVariantFilters || {},
    });
}
/**
 * Validate stock availability for a product.
 * Returns true if stock is sufficient, false otherwise.
 */
function validateStock(product, requestedQuantity) {
    const available = product.inventory?.totalQuantity || 0;
    return available >= requestedQuantity;
}
//# sourceMappingURL=cartLogic.js.map