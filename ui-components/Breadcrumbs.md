import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Breadcrumbs

Renders a navigation breadcrumb trail from the category path returned by the Propeller SDK. Supports category, product, and cluster pages with localized names, configurable URL patterns, and accessible markup.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic -- Category Page

```tsx
import Breadcrumbs from '@/components/propeller/Breadcrumbs';
import { config } from '@/data/config';

<Breadcrumbs
  categoryPath={category.categoryPath}
  language="NL"
  configuration={config}
/>
```

Renders: **Home / Parent Category / Current Category**

### Product Page

```tsx
<Breadcrumbs
  categoryPath={product.categoryPath || []}
  language={language}
  showCurrent={true}
  configuration={config}
/>
```

Uses the product's `categoryPath` field, which contains the full ancestor chain from root to the product's primary category.

### Cluster Page

```tsx
<Breadcrumbs
  categoryPath={selectedProduct?.categoryPath || []}
  language={language}
  showCurrent={true}
  configuration={config}
/>
```

Pass the `categoryPath` from the cluster's selected product variant.

### Without Home Link

```tsx
<Breadcrumbs
  categoryPath={category.categoryPath}
  showHome={false}
  configuration={config}
/>
```

Omits the leading "Home" link. Only category items are rendered.

### Custom URL Builder

```tsx
<Breadcrumbs
  categoryPath={category.categoryPath}
  language="EN"
  getUrl={(cat, index) => `/shop/${cat.categoryId}`}
  configuration={config}
/>
```

Overrides the default URL generation for each category link.

### Custom Labels

```tsx
<Breadcrumbs
  categoryPath={category.categoryPath}
  labels={{ home: 'Start', separator: '>' }}
  configuration={config}
/>
```

Renders: **Start > Parent Category > Current Category**

### Hiding the Current Page

```tsx
<Breadcrumbs
  categoryPath={category.categoryPath}
  showCurrent={false}
  configuration={config}
/>
```

Drops the last item from the trail. Useful when the page heading already displays the current category name.

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom breadcrumbs component, use these patterns from the existing implementation:

### Basic -- Category Page

```ts
import { config } from '@/data/config';

// The `categoryPath` is available on both category and product responses.
// No separate API call is needed.
const category = await CategoryService.getCategory({ categoryId: 42 });
const path = category.categoryPath; // Category[]

// Resolve localized values
function getLocalizedValue(items: LocalizedString[], lang: string): string {
  const match = items?.find(item => item.language === lang);
  return match?.value || items?.[0]?.value || '';
}

// Filter the root category
const filtered = path.filter(
  cat => cat.categoryId !== config.baseCategoryId
);

// Generate URLs
const breadcrumbs = filtered.map(cat => ({
  label: getLocalizedValue(cat.name, 'NL'),
  url: config.urls.getCategoryUrl(cat, 'NL'),
}));
```

### Product Page

```ts
// Product responses also include categoryPath
// No separate call needed — use product.categoryPath
const product = await ProductService.getProduct({ productId: 1001 });
const path = product.categoryPath; // Category[]

const filtered = path.filter(cat => cat.categoryId !== config.baseCategoryId);
const breadcrumbs = filtered.map(cat => ({
  label: getLocalizedValue(cat.name, language),
  url: config.urls.getCategoryUrl(cat, language),
}));
```

### Cluster Page

```ts
// Use categoryPath from the cluster's selected product variant
const path = selectedProduct?.categoryPath || [];
const filtered = path.filter(cat => cat.categoryId !== config.baseCategoryId);
const breadcrumbs = filtered.map(cat => ({
  label: getLocalizedValue(cat.name, language),
  url: config.urls.getCategoryUrl(cat, language),
}));
```

### Custom URL Builder

```ts
// Override URL generation per category
const breadcrumbs = filtered.map((cat, index) => ({
  label: getLocalizedValue(cat.name, 'EN'),
  url: `/shop/${cat.categoryId}`, // custom URL pattern
}));
```

### Without Home Link / Hiding the Current Page

```ts
// Control home and current page visibility:
const showHome = true;  // set to false to omit the home link
const showCurrent = true;  // set to false to drop the last item

let items = filtered;
if (!showCurrent) {
  items = items.slice(0, -1);
}

const breadcrumbs = [];
if (showHome) {
  breadcrumbs.push({ label: 'Home', url: '/' });
}
breadcrumbs.push(...items.map(cat => ({
  label: getLocalizedValue(cat.name, language),
  url: config.urls.getCategoryUrl(cat, language),
})));
```

### Structured Data (Optional)

For SEO, consider adding JSON-LD structured data alongside the visual breadcrumbs:

```ts
const structuredData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": categoryPath.map((cat, i) => ({
    "@type": "ListItem",
    "position": i + 1,
    "name": getLocalizedValue(cat.name, language),
    "item": `https://example.com${config.urls.getCategoryUrl(cat, language)}`
  }))
};
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `categoryPath` | `Category[]` | *required* | Array of `Category` objects representing the path from root to the current item. Typically sourced from `category.categoryPath` or `product.categoryPath`. |
| `language` | `string` | `'NL'` | Language code used to resolve localized category names and slugs from the `name` and `slug` arrays on each `Category`. |
| `configuration` | `any` | `undefined` | App configuration object (from `@/data/config`). Used for `baseCategoryId` filtering and `urls.getCategoryUrl()` fallback URL generation. |

