import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AddToCart

A self-contained component that renders a quantity selector and an **Add** button for adding products to a Propeller Commerce cart. It handles cart resolution (existing cart lookup or new cart creation), optional stock validation, and user feedback via a toast notification or a confirmation modal.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Simple product

```tsx
import AddToCart from '@/components/propeller/AddToCart';
import { graphqlClient } from '@/lib/graphql';
import config from '@/data/config';

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

When no cart exists yet, `createCart` tells the component to find or create one automatically. Always pair it with `onCartCreated` so the new cart ID is persisted in your app state.

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

### Cluster product with selected options

For configurable products (clusters), pass the `cluster` object and the selected child product IDs. The component converts `childItems` into `CartChildItemInput[]` internally.

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={selectedVariant}
  cartId={cart?.cartId}
  configuration={config}
  cluster={cluster}
  childItems={[optionProductId1, optionProductId2]}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Bundle with custom price

Override the calculated price when you manage pricing externally (e.g. bundle discounts).

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={bundleProduct}
  cartId={cart?.cartId}
  configuration={config}
  price={49.95}
  notes="Bundle: Summer starter pack"
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Quantity rules (minimumQuantity and unit)

The component reads `product.minimumQuantity` and `product.unit` to enforce step increments and a minimum starting quantity. For example, a product sold in packs of 6 with a minimum of 12:

```tsx
// product.minimumQuantity = 12, product.unit = 6
// Quantity input starts at 12 and increments/decrements by 6

<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={bulkProduct}  // { minimumQuantity: 12, unit: 6, ... }
  cartId={cart?.cartId}
  configuration={config}
  allowIncrDecr={true}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Modal confirmation instead of toast

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

### Custom add-to-cart handler

Bypass the internal `CartService` call entirely by providing `onAddToCart`. You must return a `Cart` object.

```tsx
<AddToCart
  graphqlClient={graphqlClient}
  user={authState.user}
  product={product}
  configuration={config}
  onAddToCart={(product, clusterId, quantity, childItems, notes, price) => {
    return myCustomAddToCart(product.productId, quantity);
  }}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Localized labels (Dutch)

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

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need full control over the add-to-cart flow without using this component, here is a standalone implementation using `CartService` directly:

```tsx
import { CartService, GraphQLClient, Product, Cart } from 'propeller-sdk-v2';

async function addProductToCart(
  graphqlClient: GraphQLClient,
  cartId: string,
  product: Product,
  quantity: number,
  options?: {
    clusterId?: number;
    childItems?: { productId: number; quantity: number }[];
    notes?: string;
    price?: number;
    language?: string;
  }
): Promise<Cart> {
  const cartService = new CartService(graphqlClient);

  const cart = await cartService.addItemToCart({
    id: cartId,
    input: {
      productId: product.productId,
      quantity,
      ...(options?.clusterId !== undefined && { clusterId: options.clusterId }),
      ...(options?.childItems && { childItems: options.childItems }),
      ...(options?.notes && { notes: options.notes }),
      ...(options?.price !== undefined && { price: options.price }),
    },
    language: options?.language || 'NL',
    // Include image filters so the returned cart has product images
    imageSearchFilters: { type: ['default'] },
    imageVariantFilters: {
      transformations: [{ name: 'w', value: '200' }, { name: 'h', value: '200' }],
    },
  });

  return cart;
}

// Usage:
const updatedCart = await addProductToCart(graphqlClient, 'cart-abc-123', product, 2);
```

To also create a cart from scratch:

```tsx
import { CartService, CartStartInput, CartStartVariables } from 'propeller-sdk-v2';

async function createCart(
  graphqlClient: GraphQLClient,
  userId: { contactId?: number; companyId?: number; customerId?: number }
): Promise<Cart> {
  const cartService = new CartService(graphqlClient);

  const input: CartStartInput = {
    language: 'NL',
    ...(userId.contactId && { contactId: userId.contactId }),
    ...(userId.companyId && { companyId: userId.companyId }),
    ...(userId.customerId && { customerId: userId.customerId }),
  };

  const vars: CartStartVariables = {
    input,
    language: 'NL',
    imageSearchFilters: { type: ['default'] },
    imageVariantFilters: {
      transformations: [{ name: 'w', value: '200' }, { name: 'h', value: '200' }],
    },
  };

  return await cartService.startCart(vars);
}
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `graphqlClient` | `GraphQLClient` | Initialized Propeller SDK GraphQL client |
| `user` | `Contact \| Customer \| null` | Authenticated user, used for cart creation and lookup |
| `product` | `Product` | The product to add. `product.productId` is sent to the cart mutation; `product.names[0].value` appears in the toast message |
| `configuration` | `any` | Config object providing `imageSearchFiltersGrid`, `imageVariantFiltersSmall`, and `urls.getProductUrl()` for cart API calls and modal links |

### Cart

