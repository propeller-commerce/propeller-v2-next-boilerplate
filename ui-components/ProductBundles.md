import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductBundles

Displays product bundles (combo deals) for a given product. Each bundle shows its constituent items with images and prices, a total bundle price with discount badge, and an "Add to cart" button. After a successful add-to-cart, the component can show either an inline toast notification or a confirmation modal with "Continue shopping" and "Proceed to checkout" options.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage with external cart handling

```tsx
import ProductBundles from '@/components/propeller/ProductBundles';

<ProductBundles
  graphqlClient={graphqlClient}
  productId={12345}
  language="NL"
  taxZone="NL"
  onAddBundleToCart={(bundleId, quantity) => {
    cartService.addBundleToCart({
      id: cartId,
      input: { bundleId, quantity },
      language: 'NL',
      imageSearchFilters: config.imageSearchFiltersGrid,
      imageVariantFilters: config.imageVariantFiltersSmall,
    }).then(updatedCart => saveCart(updatedCart));
  }}
/>
```

### Self-contained with cart creation and confirmation modal

```tsx
<ProductBundles
  graphqlClient={graphqlClient}
  productId={12345}
  language="NL"
  taxZone="NL"
  cartId={cart?.cartId}
  createCart={true}
  user={authState.user}
  configuration={config}
  showModal={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterBundleAddToCart={(updatedCart) => saveCart(updatedCart)}
  onProceedToCheckout={() => router.push('/checkout')}
/>
```

### Semi-closed portal (prices hidden for anonymous users)

```tsx
<ProductBundles
  graphqlClient={graphqlClient}
  productId={12345}
  language="NL"
  taxZone="NL"
  portalMode="semi-closed"
  user={authState.user}
  cartId={cart?.cartId}
  afterBundleAddToCart={(updatedCart) => saveCart(updatedCart)}
  labels={{
    loginToSeePrices: 'Please log in to view prices and order',
  }}
/>
```

### Compact layout with custom labels

```tsx
<ProductBundles
  graphqlClient={graphqlClient}
  productId={12345}
  language="EN"
  taxZone="NL"
  layout="compact"
  includeTax={false}
  cartId={cart?.cartId}
  afterBundleAddToCart={(updatedCart) => saveCart(updatedCart)}
  labels={{
    title: 'Bundle offer',
    addToCart: 'Add bundle to cart',
    youSave: 'You save',
    condition_ALL: 'Discount on all items',
    condition_EP: 'Discount on extra products',
    adding: 'Adding...',
    addedToCart: 'added to cart',
  }}
/>
```

### With before/after lifecycle callbacks

```tsx
<ProductBundles
  graphqlClient={graphqlClient}
  productId={12345}
  language="NL"
  taxZone="NL"
  cartId={cart?.cartId}
  beforeBundleAddToCart={(bundleId, quantity) => {
    // Return false to cancel the add-to-cart
    if (!acceptedTerms) return false;
    trackAnalytics('bundle_add', { bundleId });
    return true;
  }}
  afterBundleAddToCart={(updatedCart, bundle) => {
    saveCart(updatedCart);
    toast.success(`${bundle?.name} added!`);
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom product bundles UI without using the component, set up the SDK services and use the following operations.

### Service setup

```ts
import {
  BundleService,
  CartService,
  Bundle,
  BundleItem,
  BundleQueryVariables,
  CartAddBundleVariables,
  Enums,
} from 'propeller-sdk-v2';

const bundleService = new BundleService(graphqlClient);
const cartService = new CartService(graphqlClient);
```

### Fetch bundles

```ts
// pseudo-code: call on initialization and when productId changes
async function fetchBundles(productId: number, language = 'NL', taxZone = 'NL'): Promise<Bundle[]> {
  const variables: BundleQueryVariables = {
    input: {
      productIds: [productId],
      taxZone,
      page: 1,
      offset: 20,
    },
    language,
  };
  const result = await bundleService.getBundles(variables);
  return result?.items || [];
}
```

### Price helper functions

```ts
// Prices follow the Propeller SDK convention: net = incl. VAT, gross = excl. VAT
function getPrice(bundle: Bundle, includeTax: boolean): number {
  return includeTax ? bundle.price?.net || 0 : bundle.price?.gross || 0;
}

function getOriginalPrice(bundle: Bundle, includeTax: boolean): number {
  return includeTax ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;
}

function getItemPrice(item: BundleItem, includeTax: boolean): number {
  return includeTax ? item.price?.net || 0 : item.price?.gross || 0;
}

