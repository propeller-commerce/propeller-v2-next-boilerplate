# ProductCard

A self-contained Mitosis UI component that renders a complete product card: image with optional label overlays, product details (name, SKU, manufacturer, short description, price), a favourite toggle, and an embedded **AddToCart** control.

**Source:** `ui-components/ProductCard.lite.tsx`
**Compiled React:** `output/react/ui-components/ProductCard`
**Compiled Vue:** `output/vue/ui-components/ProductCard`

---

## Visual layout

```
┌─────────────────────────────────┐
│  [badge]          [♡ fav btn]   │  ← image area (aspect-square)
│                                 │
│          [ product image ]      │
│                                 │
├─────────────────────────────────┤
│  SKU-1234                       │  ← SKU (mono)
│  Product name that may wrap     │  ← name (link)
│  Extra attribute value          │  ← textLabels
│  Manufacturer name              │  ← showManufacturer
│  Short description text…        │  ← showShortDescription
│                     € 29.99     │  ← price
├─────────────────────────────────┤
│  [−] [ 1 ] [+]   [  Add  ]      │  ← embedded AddToCart
└─────────────────────────────────┘
```

---

## Usage

### Minimal

```tsx
import ProductCard from '@/output/react/ui-components/ProductCard';
import { graphqlClient } from '@/lib/api';

<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  cartId={cart?.cartId}
  configuration={config}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
/>
```

### With modal and SPA routing

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

### With image badge labels and text attribute labels

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

Each string in `imageLabels` / `textLabels` is matched against `product.attributes.items[].attributeDescription.code` (or `.name`). Attributes with no matching value are silently omitted.

### With favourite toggle

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

### All display options

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
  afterAddToCart={(cart) => saveCart(cart)}
/>
```

### Fully localised (Dutch)

```tsx
<ProductCard
  product={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  configuration={config}
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
| `product` | `Product` | ✓ | The Propeller product object to display |
| `graphqlClient` | `GraphQLClient` | ✓ | Initialised Propeller SDK GraphQL client (forwarded to AddToCart) |
| `user` | `Contact \| Customer \| null` | ✓ | Authenticated user (forwarded to AddToCart) |

### Display toggles

| Prop | Default | Description |
|---|---|---|
| `showName` | `true` | Renders the product name as a link |
| `showImage` | `true` | Renders the product image (aspect-square container) |
| `showShortDescription` | `false` | Renders the first localised short description |
| `showSku` | `true` | Renders the SKU in a monospace style |
| `showManufacturer` | `false` | Renders `product.manufacturer` |

### Attribute labels

| Prop | Type | Description |
|---|---|---|
| `imageLabels` | `string[]` | Attribute codes/names whose values are shown as violet badge overlays on the image |
| `textLabels` | `string[]` | Attribute codes/names whose values are shown as extra text rows below the product name |

Attribute lookup: each entry is matched against `product.attributes.items[n].attributeDescription.code` first, then `.name`. The resolved `value.value` string is rendered. Entries with no match (empty string) are dropped.

### Behaviour

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableAddFavorite` | `boolean` | `false` | Renders a heart-icon toggle button in the top-right corner of the image |
| `onToggleFavorite` | `(product, isFavorite) => void` | — | Called on every favourite state change. `isFavorite = true` means just added |
| `onProductClick` | `(product) => void` | — | Called when the product name or image is clicked. When provided, the default `<a>` navigation is suppressed, allowing SPA routing (e.g. `router.push`) |
| `className` | `string` | — | Extra CSS class applied to the root `<div>` |

### Labels

| Key | Default value | Used for |
|---|---|---|
| `addToFavorites` | `'Add to favourites'` | `aria-label` on the heart button when not yet favourited |
| `removeFromFavorites` | `'Remove from favourites'` | `aria-label` on the heart button when already favourited |

### AddToCart pass-through props

All of these are forwarded verbatim to the embedded `AddToCart` component. See [AddToCart.md](./AddToCart.md) for full documentation.

| Prop | Type | Default | Description |
|---|---|---|---|
| `cartId` | `string` | — | ID of an existing cart |
| `configuration` | `any` | — | Image filter config (same object used in `CartContext`) |
| `clusterId` | `number` | — | Cluster ID for configurable products |
| `childItems` | `number[]` | — | Product IDs of selected cluster child options |
| `notes` | `string` | — | Free-text notes for the cart item |
| `price` | `number` | — | Custom unit price override |
| `createCart` | `boolean` | `false` | Auto-create a cart when none is available |
| `onCartCreated` | `(cart) => void` | — | Called after a new cart is created |
| `onAddToCart` | `(product, ...) => Cart` | — | Custom add-to-cart handler (replaces CartService call) |
| `afterAddToCart` | `(cart, item?) => void` | — | Called after every successful add |
| `showModal` | `boolean` | `false` | Show a modal after add instead of toast |
| `allowIncrDecr` | `boolean` | `true` | Render − / + buttons around the quantity input |
| `enableStockValidation` | `boolean` | `false` | Block add if quantity exceeds `product.inventory.totalQuantity` |
| `language` | `string` | `'NL'` | Language code forwarded to CartService |
| `onProceedToCheckout` | `() => void` | — | Called when the AddToCart modal's checkout button is clicked |
| `addToCartLabels` | `Record<string, string>` | — | Override any AddToCart UI string. Passed as `labels` to the embedded AddToCart. See [AddToCart.md § Labels](./AddToCart.md) for all available keys |

---

## Internal behaviour

### Product data access

All product fields are accessed via optional chaining with `as any` casting to tolerate partial GraphQL responses:

| Data | Source on `product` |
|---|---|
| Name | `names[0].value` |
| SKU | `sku` |
| Image URL | `media.images.items[0].imageVariants[0].url` |
| Price | `price.gross` — formatted as `€X.XX` |
| URL | `/product/{productId}/{slugs[0].value}` |
| Short description | `shortDescriptions[0].value` |
| Manufacturer | `manufacturer` |
| Attributes | `attributes.items[n].attributeDescription.code/name` → `value.value` |

### Image fallback

When `product.media` is absent or the URL is empty, a grey placeholder SVG (image icon) is rendered in its place.

### Favourite toggle

The component keeps an internal `isFavorite` boolean (starts as `false`). Clicking the heart button flips it and fires `onToggleFavorite(product, newState)`. There is no initial-state prop — if you need to pre-seed the favourite state, initialise it in the `onToggleFavorite` callback or manage the UI externally.

### Navigation

The product name and image both render as `<a href="/product/{id}/{slug}">` links. If `onProductClick` is provided, `e.preventDefault()` is called and the callback handles routing instead, enabling Next.js/SPA navigation without a full page reload.

### Embedded AddToCart

The `AddToCart` component is mounted in the card footer. All AddToCart-specific props are passed through transparently. Note that AddToCart's `labels` prop is exposed on `ProductCard` as **`addToCartLabels`** to avoid collision with the card-level `labels` prop (which controls the favourite button strings). The `className` applied to `AddToCart` is always `"flex w-full items-center gap-2"` to keep it flush with the card layout; use the parent `className` prop to adjust the card's outer appearance.
