import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductCard

A complete product card component that renders an image with optional badge overlays, product details (name, SKU, manufacturer, short description, price), a favourite toggle, and an embedded **AddToCart** control. Supports both grid and row layouts.

---

## Visual Layout

```
┌─────────────────────────────────┐
│  [badge]          [♡ fav btn]   │  <- image area (aspect-square)
│                                 │
│          [ product image ]      │
│                                 │
├─────────────────────────────────┤
│  SKU-1234                       │  <- SKU (mono)
│  Product name that may wrap     │  <- name (link)
│  Extra attribute value          │  <- textLabels
│  Manufacturer name              │  <- showManufacturer
│  Short description text...      │  <- showShortDescription
│                     € 29.99     │  <- price
├─────────────────────────────────┤
│  [−] [ 1 ] [+]   [  Add  ]     │  <- embedded AddToCart
└─────────────────────────────────┘
```

When `columns={1}`, the card switches to a compact horizontal **row layout** with the image on the left, details in the middle, and price + AddToCart on the right.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Minimal

```tsx
import ProductCard from '@/components/propeller/ProductCard';
import { graphqlClient } from '@/lib/api';
import config from '@/data/config';

<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  cartId={cart?.cartId}
  configuration={config}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
/>
```

### With SPA Routing and Post-Add Modal

```tsx
<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  cartId={cart?.cartId}
  configuration={config}
  showModal={true}
  onProductClick={(p) => router.push(`/product/${p.productId}`)}
  onProceedToCheckout={() => router.push('/checkout')}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### With Attribute Badge and Text Labels

```tsx
<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  configuration={config}
  imageLabels={['new', 'sale']}
  textLabels={['brand', 'color']}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

Each string in `imageLabels` / `textLabels` is matched against `product.attributes.items[].attributeDescription.name`. Attributes with no matching value are silently omitted.

### With Favourite Toggle

```tsx
<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  configuration={config}
  enableAddFavorite={true}
  onToggleFavorite={(product, isFavorite) => {
    isFavorite
      ? wishlistService.add(product.productId)
      : wishlistService.remove(product.productId);
  }}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### All Display Options with Stock

```tsx
<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  configuration={config}
  showName={true}
  showImage={true}
  showSku={true}
  showManufacturer={true}
  showShortDescription={true}
  showStock={true}
  showAvailability={true}
  stockLabels={{
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    available: 'Available',
    notAvailable: 'Not available',
  }}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Row Layout (Single Column)

