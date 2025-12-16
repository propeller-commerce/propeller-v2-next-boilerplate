---
inclusion: always
---

# Shopping Cart Logic & Shopping Cart Page

## Goal
Build a complete shopping cart logic layer and page using `propeller-sdk-v2` CartService:
- Store the Cart in a session-local `cart` variable (localStorage).
- Persist cart between pages & actions.
- Use GraphQL API calls for adding, updating, deleting cart items.
- Render the Cart Sidebar on any page.
- Render the full Shopping Cart Page.

## Cart Service Integration
Use `propeller-sdk-v2/CartService` methods:
- `startCart`
- `addItemToCart`
- `updateCartItem`
- `deleteCartItem`
- `getCarts`
- `getCart`
- `updateCartAddress`

## Cart Creation / User Login Flow
- Anonymous user: Cart must not exist until `addItemToCart` is called → then `startCart`.
- Logged-in user:
  1. Call `getCarts` with contactId/companyId or customerId
  2. If no carts found, call `startCart`
  3. If carts found, take last cart and call `getCart`
  4. Store cart in localStorage
  5. If new cart, assign default addresses

## Add Item to Cart
Call `addItemToCart` with:
- cartId
- productId and quantity
- imageSearchFilters and imageVariantFilters
- language

If no cart exists → `startCart` first.
Show toast notification on success.

## Shopping Cart Sidebar
- Trigger: click Cart icon in Header
- Slide-in animation
- List cart items with image, name, SKU, quantity, price
- Cart totals at bottom
- "Go to cart" button

## Shopping Cart Page
- Full cart view at `/cart`
- Quantity controls with increment/decrement
- Delete button for each item
- Cart totals component
- "Continue to checkout" button

## Cart Totals Component
Shared component showing:
- Subtotal
- Discount (if applicable)
- Shipping
- VAT breakdown
- Final total

status: active
