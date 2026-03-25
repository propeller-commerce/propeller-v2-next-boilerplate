# ProductBundles

Displays product bundles (combo deals) for a given product. Each bundle shows its constituent items with images and prices, a total bundle price with discount badge, and an "Add to cart" button. After a successful add-to-cart, the component can show either an inline toast notification or a confirmation modal with "Continue shopping" and "Proceed to checkout" options.

## Usage

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

## Props

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
| `includeTax` | `boolean` | No | `true` (from localStorage PriceToggle) | When true, shows net prices (incl. VAT). When false, shows gross prices (excl. VAT). Overrides the PriceToggle localStorage value when explicitly set |
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

### Labels

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `labels` | `Record<string, string>` | No | `{}` | Override any UI string by key |

Available label keys:

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

**Self-contained mode** (`onAddBundleToCart` omitted): The component uses `CartService.addBundleToCart()` internally. It resolves a cart ID from `props.cartId` or its own `activeCartId`. If neither exists and `createCart={true}`, it creates a new cart via `CartService.startCart()`, searches for existing user carts first, and assigns default invoice/delivery addresses from the user profile.

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

## Building Your Own

Standalone implementation that fetches and displays product bundles without the component:

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  GraphQLClient,
  BundleService,
  CartService,
  Bundle,
  BundleItem,
  BundleQueryVariables,
  CartAddBundleVariables,
  Enums,
} from 'propeller-sdk-v2';

interface CustomBundlesProps {
  graphqlClient: GraphQLClient;
  productId: number;
  cartId: string;
  language?: string;
  taxZone?: string;
  includeTax?: boolean;
}

export function CustomProductBundles({
  graphqlClient,
  productId,
  cartId,
  language = 'NL',
  taxZone = 'NL',
  includeTax = true,
}: CustomBundlesProps) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBundles = async () => {
      setLoading(true);
      try {
        const bundleService = new BundleService(graphqlClient);
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
        setBundles(result?.items || []);
      } catch {
        setBundles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBundles();
  }, [productId, graphqlClient, language, taxZone]);

  const getPrice = (bundle: Bundle) =>
    includeTax ? bundle.price?.net || 0 : bundle.price?.gross || 0;

  const getOriginalPrice = (bundle: Bundle) =>
    includeTax ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;

  const getItemPrice = (item: BundleItem) =>
    includeTax ? item.price?.net || 0 : item.price?.gross || 0;

  const formatPrice = (value: number) => `\u20AC${value.toFixed(2)}`;

  const handleAddToCart = async (bundle: Bundle) => {
    if (addingId) return;
    setAddingId(bundle.id);
    try {
      const cartService = new CartService(graphqlClient);
      const variables: CartAddBundleVariables = {
        id: cartId,
        input: { bundleId: bundle.id, quantity: 1 },
        language,
      };
      await cartService.addBundleToCart(variables);
      // Handle success (update cart context, show notification, etc.)
    } catch (error) {
      console.error('Failed to add bundle to cart:', error);
    } finally {
      setAddingId(null);
    }
  };

  if (loading || bundles.length === 0) return null;

  return (
    <div className="space-y-6">
      {bundles.map((bundle) => {
        const price = getPrice(bundle);
        const original = getOriginalPrice(bundle);
        const hasDiscount = original > 0 && price < original;

        return (
          <div key={bundle.id} className="border rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-xl font-bold mb-2">{bundle.name || 'Combo deal'}</h3>

            {bundle.description && (
              <p className="text-sm text-gray-600 mb-3">{bundle.description}</p>
            )}

            {bundle.condition && (
              <p className="text-xs text-gray-500 mb-3">
                {bundle.condition === Enums.BundleCondition.ALL
                  ? 'Discount on all items'
                  : 'Discount on extra items'}
              </p>
            )}

            {/* Bundle items */}
            <div className="flex flex-wrap gap-4 mb-4">
              {bundle.items?.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="text-center w-32">
                  <p className="text-sm font-medium">
                    {item.product?.names?.[0]?.value || `Product ${item.productId}`}
                  </p>
                  <p className="text-sm text-gray-600">{formatPrice(getItemPrice(item))}</p>
                </div>
              ))}
            </div>

            {/* Price and button */}
            <div className="flex items-center gap-4">
              {hasDiscount && (
                <span className="line-through text-gray-400">{formatPrice(original)}</span>
              )}
              <span className="text-2xl font-bold">{formatPrice(price)}</span>
              {hasDiscount && (
                <span className="bg-green-100 text-green-700 text-sm px-2 py-1 rounded">
                  Save {formatPrice(original - price)}
                </span>
              )}
              <button
                onClick={() => handleAddToCart(bundle)}
                disabled={addingId === bundle.id}
                className="ml-auto px-6 py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {addingId === bundle.id ? 'Adding...' : 'Add to cart'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

## SDK Notes

- **Bundle ID is a string**, not a number. This matches `CartAddBundleInput.bundleId`.
- **BundlePrice fields**: `net` = incl. VAT, `gross` = excl. VAT, `originalNet` / `originalGross` = prices before discount.
- **Cart integration**: `CartService.addBundleToCart()` works correctly with the standard SDK method.