function formatPrice(value: number): string {
  return `\u20AC${value.toFixed(2)}`;
}
```

### Add bundle to cart

```ts
async function addBundleToCart(cartId: string, bundle: Bundle, language = 'NL') {
  // pseudo-code: guard against double-submission with a loading flag
  const variables: CartAddBundleVariables = {
    id: cartId,
    input: { bundleId: bundle.id, quantity: 1 },
    language,
  };
  const updatedCart = await cartService.addBundleToCart(variables);
  // pseudo-code: update cart state, show success notification
  return updatedCart;
}
```

### UI structure

For each bundle, render a card showing: the bundle name (fall back to "Combo deal"), an optional description, the bundle condition text (`ALL` = "Discount on all items", `EP` = "Discount on extra items"), the individual bundle items with product names and prices, the total bundle price with a strikethrough original price when a discount applies, a savings badge showing the difference, and an "Add to cart" button with a loading/disabled state to prevent double-submission. If no bundles exist for the product, render nothing.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | Yes | -- | Propeller SDK GraphQL client instance |
| `productId` | `number` | Yes | -- | Product ID whose bundles are fetched |
| `language` | `string` | Yes | -- | Language code (e.g. `'NL'`, `'EN'`) |
| `taxZone` | `string` | Yes | -- | Tax zone for pricing (e.g. `'NL'`) |
| `configuration` | `any` | No | -- | App config object; must include `imageSearchFiltersGrid`, `imageVariantFiltersSmall`, and `imageVariantFiltersMedium` when using self-contained cart mode |

### Cart integration

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `cartId` | `string` | No | -- | Existing cart ID. Required when `onAddBundleToCart` is not provided and `createCart` is false |
| `createCart` | `boolean` | No | `false` | When true, a new cart is created automatically if no `cartId` is available |
| `onCartCreated` | `(cart: Cart) => void` | No | -- | Called when the component creates a new cart internally. Use this to persist the cart to your app state |
| `onAddBundleToCart` | `(bundleId: string, qty: number) => void` | No | -- | External handler that fully replaces the built-in add-to-cart logic. When provided, the component delegates all cart operations to this callback |
| `beforeBundleAddToCart` | `(bundleId: string, qty: number) => boolean` | No | -- | Called before the internal add-to-cart. Return `false` to cancel |
| `afterBundleAddToCart` | `(cart: Cart, bundle?: Bundle) => void` | No | -- | Called after a successful internal add-to-cart with the updated cart |

### Pricing and visibility

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `includeTax` | `boolean` | No | `false` (excl. VAT) | When true, shows net prices (incl. VAT). When false, shows gross prices (excl. VAT). Overrides the PriceToggle localStorage value when explicitly set |
| `portalMode` | `string` | No | `'open'` | Set to `'semi-closed'` to hide all prices and the add-to-cart button for anonymous (logged-out) users |
| `user` | `Contact \| Customer \| null` | No | `null` | Authenticated user object. Used for semi-closed visibility checks and for setting contact/customer on new carts |
| `stockValidation` | `boolean` | No | `false` | When true, validates stock availability before adding to cart |

### Display

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `layout` | `'vertical' \| 'horizontal' \| 'compact'` | No | `'horizontal'` | `horizontal` -- items side-by-side with `+` separators; `vertical` -- items stacked; `compact` -- condensed view, hides individual items |
| `showIndividualItems` | `boolean` | No | `true` | Show the individual products inside each bundle card |
| `className` | `string` | No | `'mb-12'` | CSS class applied to the root wrapper element |

### Modal and feedback

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `showModal` | `boolean` | No | `false` | When true, shows a confirmation modal after add-to-cart instead of the inline toast |
| `onProceedToCheckout` | `() => void` | No | -- | Called when the user clicks "Proceed to checkout" in the modal |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function fetchAndRenderBundles(
  graphqlClient: GraphQLClient,
  productId: number,
  options?: BundleOptions
): Promise<void>
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `language` | `string` | `'NL'` | `language` prop |
| `taxZone` | `string` | `'NL'` | `taxZone` prop |
| `includeTax` | `boolean` | `false` | `includeTax` prop |
| `layout` | `string` | `'horizontal'` | `layout` prop |
| `showIndividualItems` | `boolean` | `true` | `showIndividualItems` prop |
| `portalMode` | `string` | `'open'` | `portalMode` prop |
| `stockValidation` | `boolean` | `false` | `stockValidation` prop |

### Cart resolution

When using self-contained cart mode, the component resolves a cart ID through this flow:

1. Uses `props.cartId` if provided
2. Otherwise searches for existing carts via `CartService.getCarts(searchInput)`
3. If no cart found and `createCart` is true, creates one via `CartService.startCart()`
4. After creation, calls `CartService.updateCartAddress()` for default addresses
5. Fires `onCartCreated` so the parent can persist the cart

### Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onCartCreated` | `(cart: Cart) => void` | New cart was created internally |
| `onAddBundleToCart` | `(bundleId: string, qty: number) => void` | External handler replacing built-in cart logic |
| `beforeBundleAddToCart` | `(bundleId: string, qty: number) => boolean` | Return `false` to cancel |
| `afterBundleAddToCart` | `(cart: Cart, bundle?: Bundle) => void` | Called after successful add |
| `onProceedToCheckout` | `() => void` | User clicked checkout in modal |