| Prop | Type | Default | Description |
|---|---|---|---|
| `cartId` | `string` | -- | ID of an existing cart to add the item to. Required when `onAddToCart` is not provided and `createCart` is `false` |
| `createCart` | `boolean` | `false` | When `true` and no `cartId` is available, the component looks up or creates a cart via `CartService`. Always pair with `onCartCreated` |
| `onCartCreated` | `(cart: Cart) => void` | -- | Called after a new cart is created internally. Use this to persist the cart in your app state. Without it, a new cart is created on every click |
| `language` | `string` | `'NL'` | Language code forwarded to all CartService operations |

### Product / Item

| Prop | Type | Default | Description |
|---|---|---|---|
| `cluster` | `Cluster` | -- | Cluster object for configurable products. `cluster.clusterId` is sent in the cart mutation |
| `childItems` | `number[]` | -- | Product IDs of the selected cluster child options. Converted to `CartChildItemInput[]` internally |
| `notes` | `string` | -- | Free-text notes attached to the cart item |
| `price` | `number` | -- | Custom unit price override. Omit to use the calculated price |

### Behavior

| Prop | Type | Default | Description |
|---|---|---|---|
| `allowIncrDecr` | `boolean` | `true` | Renders `-` and `+` buttons beside the quantity input. Set to `false` for a plain number input |
| `enableStockValidation` | `boolean` | `false` | Checks `product.inventory.totalQuantity` before adding. Shows an error toast if quantity exceeds available stock |
| `showModal` | `boolean` | `false` | After a successful add, shows a confirmation modal instead of the toast |
| `beforeAddToCart` | `() => boolean` | -- | Called before adding. Return `false` to abort (e.g. failed form validation) |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onAddToCart` | `(product, clusterId?, quantity?, childItems?, notes?, price?, showModal?) => Cart` | Fully replaces the internal `CartService.addItemToCart` call. The returned `Cart` is passed to `afterAddToCart` |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | Called after every successful add. Receives the updated cart and the matching `CartMainItem` (found by `productId`) |
| `onProceedToCheckout` | `() => void` | Called when the user clicks "Proceed to checkout" in the modal |

### Pricing

| Prop | Type | Default | Description |
|---|---|---|---|
| `includeTax` | `boolean` | `false` | When `true`, tax-inclusive prices (`totalSumNet`) are shown in the modal. When `false`, tax-exclusive prices (`totalSum`) are shown. Same pattern as `ProductCard.includeTax` |

### Appearance

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | -- | CSS class applied to the root `<div>` |
| `labels` | `Record<string, string>` | -- | Override any UI string. See Labels table below |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function addProductToCart(
  graphqlClient: GraphQLClient,
  cartId: string,
  product: Product,
  quantity: number,
  options?: {
    clusterId?: number;
    childItems?: { productId: number; quantity: number }[];
    notes?: string;
    price?: number;
    language?: string;
  }
): Promise<Cart>
```

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cartId` | `string` | *required* | `id` in `CartService.addItemToCart()` |
| `product.productId` | `number` | *required* | `input.productId` |
| `quantity` | `number` | *required* | `input.quantity` |
| `clusterId` | `number` | -- | `input.clusterId` |
| `childItems` | `{ productId: number; quantity: number }[]` | -- | `input.childItems` |
| `notes` | `string` | -- | `input.notes` |
| `price` | `number` | -- | `input.price` |
| `language` | `string` | `'NL'` | `language` param on all CartService operations |

### Cart resolution

When no cart ID is available:

1. Call `CartService.getCarts()` to find existing carts for the user (by `contactId`/`companyId` for B2B or `customerId` for B2C).
2. If found, adopt the most recent one.
3. If not found, call `CartService.startCart()` with a `CartStartInput` containing the user IDs and language.
4. After creating a new cart, assign default invoice and delivery addresses from the user's address book via `CartService.updateCartAddress`.

### Callbacks table

| Callback | Purpose |
|---|---|
| `onCartCreated` | Persist the new cart in your app state after automatic cart creation |
| `afterAddToCart` | Sync the updated cart to your app state after a successful add |
| `onProceedToCheckout` | Navigate to checkout from the confirmation modal |
| `beforeAddToCart` | Gate the add operation (return `false` to abort) |

### UI-only props (no SDK equivalent)

The following props control visual presentation only and have no SDK counterpart: `allowIncrDecr`, `showModal`, `className`, `labels`, `includeTax`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Shown when |
|---|---|---|
| `add` | `'Add'` | Button idle state |
| `adding` | `'Adding...'` | Button loading state |
| `addedToCart` | `'added to cart'` | Success toast (appended to product name) |
| `outOfStock` | `'Insufficient stock available'` | Error toast when stock validation blocks the add |
| `noCartId` | `'No cart ID provided'` | Error toast when no cart is available |
| `errorAdding` | `'Failed to add item to cart'` | Error toast on API exception |
| `modalTitle` | `'Added to cart'` | Modal title bar heading |
| `quantity` | `'Quantity'` | Label in the modal product row |
| `continueShopping` | `'Continue shopping'` | Left modal button |
| `proceedToCheckout` | `'Proceed to checkout'` | Right modal button |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  add: 'Add',
  adding: 'Adding...',
  addedToCart: 'added to cart',
  outOfStock: 'Insufficient stock available',
  noCartId: 'No cart ID provided',
  errorAdding: 'Failed to add item to cart',
  modalTitle: 'Added to cart',
  quantity: 'Quantity',
  continueShopping: 'Continue shopping',
  proceedToCheckout: 'Proceed to checkout',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Quantity rules

The component reads two properties from the `product` object to control quantity behavior:

- **`product.minimumQuantity`** -- The lowest allowed quantity. The quantity input initializes to this value on mount. If not set or zero, defaults to `1`.
- **`product.unit`** -- The step increment for the `+`/`-` buttons. For example, a `unit` of `6` means quantity moves in steps of 6. If not set or zero, defaults to `1`.

When the user types a value manually, the component snaps it to the nearest valid step: `Math.round((value - min) / step) * step + min`.

### Cart ID resolution

When `onAddToCart` is not provided, the component resolves the cart ID in this order:

1. Uses `props.cartId` if present.
2. Falls back to an internally cached `activeCartId` (set by a previous `initCart` call in the same session).
3. If neither exists and `createCart` is `true`:
   - Calls `CartService.getCarts()` to find existing carts for the user (by `contactId`/`companyId` for B2B or `customerId` for B2C).
   - If found, adopts the most recent one and fires `onCartCreated`.
   - If not found, calls `CartService.startCart()`, assigns default invoice and delivery addresses from the user's address book, then fires `onCartCreated`.
4. If still no cart ID, shows the `noCartId` error toast.

### New cart address assignment

When a new cart is created, the component automatically finds the user's default invoice and delivery addresses (where `isDefault === 'Y'`) and assigns them via `CartService.updateCartAddress`. For B2B (Contact) users, addresses come from `user.company.addresses`; for B2C (Customer) users, from `user.addresses`.

### Toast notifications

- Position: fixed, top-right corner (`top-4 right-4`).
- Auto-dismisses after 3 seconds; can be closed immediately with the dismiss button.
- Green for success, red for errors.
- Suppressed on success when `showModal` is `true` (the modal takes over). Error toasts still appear.

### Modal confirmation (`showModal: true`)

- A backdrop overlay covers the page; clicking it closes the modal.
- The modal panel displays: product image, product name (linked to the product page), SKU, quantity, price, and any cluster child items with their names and prices.
- Prices respect the VAT toggle (`price_include_tax` in localStorage): shows `totalSumNet` (incl. VAT) or `totalSum` (excl. VAT) for both the main item and child items.
- Two action buttons: "Continue shopping" (closes modal) and "Proceed to checkout" (closes modal and fires `onProceedToCheckout`).

### Stock validation (`enableStockValidation: true`)

- Reads `product.inventory.totalQuantity` before adding.
- Blocks the add and shows the `outOfStock` toast if the requested quantity exceeds available stock.
- No additional API call is made; it relies on the `inventory` field already present on the `Product` object.

## GraphQL Mutation

Under the hood, `CartService.addItemToCart` executes a mutation like the following:

```graphql
mutation CartAddItem(
  $id: String!
  $input: CartItemInput!
  $language: String
  $imageSearchFilters: MediaImageProductSearchInput
  $imageVariantFilters: TransformationsInput
) {
  cartAddItem(id: $id, input: $input) {
    cartId
    items {
      productId
      quantity
      totalSum
      totalSumNet
      product {
        productId
        sku
        names(language: $language) { value }
        media {
          images(search: $imageSearchFilters) {
            items {
              imageVariants(input: $imageVariantFilters) { url }
            }
          }
        }
      }
      childItems {
        productId
        quantity
        totalSum
        product {
          names(language: $language) { value }
        }
      }
    }
    total { subTotal totalNet totalGross }
  }
}
```

Variables for a simple product:

```json
{
  "id": "cart-abc-123",
  "input": {
    "productId": 42,
    "quantity": 2
  },
  "language": "NL"
}
```

Variables for a cluster product with child options:

```json
{
  "id": "cart-abc-123",
  "input": {
    "productId": 42,
    "quantity": 1,
    "clusterId": 100,
    "childItems": [
      { "productId": 201, "quantity": 1 },
      { "productId": 202, "quantity": 1 }
    ]
  },
  "language": "NL"
}
```

## SDK Services

The component uses the following services from `propeller-sdk-v2`:

| Service | Methods used | Purpose |
|---|---|---|
| `CartService` | `addItemToCart` | Adds the product (with optional cluster, child items, notes, price) to the cart |
| `CartService` | `getCarts` | Finds existing carts for the user when `createCart` is enabled |
| `CartService` | `startCart` | Creates a new cart when no existing cart is found |
| `CartService` | `getCart` | Fetches full cart data after finding an existing cart |
| `CartService` | `updateCartAddress` | Assigns default invoice and delivery addresses from the user's address book to a newly created cart |

All SDK types used: `GraphQLClient`, `Product`, `Cart`, `Cluster`, `Contact`, `Customer`, `CartService`, `CartChildItemInput`, `CartSearchInput`, `CartStartInput`, `CartStartVariables`, `CartMainItem`, `CartBaseItem`, `Address`, `Enums`.
