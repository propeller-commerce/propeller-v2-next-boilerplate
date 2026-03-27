import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductInfo

Displays core product identification -- the product name and SKU. It can either render a pre-fetched `Product` object or fetch one internally via the Propeller SDK when given a `productId` and `graphqlClient`. The `onProductLoaded` callback lets sibling components (gallery, price, descriptions) hydrate from the same product data, making ProductInfo the ideal orchestrator for a product detail page.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Self-contained fetch (recommended for product detail pages)

The component fetches the product internally and notifies siblings via `onProductLoaded`:

```tsx
import ProductInfo from '@/components/propeller/ProductInfo';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import { imageSearchFilters, imageVariantFiltersLarge } from '@/data/defaults';

const [product, setProduct] = useState<Product | null>(null);

<ProductInfo
  user={authState.user}
  productId={42}
  graphqlClient={graphqlClient}
  language="EN"
  imageSearchFilters={imageSearchFilters}
  imageVariantFilters={imageVariantFiltersLarge}
  onProductLoaded={setProduct}
  configuration={config}
/>

{/* Siblings consume the loaded product */}
<ProductPrice price={product?.price} />
<ProductGallery images={product?.media?.images?.items} />
```

### Pre-fetched product (no SDK call)

When you already have the product data, pass it directly. The component renders immediately and still fires `onProductLoaded`:

```tsx
<ProductInfo
  user={authState.user}
  product={existingProduct}
  language="EN"
  onProductLoaded={setProduct}
/>
```

### Title only (hide SKU)

```tsx
<ProductInfo
  user={authState.user}
  product={product}
  showSku={false}
  language="NL"
/>
```

### SKU only (hide title)

```tsx
<ProductInfo
  user={authState.user}
  product={product}
  showTitle={false}
  language="NL"
/>
```

### With attribute-based labels

Display custom product attributes as image badges or text rows:

```tsx
<ProductInfo
  user={authState.user}
  productId={42}
  graphqlClient={graphqlClient}
  configuration={config}
  imageLabels={['new', 'sale']}
  textLabels={['brand', 'color']}
/>
```

### Full product detail page integration

This is the pattern used on the actual product page, where ProductInfo orchestrates data loading for the entire page:

```tsx
const [product, setProduct] = useState<Product | null>(null);

<ProductInfo
  user={state.user}
  productId={productId}
  graphqlClient={graphqlClient}
  language={language}
  imageSearchFilters={imageSearchFilters}
  imageVariantFilters={imageVariantFiltersLarge}
  onProductLoaded={setProduct}
  configuration={config}
/>

<ProductPrice price={product?.price} includeTax={includeTax} />
<ProductBulkPrices bulkPrices={product?.bulkPrices || []} />
<ProductShortDescription product={product} language={language} />
<ItemStock inventory={product?.inventory} />
<AddToCart product={product} />
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To create a custom product info component, you need the `Product` type from `propeller-sdk-v2` and a way to resolve localized strings.

### Resolving product name from a pre-fetched product

```ts
import { Product, LocalizedString } from 'propeller-sdk-v2';

function getProductName(product: Product, language = 'NL'): string {
  return product.names?.find(
    (n: LocalizedString) => n.language === language
  )?.value || product.names?.[0]?.value || '';
}

// Access fields:
// - product.sku        -- the SKU string
// - getProductName(product, 'NL') -- the localized product name
```

Render the SKU as a label and the product name as a heading.

### Fetching a product via the SDK

```ts
import { ProductService, Product } from 'propeller-sdk-v2';

// pseudo-code: call on initialization and when productId or language changes
async function fetchProduct(
  graphqlClient: GraphQLClient,
  productId: number,
  language = 'NL'
): Promise<Product> {
  const service = new ProductService(graphqlClient);
  return service.getProduct({
    productId,
    language,
    imageSearchFilters: { page: 1, offset: 20 },
    imageVariantFilters: { transformations: [] },
  });
}

// pseudo-code: once the product is loaded, share it with sibling components
// (e.g., price display, image gallery, specifications) to avoid duplicate API calls
```

### Adding attribute labels

```tsx
function getAttributeValue(product: Product, code: string): string | null {
  const attr = product.attributes?.items?.find(
    (a) => a.attributeDescription?.code === code
      || a.attributeDescription?.name === code
  );
  return attr?.textValue || null;
}

