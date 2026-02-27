# AddToCart

A self-contained Mitosis UI component that renders a quantity selector and an **Add** button. It handles cart resolution (existing cart lookup or new cart creation), optional stock validation, and user feedback via a fixed toast notification or a modal popup.

**Source:** `ui-components/AddToCart.lite.tsx`
**Compiled React:** `output/react/ui-components/AddToCart`
**Compiled Vue:** `output/vue/ui-components/AddToCart`

---

## Usage

### Minimal (with external cart management)

```tsx
import AddToCart from '@/output/react/ui-components/AddToCart';
import { graphqlClient } from '@/lib/api';

<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={product}
  cartId={cart?.cartId}
  configuration={config}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
/>
```

### With automatic cart creation

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={product}
  configuration={config}
  createCart={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart, addedItem) => {
    saveCart(updatedCart);
    console.log('Added item:', addedItem);
  }}
/>
```

### With cluster / configurable product

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={product}
  cartId={cart?.cartId}
  configuration={config}
  clusterId={selectedClusterId}
  childItems={[optionProductId1, optionProductId2]}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### With modal popup instead of toast

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={product}
  cartId={cart?.cartId}
  configuration={config}
  showModal={true}
  onProceedToCheckout={() => router.push('/checkout')}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### With custom add-to-cart handler

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={product}
  cartId={cart?.cartId}
  configuration={config}
  onAddToCart={(product, clusterId, quantity, childItems, notes, price) => {
    // custom logic — must return a Cart object
    return myCustomAddToCart(product.productId, quantity);
  }}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Fully localised (Dutch)

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={product}
  cartId={cart?.cartId}
  configuration={config}
  language="NL"
  labels={{
    add: 'Toevoegen',
    adding: 'Toevoegen...',
    addedToCart: 'toegevoegd aan winkelwagen',
    outOfStock: 'Onvoldoende voorraad',
    errorAdding: 'Kan product niet toevoegen',
    noCartId: 'Geen winkelwagen beschikbaar',
    modalTitle: 'Toegevoegd aan winkelwagen',
    quantity: 'Aantal',
    continueShopping: 'Verder winkelen',
    proceedToCheckout: 'Naar afrekenen',
  }}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

---

## Props

### Required

| Prop | Type | Description |
|---|---|---|
| `graphqlClient` | `GraphQLClient` | Initialised Propeller SDK GraphQL client |
| `user` | `Contact \| Customer \| null` | Authenticated user — used for cart creation/lookup |
| `product` | `Product` | The product to add. `product.productId` is used for the cart mutation; `product.names[0].value` is used in the toast message |

### Cart

| Prop | Type | Default | Description |
|---|---|---|---|
| `cartId` | `string` | — | ID of an existing cart to add the item to. Required when `onAddToCart` is not provided and `createCart` is `false` |
| `createCart` | `boolean` | `false` | When `true` and no `cartId` is available, the component automatically looks up or creates a cart for the user via `CartService`. **Always pair with `onCartCreated`** to persist the new cart ID |
| `onCartCreated` | `(cart: Cart) => void` | — | Called after a new cart is created internally. Use this to store the `cartId` in your app state/context. Without it, a new cart is created on every add-to-cart click |
| `configuration` | `any` | — | Config object providing `imageSearchFiltersGrid` and `imageVariantFiltersSmall` for cart API calls (same object used in `CartContext`) |
| `language` | `string` | `'NL'` | Language code forwarded to all CartService operations |

### Product / Item

| Prop | Type | Default | Description |
|---|---|---|---|
| `clusterId` | `number` | — | Cluster ID for configurable products |
| `childItems` | `number[]` | — | Product IDs of the selected cluster child options. Internally converted to `CartChildItemInput[]` |
| `notes` | `string` | — | Free-text notes attached to the cart item |
| `price` | `number` | — | Custom unit price override (external pricing). Omit to use the calculated price |

### Behaviour

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowIncrDecr` | `boolean` | `true` | Renders `−` and `+` buttons flanking the quantity input. Set to `false` for a plain `<input type="number">` |
| `enableStockValidation` | `boolean` | `false` | Checks `product.inventory.totalQuantity` before adding. Shows an error toast if quantity exceeds available stock |
| `showModal` | `boolean` | `false` | After a successful add, shows a modal instead of the toast. The modal displays the product image, name (linked to the product page), SKU, quantity and price, with **Continue shopping** and **Proceed to checkout** buttons |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onAddToCart` | `(product, clusterId?, quantity?, childItems?, notes?, price?, showModal?) => Cart` | Fully replaces the internal `CartService.addItemToCart` call. The returned `Cart` is passed on to `afterAddToCart` |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | Called after every successful add — whether via `onAddToCart` or the internal service. Receives the updated cart and the matching `CartMainItem` (found by `productId`) |
| `onProceedToCheckout` | `() => void` | Called when the user clicks **Proceed to checkout** in the modal (only relevant when `showModal` is `true`) |

### Appearance

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | — | CSS class applied to the root `<div>` |
| `labels` | `Record<string, string>` | — | Override any UI string. See table below |

---

## Labels

| Key | Default value | Shown when |
|---|---|---|
| `add` | `'Add'` | Button idle state |
| `adding` | `'Adding...'` | Button loading state |
| `addedToCart` | `'added to cart'` | Success toast suffix — full message is `"{productName} added to cart"` |
| `outOfStock` | `'Insufficient stock available'` | Error toast when `enableStockValidation` blocks the add |
| `noCartId` | `'No cart ID provided'` | Error toast when no cart is available and `createCart` is `false` |
| `errorAdding` | `'Failed to add item to cart'` | Error toast on API exception |
| `modalTitle` | `'Added to cart'` | Modal title bar heading (only when `showModal: true`) |
| `quantity` | `'Quantity'` | Label preceding the quantity value in the modal product row |
| `continueShopping` | `'Continue shopping'` | Left modal button |
| `proceedToCheckout` | `'Proceed to checkout'` | Right modal button |

---

## Internal behaviour

### Cart ID resolution (when `onAddToCart` is not provided)
1. Uses `props.cartId` if present
2. Falls back to an internally cached `state.activeCartId` (set by a previous `initCart` call in the same session)
3. If neither exists and `createCart: true`:
   - Calls `CartService.getCarts` to find the most recent existing cart for the user
   - If found, adopts it and fires `onCartCreated`
   - If not found, calls `CartService.startCart`, assigns default invoice/delivery addresses from the user's address book, then fires `onCartCreated`
4. If still no cart ID → shows `noCartId` error toast

### Toast notifications
- Position: `fixed top-4 right-4 z-50`
- Width: `w-80` (320 px)
- Auto-dismisses after **3 seconds**
- Can be dismissed immediately with the × button
- Green (success) or red (error) colour scheme
- Suppressed for success when `showModal: true` (modal takes over); error toasts still show

### Modal (`showModal: true`)
- Backdrop: `bg-gray-500/20` — subtle, slightly opaque veil, clickable to close
- Panel: `max-w-lg` (512 px), white, `shadow-2xl`
- **Title bar** — green checkmark icon + `modalTitle` label + × close button
- **Product row** — thumbnail image (`media.images[0].imageVariants[0].url`), product name as a link to `/product/{productId}/{slug}`, SKU, quantity and formatted price; each field is only rendered when the data is present
- **Buttons** — `continueShopping` (outlined) closes the modal; `proceedToCheckout` (violet filled) closes the modal and fires `onProceedToCheckout`

### Stock validation (`enableStockValidation: true`)
- Reads `props.product.inventory.totalQuantity`
- Blocks the add and shows the `outOfStock` toast if requested quantity exceeds available stock
- No additional API call is made — relies on the `inventory` field already present on the `Product` object