### UI-only props

The following props are purely visual and have no SDK equivalent: `labels`, `className`, `showModal`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Where it appears |
|-----|---------|------------------|
| `title` | `'Combo deal'` | Fallback bundle name |
| `addToCart` | `'In cart'` | Add-to-cart button |
| `adding` | `'Adding...'` | Button text while request is in flight |
| `addedToCart` | `'added to cart'` | Toast message suffix |
| `youSave` | `'Your savings:'` | Discount badge prefix |
| `leaderItem` | `'Main product'` | Badge for the leader item |
| `condition_ALL` | `'Discount on all items'` | Shown when bundle condition is `ALL` |
| `condition_EP` | `'Discount on extra items'` | Shown when bundle condition is `EP` |
| `inclTax` | `'incl. VAT'` | Price suffix |
| `exclTax` | `'excl. VAT'` | Price suffix |
| `loginToSeePrices` | `'Log in to see prices and add to cart'` | Semi-closed mode message |
| `modalTitle` | `'Added to cart'` | Modal header text |
| `continueShopping` | `'Continue shopping'` | Modal button |
| `proceedToCheckout` | `'Proceed to checkout'` | Modal button |
| `noCartId` | `'No cart ID provided'` | Error toast when no cart is available |
| `quantity` | `'Quantity'` | Modal item detail |
| `errorAdding` | `'Failed to add bundle to cart'` | Error toast on failure |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  title: 'Combo deal',
  addToCart: 'In cart',
  adding: 'Adding...',
  addedToCart: 'added to cart',
  youSave: 'Your savings:',
  leaderItem: 'Main product',
  condition_ALL: 'Discount on all items',
  condition_EP: 'Discount on extra items',
  inclTax: 'incl. VAT',
  exclTax: 'excl. VAT',
  loginToSeePrices: 'Log in to see prices and add to cart',
  modalTitle: 'Added to cart',
  continueShopping: 'Continue shopping',
  proceedToCheckout: 'Proceed to checkout',
  noCartId: 'No cart ID provided',
  quantity: 'Quantity',
  errorAdding: 'Failed to add bundle to cart',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Fetching and rendering

- The component fetches bundles on mount via `BundleService.getBundles()` using the provided `productId`.
- If no bundles exist for the product, the component renders nothing (returns null).
- When `productId` changes, bundles are re-fetched automatically.
- Multiple bundles are rendered as separate cards, each with its own add-to-cart button.

### Bundle items display

- Each bundle card shows its constituent items as product thumbnails with names and individual prices, connected by green `+` separator icons.
- Setting `showIndividualItems={false}` or `layout="compact"` hides the individual items section.
- Items include product images from `product.media.images.items[0].imageVariants[0].url`.

### Pricing and discounts

- Prices follow the Propeller SDK convention: `price.net` = incl. VAT, `price.gross` = excl. VAT.
- Original prices (`originalNet` / `originalGross`) are shown with strikethrough when the bundle has a discount.
- A green discount badge shows the total savings amount (e.g., "Your savings: EUR 15.00").
- The `includeTax` prop overrides the PriceToggle localStorage value. If not passed, the component reads from `localStorage` and listens for the `priceToggleChanged` custom event.

### Bundle conditions

- `ALL` -- discount applies to every item in the bundle.
- `EP` (Extra Products) -- discount applies only to the non-leader items.
- The condition type is displayed as explanatory text below the bundle description.

### Cart integration modes

**External mode** (`onAddBundleToCart` provided): The component calls your callback with `(bundleId, quantity)` and you handle all cart logic yourself.