```tsx
<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  configuration={config}
  columns={1}
  showStock={true}
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Fully Localised (Dutch)

```tsx
<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  configuration={config}
  language="NL"
  labels={{
    addToFavorites: 'Toevoegen aan favorieten',
    removeFromFavorites: 'Verwijderen uit favorieten',
  }}
  addToCartLabels={{
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

If you need a custom product card without using this component, here are the data extraction helpers and patterns you need:

### Extracting product data

```ts
import { Product, AttributeResult } from 'propeller-sdk-v2';

// Resolve localised name
function getProductName(product: Product, language: string = 'NL'): string {
  return product.names?.find(n => n.language === language)?.value
    || product.names?.[0]?.value
    || 'Product';
}

// Resolve image URL (first variant of first image)
function getProductImageUrl(product: Product): string {
  return product.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}

// Resolve price: net = incl. VAT, gross = excl. VAT
function getProductPrice(product: Product, includeTax: boolean): string {
  const priceValue = includeTax ? product.price?.net : product.price?.gross;
  return priceValue != null ? `€${Number(priceValue).toFixed(2)}` : '';
}

// Resolve slug for URL
function getProductSlug(product: Product, language: string = 'NL'): string {
  return product.slugs?.find(s => s.language === language)?.value
    || product.slugs?.[0]?.value
    || '';
}

// Build product URL
function getProductUrl(product: Product, language: string = 'NL'): string {
  const slug = getProductSlug(product, language);
  return `/product/${product.productId}/${slug}`;
}
```

### Subscribing to the Price Toggle

To make your custom card react to the global VAT toggle, follow this pattern:

1. On initialization, read `localStorage.getItem('price_include_tax')` to determine the current setting (defaults to `false` / excl. VAT if not set).
2. Add a listener for the `priceToggleChanged` custom event on `window`. The event's `detail` property is a boolean indicating whether tax is included.
3. When the event fires, update your displayed price using the new `includeTax` value.
4. Clean up the event listener when the component is destroyed.

### Resolving Attribute Labels

```ts
import { Product, AttributeResult } from 'propeller-sdk-v2';

function getAttributeValue(product: Product, attributeName: string): string {
  const attrs = product.attributes?.items || [];
  const found = attrs.find(
    (a: AttributeResult) => a.attributeDescription?.name === attributeName
  );
  return found?.value?.value || '';
}

// Usage:
const brand = getAttributeValue(product, 'brand');    // "Nike"
const isNew = getAttributeValue(product, 'new');       // "New" or ""
```

Your UI should render:
- A product image (or an SVG placeholder when no image is available) linked to the product URL.
- The product SKU, localised name (as a link), and formatted price.
- Optionally: manufacturer, short description, attribute badges, and a favourite toggle button.
- An AddToCart control in the card footer.

  </TabItem>
</Tabs>

---

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Required | Description |
|---|---|---|---|
| `product` | `Product` | Yes | The Propeller product object to display |
| `graphqlClient` | `GraphQLClient` | Yes | Initialised Propeller SDK GraphQL client (forwarded to AddToCart) |
| `user` | `Contact \| Customer \| null` | Yes | Authenticated user (forwarded to AddToCart) |
| `configuration` | `any` | Yes | App configuration object from `@/data/config` — provides `urls.getProductUrl()` for link generation and image filter settings |

### Display Toggles

| Prop | Type | Default | Description |
|---|---|---|---|
| `showName` | `boolean` | `true` | Renders the product name as a clickable link |
| `showImage` | `boolean` | `true` | Renders the product image in an aspect-ratio container |
| `showSku` | `boolean` | `true` | Renders the SKU in monospace style |
| `showShortDescription` | `boolean` | `false` | Renders the first localised short description (2-line clamp) |
| `showManufacturer` | `boolean` | `false` | Renders `product.manufacturer` |
| `showStock` | `boolean` | `false` | Renders the embedded ItemStock availability widget |
| `showAvailability` | `boolean` | `true` | When `showStock` is true, shows the availability indicator text. Only relevant in grid layout |

### Attribute Labels

| Prop | Type | Description |
|---|---|---|
| `imageLabels` | `string[]` | Attribute names whose values render as badge overlays on the product image. Example: `['new', 'sale']` |
| `textLabels` | `string[]` | Attribute names whose values render as extra text rows below the product name. Example: `['brand', 'color']` |

Lookup: each entry is matched against `product.attributes.items[n].attributeDescription.name`. The resolved `value.value` string is rendered. Entries with no match are dropped.

### Pricing and Layout

| Prop | Type | Default | Description |
|---|---|---|---|
| `includeTax` | `boolean` | — | Overrides the price toggle. When `true`, shows tax-inclusive price (`price.net`). When `false`, shows tax-exclusive price (`price.gross`). When omitted, the component follows the global price toggle (see Behavior section) |
| `columns` | `number` | — | When set to `1`, the card renders as a compact horizontal row instead of a vertical card |
| `className` | `string` | — | Extra CSS class applied to the root `<div>` |
| `language` | `string` | `'NL'` | Language code used for resolving localised product names, descriptions, slugs, and forwarded to CartService |

### Favourites

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableAddFavorite` | `boolean` | `false` | Renders a heart-icon toggle button in the top-right corner of the image |
| `onToggleFavorite` | `(product: Product, isFavorite: boolean) => void` | — | Called on every favourite state change. `isFavorite = true` means just added |

### Navigation

| Prop | Type | Description |
|---|---|---|
| `onProductClick` | `(product: Product) => void` | Called when the product name or image is clicked. When provided, the default `<a>` navigation is suppressed so the consumer can use framework routing (e.g. `router.push`) |

### Label Overrides

| Prop | Type | Description |
|---|---|---|
| `labels` | `Record<string, string>` | Override card-level UI strings. Keys: `addToFavorites`, `removeFromFavorites` |
| `stockLabels` | `Record<string, string>` | Override ItemStock UI strings. Keys: `inStock`, `outOfStock`, `lowStock`, `available`, `notAvailable`, `pieces` |

### AddToCart Pass-Through Props

All of these are forwarded to the embedded AddToCart component. See [AddToCart.md](./AddToCart.md) for full details.

| Prop | Type | Default | Description |
|---|---|---|---|
| `cartId` | `string` | — | ID of an existing cart |
| `clusterId` | `number` | — | Cluster ID for configurable products |
| `childItems` | `number[]` | — | Product IDs of selected cluster child options |
| `notes` | `string` | — | Free-text notes for the cart item |
| `price` | `number` | — | Custom unit price override |
| `createCart` | `boolean` | `false` | Auto-create a cart when none is available |
| `onCartCreated` | `(cart: Cart) => void` | — | Called after a new cart is created |
| `onAddToCart` | `(product, clusterId?, quantity?, childItems?, notes?, price?, showModal?) => Cart` | — | Custom add-to-cart handler that replaces the internal CartService call |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | — | Called after every successful add |
| `showModal` | `boolean` | `false` | Show a modal after add instead of a toast notification |
| `allowIncrDecr` | `boolean` | `true` | Render increment/decrement buttons around the quantity input |
| `enableStockValidation` | `boolean` | `false` | Block add if quantity exceeds available stock |
| `onProceedToCheckout` | `() => void` | — | Called when the modal's checkout button is clicked |
| `addToCartLabels` | `Record<string, string>` | — | Override AddToCart UI strings (mapped to AddToCart's `labels` prop). Keys: `outOfStock`, `noCartId`, `errorAdding`, `addedToCart`, `modalTitle`, `quantity`, `continueShopping`, `proceedToCheckout`, `add`, `adding` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderProductCard(options: {
  product: Product;
  graphqlClient: GraphQLClient;
  user: Contact | Customer | null;
  language?: string;
  cartId?: string;
  includeTax?: boolean;
}): void
```

Types: `Product`, `GraphQLClient`, `Contact`, `Customer`, `Cart`, `CartMainItem`, `CartChildItemInput`, `AttributeResult` from `propeller-sdk-v2`.

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `product` | `Product` | required | `product` prop |
| `graphqlClient` | `GraphQLClient` | required | `graphqlClient` prop |
| `user` | `Contact \| Customer \| null` | required | `user` prop |
| `language` | `string` | `'NL'` | `language` prop |
| `cartId` | `string` | — | `cartId` prop |
| `includeTax` | `boolean` | — | `includeTax` prop |
| `clusterId` | `number` | — | `clusterId` prop |
| `childItems` | `number[]` | — | `childItems` prop |
| `notes` | `string` | — | `notes` prop |
| `price` | `number` | — | `price` prop |

### Cart resolution

The embedded AddToCart uses `graphqlClient` to add items to the cart via CartService. When `cartId` is provided, items are added to that cart. When `createCart` is `true` and no `cartId` exists, a new cart is created first. See [AddToCart.md](./AddToCart.md) for the full SDK call sequence.

### Callbacks table

| Callback | When it fires | What to implement |
|---|---|---|
| `onProductClick` | Product name or image is clicked | Navigate to product detail page using your framework's router |
| `onToggleFavorite` | Favourite heart button is toggled | Add/remove product from wishlist |
| `onCartCreated` | A new cart is auto-created | Persist the new cart to your app state |
| `afterAddToCart` | Product successfully added to cart | Update cart state in your app |
| `onAddToCart` | Replaces internal add-to-cart logic | Perform custom add-to-cart using CartService |
| `onProceedToCheckout` | Modal checkout button is clicked | Navigate to checkout page |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `showName` — show/hide product name
- `showImage` — show/hide product image
- `showSku` — show/hide SKU
- `showShortDescription` — show/hide short description
- `showManufacturer` — show/hide manufacturer
- `showStock` — show/hide stock widget
- `showAvailability` — show/hide availability text
- `imageLabels` — attribute names for image badges
- `textLabels` — attribute names for text rows
- `columns` — grid vs row layout
- `className` — extra CSS class
- `enableAddFavorite` — show/hide favourite toggle
- `showModal` — modal vs toast after add
- `allowIncrDecr` — show/hide quantity buttons
- `enableStockValidation` — block add when out of stock
- `labels` — card-level UI strings
- `stockLabels` — stock widget UI strings
- `addToCartLabels` — AddToCart UI strings
- `createCart` — auto-create cart flag

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Card labels

| Key | Description |
|---|---|
| `addToFavorites` | Tooltip/aria text for the add favourite button |
| `removeFromFavorites` | Tooltip/aria text for the remove favourite button |

### Stock labels

| Key | Description |
|---|---|
| `inStock` | Text when product is in stock |
| `outOfStock` | Text when product is out of stock |
| `lowStock` | Text when stock is low |
| `available` | Text when product is available |
| `notAvailable` | Text when product is not available |
| `pieces` | Unit label for stock quantity |

### AddToCart labels

| Key | Description |
|---|---|
| `add` | Add button text |
| `adding` | Button text while adding |
| `addedToCart` | Toast/modal message after successful add |
| `outOfStock` | Message when stock is insufficient |
| `errorAdding` | Message on add failure |
| `noCartId` | Message when no cart is available |
| `modalTitle` | Title of the post-add modal |
| `quantity` | Label for the quantity display in modal |
| `continueShopping` | Modal button text to continue shopping |
| `proceedToCheckout` | Modal button text to go to checkout |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  addToFavorites: 'Add to favorites',
  removeFromFavorites: 'Remove from favorites',
};

const defaultStockLabels = {
  inStock: 'In stock',
  outOfStock: 'Out of stock',
  lowStock: 'Low stock',
  available: 'Available',
  notAvailable: 'Not available',
  pieces: 'pieces',
};

const defaultAddToCartLabels = {
  add: 'Add',
  adding: 'Adding...',
  addedToCart: 'added to cart',
  outOfStock: 'Out of stock',
  errorAdding: 'Error adding to cart',
  noCartId: 'No cart available',
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

### Price Toggle (VAT Switch)

The component participates in the global price toggle system:

- On mount, it reads `localStorage.getItem('price_include_tax')` to determine whether to show tax-inclusive or tax-exclusive prices.
- It listens for the `priceToggleChanged` custom event, dispatched by the PriceToggle component, and updates the displayed price in real time.
- The `includeTax` prop overrides this automatic behavior when explicitly passed.
- **Price field mapping**: `product.price.net` is the tax-inclusive price; `product.price.gross` is the tax-exclusive price. Prices are formatted as `€X.XX`.

### Image Handling

- The first image variant is used: `product.media.images.items[0].imageVariants[0].url`.
- When no image is available, a grey SVG placeholder icon is rendered in its place.
- Images scale up slightly on hover (`group-hover:scale-105`).

### Product URL Generation

Product links are generated via `configuration.urls.getProductUrl(product, language)`, which uses the configured URL pattern (default: `/product/{id}/{slug}`) with optional language prefixes.

### Favourite Toggle

The component keeps an internal `isFavorite` boolean (starts as `false`). Clicking the heart button flips it and fires `onToggleFavorite(product, newState)`. There is no initial-state prop -- if you need to pre-seed the favourite state, manage the UI externally.

### Navigation

The product name and image both render as `<a>` links. If `onProductClick` is provided, `e.preventDefault()` is called and the callback handles routing instead, enabling SPA navigation without a full page reload.

### Row vs Grid Layout

When `columns` is `1`, the card renders as a compact horizontal row:
- Image is a small 80x80px thumbnail on the left
- Name and details are inline in the middle
- Price and AddToCart appear on the right
- On mobile, the bottom section wraps below with a border separator

When `columns` is any other value (or omitted), the standard vertical card layout is used.

### Embedded AddToCart

The AddToCart component is mounted in the card footer. The card's `addToCartLabels` prop is mapped to AddToCart's `labels` prop to avoid collision with the card-level `labels` prop (which controls the favourite button strings).

---

## SDK Services and Types

### Types Used

| Import | Package | Purpose |
|---|---|---|
| `Product` | `propeller-sdk-v2` | The main product data object |
| `GraphQLClient` | `propeller-sdk-v2` | SDK client instance for API calls |
| `Contact` | `propeller-sdk-v2` | B2B user type |
| `Customer` | `propeller-sdk-v2` | B2C user type |
| `Cart` | `propeller-sdk-v2` | Cart object returned after add-to-cart |
| `CartMainItem` | `propeller-sdk-v2` | Individual cart line item |
| `CartChildItemInput` | `propeller-sdk-v2` | Input type for cluster child items |
| `AttributeResult` | `propeller-sdk-v2` | Product attribute with description and value |

### Product Fields Accessed

| Data | Field Path on `Product` |
|---|---|
| Name | `names[].value` (filtered by `language`) |
| SKU | `sku` |
| Image URL | `media.images.items[0].imageVariants[0].url` |
| Price (incl. VAT) | `price.net` |
| Price (excl. VAT) | `price.gross` |
| Short description | `shortDescriptions[].value` (filtered by `language`) |
| Manufacturer | `manufacturer` |
| Slugs | `slugs[].value` (filtered by `language`) |
| Stock | `inventory` (forwarded to ItemStock) |
| Attributes | `attributes.items[].attributeDescription.name` and `attributes.items[].value.value` |

---

## GraphQL Query Examples

### Fetching Products for ProductCard

The `Product` object passed to ProductCard should include at minimum these fields:

```graphql
query Products($categoryId: Int!, $language: String) {
  products(categoryId: $categoryId, language: $language) {
    items {
      productId
      sku
      manufacturer
      names {
        value
        language
      }
      slugs {
        value
        language
      }
      shortDescriptions {
        value
        language
      }
      price {
        net
        gross
      }
      media {
        images(searchFilters: { transformations: ["fill"] }) {
          items {
            imageVariants(
              filters: {
                width: 400
                height: 400
                transformations: ["fill"]
              }
            ) {
              url
            }
          }
        }
      }
      inventory {
        totalQuantity
        supplierQuantity
      }
      attributes {
        items {
          attributeDescription {
            name
            code
          }
          value {
            value
          }
        }
      }
    }
  }
}
```

### Fetching a Single Product

```graphql
query Product($productId: Int!, $language: String) {
  product(productId: $productId, language: $language) {
    productId
    sku
    manufacturer
    names { value language }
    slugs { value language }
    shortDescriptions { value language }
    price { net gross }
    media {
      images {
        items {
          imageVariants(filters: { width: 400, height: 400 }) {
            url
          }
        }
      }
    }
    inventory { totalQuantity supplierQuantity }
    attributes {
      items {
        attributeDescription { name code }
        value { value }
      }
    }
  }
}
```