// Usage
const brand = getAttributeValue(product, 'brand');
const isNew = getAttributeValue(product, 'new');
```

### Extending with additional product fields

Since `onProductLoaded` passes the full `Product` object, you can build any sibling component without extra API calls:

```ts
// pseudo-code: fetch once, then pass fields to sibling renderers
const product = await fetchProduct(graphqlClient, 42, 'NL');

// Access any field from the full Product object:
// product.price        → pass to price display
// product.media        → pass to image carousel
// product.attributes   → pass to spec table
// product.bulkPrices   → pass to bulk price display
// product.inventory    → pass to stock indicator
// product.categoryPath → pass to breadcrumbs
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data Source

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `Contact \| Customer \| null` | **(required)** | The authenticated user. Used to build price calculation inputs (companyId, contactId, customerId). |
| `product` | `Product` | `undefined` | Pre-fetched product object. When provided, the component skips internal fetching. |
| `productId` | `number` | `undefined` | Product ID to fetch when no `product` prop is given. Requires `graphqlClient`. |
| `graphqlClient` | `GraphQLClient` | `undefined` | Initialized Propeller SDK GraphQL client. Required when using `productId`. |
| `configuration` | `any` | `undefined` | App config object (from `@/data/config`). Provides fallback `imageSearchFilters`, `imageVariantFiltersLarge`, and `productTrackAttributes`. |

### Image & Price Filters

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageSearchFilters` | `any` | Falls back to `configuration.imageSearchFilters` | Controls how many image items are returned. Example: `{ page: 1, offset: 20 }`. |
| `imageVariantFilters` | `any` | Falls back to `configuration.imageVariantFiltersLarge` | Controls image size/format variants. Use `imageVariantFiltersLarge` from `@/data/defaults`. |
| `taxZone` | `string` | `'NL'` | Tax zone for price calculation. |

### Display Toggles

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showTitle` | `boolean` | `true` | Show the product name as an `<h1>`. |
| `showSku` | `boolean` | `true` | Show the product SKU in a monospace label. |

### Locale & Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `language` | `string` | `'NL'` | Language code used to resolve localized product names from the `names` array. |
| `className` | `string` | `''` | Extra CSS class applied to the root `<div>`. |

### Labels

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageLabels` | `string[]` | `undefined` | Attribute codes to display as badge overlays on the product image. Resolved against `product.attributes.items[].attributeDescription.code` (or `.name`). Unmatched codes are silently omitted. |
| `textLabels` | `string[]` | `undefined` | Attribute codes to display as extra text rows below the product name. Resolved the same way as `imageLabels`. |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onProductLoaded` | `(product: Product) => void` | Fired once product data is available -- immediately when `product` prop is supplied, or after the internal fetch completes. Use this to hydrate sibling components. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function fetchProduct(
  graphqlClient: GraphQLClient,
  productId: number,
  options?: ProductInfoOptions
): Promise<Product>
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `productId` | `number` | **required** | `productId` prop |
| `language` | `string` | `'NL'` | `language` prop |
| `imageSearchFilters` | `any` | `{ page: 1, offset: 20 }` | `imageSearchFilters` prop |
| `imageVariantFilters` | `any` | `configuration.imageVariantFiltersLarge` | `imageVariantFilters` prop |
| `taxZone` | `string` | `'NL'` | `taxZone` prop |
| `user` | `Contact \| Customer \| null` | **required** | `user` prop — used to build `priceCalculateProductInput` and `userBulkPriceProductInput` |

### Callbacks

| Callback | When it fires | What to implement |
|----------|---------------|-------------------|
| `onProductLoaded` | After the product is fetched or when a pre-fetched `product` is provided | Share the loaded `Product` with sibling components to avoid duplicate API calls |

### UI-only props (React component only)

The following props control visual presentation and have no equivalent in a custom implementation:

- `showTitle` — Show/hide the product name heading
- `showSku` — Show/hide the SKU label
- `className` — Extra CSS class on the root element
- `imageLabels` — Attribute codes rendered as badge overlays
- `textLabels` — Attribute codes rendered as text rows

  </TabItem>
</Tabs>

---

## Behavior

### Two data modes

1. **Pre-fetched** (`product` prop provided): No SDK call is made. The component renders immediately and fires `onProductLoaded` with the supplied product.
2. **Self-contained** (`productId` + `graphqlClient` provided): The component fetches the product via `ProductService.getProduct()`, shows a skeleton loader during the request, then renders and fires `onProductLoaded`.