**Self-contained mode** (`onAddBundleToCart` omitted): The component uses `CartService.addBundleToCart()` internally. It resolves a cart ID from `props.cartId` or its own `activeCartId`. If neither exists and `createCart={true}`, it initializes a cart via this flow:

1. Calls `CartService.getCarts(searchInput)` to search for existing carts for the authenticated user
2. If an existing cart is found, uses that cart ID
3. If no cart exists, calls `CartService.startCart()` to create a new one
4. After creation, calls `CartService.updateCartAddress()` to assign default invoice and delivery addresses from the user profile
5. Fires `onCartCreated` with the new cart so the parent can persist it to CartContext

### Add-to-cart feedback

- **Toast (default)**: A 3-second auto-dismissing notification appears in the top-right corner -- green for success, red for errors.
- **Modal** (`showModal={true}`): A centered overlay shows the added bundle with its image, name, sub-items, and price. Two buttons: "Continue shopping" (closes modal) and "Proceed to checkout" (closes modal + calls `onProceedToCheckout`).

### Semi-closed portal

When `portalMode="semi-closed"` and no `user` is provided, all prices and the add-to-cart button are hidden. A login prompt message is shown instead.

### Hydration

The component uses an internal `isMounted` flag to prevent server/client hydration mismatches. Content only renders after the component has mounted on the client.

## SDK Services

### BundleService

Used to fetch product bundles.

```ts
import { BundleService, BundleQueryVariables } from 'propeller-sdk-v2';

const bundleService = new BundleService(graphqlClient);

const variables: BundleQueryVariables = {
  input: {
    productIds: [12345],
    taxZone: 'NL',
    page: 1,
    offset: 20,
  },
  language: 'NL',
  imageSearchFilters: { page: 1, offset: 12 },
  imageVariantFilters: {
    transformations: [{
      name: 'medium',
      transformation: { format: 'WEBP', height: 300, width: 300, fit: 'BOUNDS' },
    }],
  },
};

const result = await bundleService.getBundles(variables);
// result.items: Bundle[]
```

### CartService

Used to add a bundle to the cart and (optionally) to create new carts.

```ts
import { CartService, CartAddBundleVariables } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);

const variables: CartAddBundleVariables = {
  id: 'cart-id-string',
  input: {
    bundleId: 'bundle-id-string',
    quantity: 1,
  },
  language: 'NL',
  imageSearchFilters: { page: 1, offset: 12 },
  imageVariantFilters: {
    transformations: [{
      name: 'cart',
      transformation: { format: 'WEBP', height: 100, width: 100, fit: 'BOUNDS' },
    }],
  },
};

const updatedCart = await cartService.addBundleToCart(variables);
```

### SDK Notes

- **Bundle ID is a string**, not a number. This matches `CartAddBundleInput.bundleId`.
- **BundlePrice fields**: `net` = incl. VAT, `gross` = excl. VAT, `originalNet` / `originalGross` = prices before discount.
- **Cart integration**: `CartService.addBundleToCart()` works correctly with the standard SDK method.

## GraphQL Queries and Mutations

### Fetch bundles for a product

```graphql
query Bundles($input: BundleSearchInput!, $language: String, $imageSearchFilters: ImageSearchInput, $imageVariantFilters: ImageVariantFilterInput) {
  bundles(input: $input) {
    items {
      id
      name
      description
      condition
      price {
        net
        gross
        originalNet
        originalGross
      }
      items {
        productId
        isLeader
        price {
          net
          gross
        }
        product {
          productId
          names(language: $language) {
            value
          }
          media {
            images(input: $imageSearchFilters) {
              items {
                imageVariants(input: $imageVariantFilters) {
                  url
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "productIds": [12345],
    "taxZone": "NL",
    "page": 1,
    "offset": 20
  },
  "language": "NL"
}
```

### Add bundle to cart

```graphql
mutation CartAddBundle($id: String!, $input: CartAddBundleInput!, $language: String, $imageSearchFilters: ImageSearchInput, $imageVariantFilters: ImageVariantFilterInput) {
  cartAddBundle(id: $id, input: $input) {
    cartId
    total {
      subTotal
      totalNet
      totalGross
    }
    items {
      productId
      quantity
      product {
        names(language: $language) {
          value
        }
        media {
          images(input: $imageSearchFilters) {
            items {
              imageVariants(input: $imageVariantFilters) {
                url
              }
            }
          }
        }
      }
    }
  }
}
```

**Variables:**
```json
{
  "id": "cart-id",
  "input": {
    "bundleId": "bundle-id",
    "quantity": 1
  },
  "language": "NL"
}
```
