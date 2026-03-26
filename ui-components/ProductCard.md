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

---

## Props

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

---

## Building Your Own

If you need a custom product card without using this component, here is standalone rendering logic:

```tsx
import { Product } from 'propeller-sdk-v2';

interface SimpleProductCardProps {
  product: Product;
  language?: string;
  includeTax?: boolean;
  onClick?: (product: Product) => void;
}

function SimpleProductCard({ product, language = 'NL', includeTax = true, onClick }: SimpleProductCardProps) {
  // Resolve localised name
  const name = product.names?.find(n => n.language === language)?.value
    || product.names?.[0]?.value
    || 'Product';

  // Resolve image URL (first variant of first image)
  const imageUrl = product.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';

  // Resolve price: net = incl. VAT, gross = excl. VAT
  const priceValue = includeTax ? product.price?.net : product.price?.gross;
  const formattedPrice = priceValue != null ? `€${Number(priceValue).toFixed(2)}` : '';

  // Resolve slug for URL
  const slug = product.slugs?.find(s => s.language === language)?.value
    || product.slugs?.[0]?.value
    || '';

  const productUrl = `/product/${product.productId}/${slug}`;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(product);
    }
  };

  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Image */}
      <a href={productUrl} onClick={handleClick} className="aspect-square bg-gray-50 p-4">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-300">
            No image
          </div>
        )}
      </a>

      {/* Details */}
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-mono text-xs text-gray-400">{product.sku}</span>
        <a href={productUrl} onClick={handleClick} className="text-sm font-medium text-gray-900 hover:text-primary line-clamp-2">
          {name}
        </a>
        {formattedPrice && (
          <span className="mt-auto pt-2 text-lg font-bold text-gray-900">
            {formattedPrice}
          </span>
        )}
      </div>
    </div>
  );
}
```

### Subscribing to the Price Toggle

To make your custom card react to the global VAT toggle:

```tsx
import { useState, useEffect } from 'react';

function useIncludeTax(): boolean {
  const [includeTax, setIncludeTax] = useState(true);

  useEffect(() => {
    // Read initial value
    const stored = localStorage.getItem('price_include_tax');
    if (stored !== null) setIncludeTax(stored === 'true');

    // Listen for toggle changes
    const handler = (e: CustomEvent) => setIncludeTax(e.detail === true);
    window.addEventListener('priceToggleChanged', handler as EventListener);
    return () => window.removeEventListener('priceToggleChanged', handler as EventListener);
  }, []);

  return includeTax;
}
```

### Resolving Attribute Labels

```tsx
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