### Loading skeleton

While fetching (and no `product` prop is present), the component renders an animated pulse skeleton with two placeholder bars -- a narrow one for the SKU and a wider one for the title.

### Language resolution

The product name is resolved by matching `language` against the `product.names` array (each entry is a `LocalizedString` with `language` and `value`). If no match is found, the first entry in the array is used as a fallback.

### Re-fetch triggers

The internal fetch re-runs when any of these props change:
- `productId`
- `product`
- `language`
- `user` -- ensures pricing updates on login, logout, or company switch

### User-aware pricing

The fetch includes `priceCalculateProductInput` and `userBulkPriceProductInput` derived from the `user` prop. For B2B users (Contact), `companyId` and `contactId` are included. For B2C users (Customer), `customerId` is included. This ensures server-side price calculation respects customer-specific pricing tiers. Because `user` is in the dependency array, pricing automatically re-fetches when the user logs in, logs out, or switches companies.

### Error handling

Fetch errors are caught silently -- the loading state is cleared but no error UI is shown. The component simply remains empty until valid data is available.

---

## SDK Services

ProductInfo uses `ProductService.getProduct()` from `propeller-sdk-v2` when fetching internally.

### Product fields read by the component

| Field | Usage |
|-------|-------|
| `product.names` | Array of `LocalizedString`. The component finds the entry matching `language` and falls back to the first entry. Rendered as the `<h1>` title. |
| `product.sku` | Rendered as the SKU label. |

### Product fields passed through via `onProductLoaded`

The full `Product` object is forwarded to the callback, enabling sibling components to access:

| Field | Consuming component |
|-------|-------------------|
| `product.price` | ProductPrice |
| `product.bulkPrices` | ProductBulkPrices |
| `product.media.images.items` | ProductGallery |
| `product.inventory` | ItemStock |
| `product.categoryPath` | Breadcrumbs |
| `product.slugs` | URL slug resolution |
| `product.attributes` | Label resolution (imageLabels, textLabels) |

### Query variables built internally

When fetching by `productId`, the component constructs the following query variables:

- **`productId`** -- from props
- **`language`** -- from props, defaults to `'NL'`
- **`imageSearchFilters`** -- from props or `configuration.imageSearchFilters`
- **`imageVariantFilters`** -- from props or `configuration.imageVariantFiltersLarge`
- **`priceCalculateProductInput`** -- built from `user` (companyId, contactId, customerId) and `taxZone`
- **`userBulkPriceProductInput`** -- same structure as price input
- **`attributeResultSearchInput`** -- conditionally included when `configuration.productTrackAttributes` is a non-empty array

---

## GraphQL Query Example

The internal fetch calls `ProductService.getProduct()`, which executes a query equivalent to:

```graphql
query GetProduct(
  $productId: Int!
  $language: String
  $imageSearchFilters: ImageSearchInput
  $imageVariantFilters: ImageVariantFilterInput
  $priceCalculateProductInput: PriceCalculateProductInput
  $userBulkPriceProductInput: UserBulkPriceProductInput
  $attributeResultSearchInput: AttributeResultSearchInput
) {
  product(productId: $productId, language: $language) {
    productId
    sku
    names {
      language
      value
    }
    slugs {
      language
      value
    }
    price(input: $priceCalculateProductInput) {
      net
      gross
    }
    bulkPrices(input: $userBulkPriceProductInput) {
      from
      price {
        net
        gross
      }
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
    inventory {
      totalQuantity
    }
    categoryPath {
      categoryId
      names {
        language
        value
      }
      slugs {
        language
        value
      }
    }
    attributes(input: $attributeResultSearchInput) {
      items {
        attributeDescription {
          code
          name
        }
        textValue
      }
    }
  }
}
```

Variables for a B2B (Contact) user:

```json
{
  "productId": 42,
  "language": "EN",
  "imageSearchFilters": { "page": 1, "offset": 20 },
  "imageVariantFilters": { "transformations": [] },
  "priceCalculateProductInput": {
    "taxZone": "NL",
    "companyId": 100,
    "contactId": 200
  },
  "userBulkPriceProductInput": {
    "taxZone": "NL",
    "companyId": 100,
    "contactId": 200
  }
}
```
