# ProductTabs

A tabbed content organizer for product detail pages. Combines four sub-components — Description, Specifications, Downloads, and Videos — into a unified interface with horizontal tabs on desktop and an accordion on mobile.

---

## Usage

### Basic usage with all tabs

```tsx
<ProductTabs
  product={product}
  graphqlClient={graphqlClient}
  productId={product.productId}
/>
```

### Only description and specifications

```tsx
<ProductTabs
  product={product}
  graphqlClient={graphqlClient}
  productId={product.productId}
  showDownloads={false}
  showVideos={false}
/>
```

### Collapsed description with custom labels

```tsx
<ProductTabs
  product={product}
  graphqlClient={graphqlClient}
  productId={product.productId}
  descriptionCollapsed={true}
  descriptionMaxLength={300}
  labels={{
    description: 'Overview',
    specifications: 'Tech Specs',
    downloads: 'Documents',
    videos: 'Media',
  }}
/>
```

### Grouped specifications in list layout

```tsx
<ProductTabs
  product={product}
  graphqlClient={graphqlClient}
  productId={product.productId}
  specificationsLayout="list"
  specificationsGrouping={true}
  language="EN"
/>
```

### Custom labels for sub-components

```tsx
<ProductTabs
  product={product}
  graphqlClient={graphqlClient}
  productId={product.productId}
  downloadsLabels={{ title: 'Product Documents', download: 'Get file' }}
  videosLabels={{ title: 'Product Videos' }}
/>
```

---

## Props

### Core

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `product` | `Product` | *required* | The product object containing descriptions, attributes, media documents, and media videos. |
| `language` | `string` | `'NL'` | Language code passed to all sub-components for localized content resolution. |
| `labels` | `Record<string, string>` | `{}` | Override the tab button labels. Keys: `description`, `specifications`, `downloads`, `videos`. |
| `className` | `string` | `''` | Extra CSS class applied to the root element. |

### Tab Visibility

All default to `true`. Set to `false` to hide a tab entirely.

| Prop | Type | Description |
|------|------|-------------|
| `showDescription` | `boolean` | Show or hide the Description tab. Automatically hidden if the product has no description for the active language. |
| `showSpecifications` | `boolean` | Show or hide the Specifications tab. |
| `showDownloads` | `boolean` | Show or hide the Downloads tab. |
| `showVideos` | `boolean` | Show or hide the Videos tab. |

### Description Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `descriptionCollapsed` | `boolean` | `false` | When `true`, truncates the description to `descriptionMaxLength` characters with a "Read more" / "Read less" toggle. |
| `descriptionMaxLength` | `number` | `0` | Maximum characters shown when collapsed. `0` means no truncation. |

### Specifications Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | `undefined` | Initialized Propeller SDK GraphQL client, passed to ProductSpecifications for attribute fetching. |
| `productId` | `number` | `undefined` | Product ID for fetching attributes via the SDK. |
| `specificationsLayout` | `string` | `'table'` | Display layout: `'table'` (two-column name/value) or `'list'` (vertical stacked rows). |
| `specificationsGrouping` | `boolean` | `false` | When `true`, groups specifications by their group field with a heading per section. |

### Downloads & Videos Labels

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `downloadsLabels` | `Record<string, string>` | `{}` | Override UI strings for the Downloads section. Keys: `title`, `download`. |
| `videosLabels` | `Record<string, string>` | `{}` | Override UI strings for the Videos section. Key: `title`. |

---

## SDK Services & Product Fields

ProductTabs reads the following fields from the `Product` object (from `propeller-sdk-v2`):

| Field | Used By | Purpose |
|-------|---------|---------|
| `product.descriptions` | Description tab | Array of `{ language, value }` objects. The component matches by `language` prop (default `'NL'`), falling back to the first entry. If no description exists, the Description tab is automatically hidden. |
| `product.attributes.items` | Specifications tab | Array of `AttributeResult` objects passed directly to ProductSpecifications. |
| `product.media.documents` | Downloads tab | `PaginatedMediaDocumentResponse` containing downloadable files associated with the product. |
| `product.media.videos` | Videos tab | `PaginatedMediaVideoResponse` containing video entries associated with the product. |

The Specifications tab can also fetch attributes independently via `graphqlClient` and `productId`, which is useful when `product.attributes` is not populated in the initial product query.

---

## Behavior

### Tab Switching

- **Desktop** (md and above): Horizontal tab bar with an underline indicator on the active tab. Clicking a tab replaces the visible content panel below.
- **Mobile** (below md): Accordion layout with chevron icons. Tapping a section header toggles it open or closed. Only one section is open at a time — opening a new section closes the previous one. Tapping the currently open section closes it (all collapsed state).

### Initial Tab Selection

On mount, the component selects the first visible tab in this priority order:

1. Description (if enabled and the product has description content)
2. Specifications
3. Downloads
4. Videos

If the product or language changes after mount, the component re-evaluates and resets to the Description tab when applicable.

### Lazy Loading of Specifications

The Specifications sub-component is not rendered until the user visits the Specifications tab at least once. After the first visit, it stays mounted (hidden via CSS on desktop) to preserve any fetched data and avoid redundant API calls. This is tracked internally via a `specsVisited` flag.

### Description Auto-Hide

The Description tab is automatically excluded from the tab bar when the product has no description content for the current language (and no fallback description exists). The next available tab becomes the default.

---

## Building Your Own

To create a custom tabbed product detail layout:

1. **Fetch the product** with `descriptions`, `attributes`, and `media` fields populated in your GraphQL query.

2. **Initialize the GraphQL client** for the Specifications tab to fetch attributes independently:
   ```tsx
   import { GraphQLClient } from 'propeller-sdk-v2';
   const graphqlClient = new GraphQLClient({ endpoint, apiKey, authToken });
   ```

3. **Use individual sub-components** if you need full control over layout instead of the tab wrapper:
   - `ProductDescription` — renders HTML description with optional collapse/expand
   - `ProductSpecifications` — renders attributes as a table or list, optionally grouped
   - `ProductDownloads` — renders downloadable document links
   - `ProductVideos` — renders embedded video players

4. **Implement responsive behavior** yourself. The built-in component uses `hidden md:block` / `md:hidden` Tailwind classes to switch between tabs and accordion. You can replace this with your own breakpoint logic or always use one layout.

5. **Style with Tailwind** using semantic color tokens (`border-border`, `text-foreground`, `text-muted-foreground`) for theme compatibility. The active tab uses a bottom border (`border-b-2 border-foreground`) and the accordion chevron rotates 180 degrees when expanded.