### Display

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showCurrent` | `boolean` | `true` | When `true`, the last item in the path is displayed as the current page. When `false`, the last item is omitted from the trail. |
| `showHome` | `boolean` | `true` | When `true`, a "Home" link is prepended as the first breadcrumb item. |
| `homeUrl` | `string` | `'/'` | URL for the Home link. |
| `className` | `string` | `''` | Extra CSS class applied to the root `<nav>` element. |

### Customization

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `getUrl` | `(category: Category, index: number) => string` | `undefined` | Custom URL builder for category links. Receives the `Category` object and its zero-based index. When omitted, falls back to `configuration.urls.getCategoryUrl()`. |
| `labels` | `Record<string, string>` | `undefined` | Override UI strings. Supported keys: `home` (default `'Home'`), `separator` (default `'/'`). |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function Signature

```ts
// Breadcrumbs does not call SDK services directly.
// It receives pre-fetched data through the categoryPath prop.

function buildBreadcrumbs(
  categoryPath: Category[],
  language: string,
  config: { baseCategoryId: number; urls: { getCategoryUrl: (cat: Category, lang: string) => string } }
): Array<{ label: string; url: string }>;
```

### Options Table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `categoryPath` | `Category[]` | — | Array of `Category` objects from `category.categoryPath` or `product.categoryPath` |
| `language` | `string` | `'NL'` | Language code for resolving localized names and slugs |
| `baseCategoryId` | `number` | — | `configuration.baseCategoryId` — used to filter out the root category |
| `homeUrl` | `string` | `'/'` | URL for the Home link |

### UI-Only Props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `showCurrent` — whether to display the last item as the current page
- `showHome` — whether to prepend a "Home" link
- `className` — extra CSS class for the root element
- `getUrl` — custom URL builder override
- `labels` — customizable UI strings (`home`, `separator`)

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Used in |
|-----|---------|---------|
| `home` | `'Home'` | Home link text |
| `separator` | `'/'` | Separator character between breadcrumb items |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  home: 'Home',
  separator: '/',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Navigation

- All breadcrumb items render as `<a>` links, including the current page item.
- The Home link points to `homeUrl` (default `'/'`).
- Category links are generated by `configuration.urls.getCategoryUrl(category, language)`, which respects the configured URL pattern (e.g., `page/id/slug` produces `/category/42/shoes`).
- When a custom `getUrl` function is provided, it takes full precedence over the configuration-based URL builder.

### Active Item

- The last item in the displayed path is considered the "current" item when `showCurrent` is `true`.
- When `showCurrent` is `false`, the last category in `categoryPath` is excluded entirely, and the new last item becomes a regular ancestor link.

### Separator

- A separator character is rendered between each breadcrumb item, including between the Home link and the first category.
- The default separator is `/`. Override it with `labels={{ separator: '>' }}` or any string.
- Separators are marked with `aria-hidden="true"` so screen readers skip them.

### Base Category Filtering

- When `configuration.baseCategoryId` is set, the component automatically filters out the root/base category from the trail. This prevents the site's top-level catalog node from appearing as a breadcrumb.

### Accessibility

- The root element is a `<nav>` with `aria-label="Breadcrumb"`.
- The breadcrumb items are rendered as an `<ol>` (ordered list), following WAI-ARIA breadcrumb guidelines.
- Separators use `aria-hidden="true"` to be invisible to assistive technology.

### Styling

- Uses Tailwind CSS utility classes: `flex flex-wrap items-center text-sm text-muted-foreground`.
- Links have a `hover:text-foreground transition-colors` hover effect.
- Separators are styled with `mx-2 select-none text-muted-foreground/40` for a subtle appearance.
- The component can be wrapped in a container with `className="propeller-breadcrumbs mb-6"` as used across the app pages.

## SDK Services

The Breadcrumbs component does not call SDK services directly. It receives pre-fetched data through the `categoryPath` prop.

### Required Category Fields

Each `Category` object in the `categoryPath` array must include:

| Field | Type | Purpose |
|-------|------|---------|
| `categoryId` | `number` | Used as the React list key and for URL generation. Also compared against `configuration.baseCategoryId` to filter out the root category. |
| `name` | `LocalizedString[]` | Array of `{ language: string, value: string }`. The component finds the entry matching the `language` prop, falling back to the first entry. |
| `slug` | `LocalizedString[]` | Array of `{ language: string, value: string }`. Used by `configuration.urls.getCategoryUrl()` to build the URL path segment. |

### Where categoryPath Comes From

The `categoryPath` field is returned by `CategoryService.getCategory()` and `ProductService.getProduct()` as part of their standard responses. It contains the ordered ancestor chain from the top-level category down to the current one.

```graphql
query {
  category(id: 42) {
    categoryId
    name { language value }
    slug { language value }
    categoryPath {
      categoryId
      name { language value }
      slug { language value }
    }
  }
}
```

For products, the path is available at `product.categoryPath`:

```graphql
query {
  product(id: 1001) {
    productId
    categoryPath {
      categoryId
      name { language value }
      slug { language value }
    }
  }
}
```
