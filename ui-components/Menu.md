import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Menu

A navigation component that renders a category hierarchy fetched from the Propeller GraphQL API. It supports two layout styles -- **dropdown-vertical** (nested flyout columns on hover) and **jumbotron** (full-width mega-menu panel) -- plus a mobile accordion view that shows automatically on smaller screens.

The component handles its own data fetching, caching, and localization internally. User interactions are delegated to the parent via the `onMenuItemClick` callback for SPA-style routing.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic dropdown menu in a header

```tsx
import Menu from '@/components/propeller/Menu';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import { useRouter } from 'next/navigation';

function Header() {
  const router = useRouter();

  return (
    <Menu
      graphqlClient={graphqlClient}
      categoryId={17}
      language="NL"
      configuration={config}
      onMenuItemClick={(category) => {
        router.push(config.urls.getCategoryUrl(category, 'NL'));
      }}
    />
  );
}
```

### Jumbotron / mega-menu style

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  menuStyle="jumbotron"
  configuration={config}
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category, 'NL'))
  }
/>
```

### With authenticated user (enables user-specific cache buckets)

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  user={authState.user}
  configuration={config}
  onMenuItemClick={(category) => {
    router.push(config.urls.getCategoryUrl(category, 'NL'));
  }}
/>
```

### Always-mounted pattern (prevents re-fetch on toggle)

The recommended pattern keeps the menu always mounted in the DOM and toggles visibility with CSS. This avoids re-fetching the category tree every time the menu opens. **Important:** Gate the Menu on `!authState.isLoading` so it only mounts after auth resolves — this prevents a premature anonymous fetch followed by a second user-specific fetch.

```tsx
const { state: authState } = useAuth();
const [showMenu, setShowMenu] = useState(false);

<div
  ref={menuRef}
  onMouseLeave={() => setShowMenu(false)}
>
  <button onMouseEnter={() => setShowMenu(true)}>
    Browse Categories
  </button>

  <div className={showMenu
    ? "visible opacity-100"
    : "invisible opacity-0 pointer-events-none h-0 overflow-hidden"
  }>
    {!authState.isLoading && (
      <Menu
        graphqlClient={graphqlClient}
        categoryId={17}
        language={language}
        user={authState.user}
        configuration={config}
        onMenuItemClick={(category) => {
          setShowMenu(false);
          router.push(config.urls.getCategoryUrl(category, language));
        }}
      />
    )}
  </div>
</div>
```

### Custom labels (Dutch localization)

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  configuration={config}
  labels={{
    loading: 'Menu laden...',
    error: 'Menu kon niet geladen worden',
    empty: 'Geen categorieën gevonden',
  }}
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category, 'NL'))
  }
/>
```

### Deeper hierarchy with custom styling

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="EN"
  depth={4}
  menuClass="border rounded-lg bg-white shadow-sm"
  className="w-72"
  configuration={config}
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category, 'EN'))
  }
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need full control over the menu rendering, you can fetch the category tree yourself and build a custom UI.

### Recursive query construction and data fetching

```ts
import { GraphQLClient, Category, LocalizedString } from 'propeller-sdk-v2';

interface CategoryTree extends Category {
  categories?: CategoryTree[];
}

function buildCategoriesQuery(depth: number): string {
  if (depth === 0) return '';
  return `
    categories {
      categoryId
      name(language: $language) { value language }
      slug(language: $language) { value }
      ${buildCategoriesQuery(depth - 1)}
    }
  `;
}

async function fetchCategoryTree(
  client: GraphQLClient,
  categoryId: number,
  language: string,
  depth: number = 3
): Promise<CategoryTree | null> {
  const query = `
    query Menu($categoryId: Float, $language: String) {
      category(categoryId: $categoryId) {
        categoryId
        name(language: $language) { value language }
        slug(language: $language) { value }
        ${buildCategoriesQuery(depth)}
      }
    }
  `;

  const response = await client.execute({
    query,
    variables: { categoryId, language },
  });

  return response?.data?.category || null;
}

// Helper: resolve localised category name
function getCategoryName(cat: Category, language: string): string {
  const match = cat.name?.find((n: LocalizedString) => n.language === language);
  return match?.value || cat.name?.[0]?.value || '';
}

// Helper: resolve localised category slug
function getCategorySlug(cat: Category, language: string): string {
  const match = cat.slug?.find((s: LocalizedString) => s.language === language);
  return match?.value || cat.slug?.[0]?.value || '';
}

// Fetch the tree
const root = await fetchCategoryTree(graphqlClient, 17, 'NL', 3);
// root.categories -> L1 categories
// root.categories[0].categories -> L2 categories, etc.
```

### Caching pattern

To avoid re-fetching on every page load, cache the result in `localStorage`:

1. Build a cache key that includes the `categoryId`, `language`, and user identity (e.g., `propeller_menu_17_NL` for anonymous, `propeller_menu_17_NL_c123` for Contact with id 123).
2. Before fetching, check `localStorage` for a cached entry. Parse the stored JSON and compare the timestamp against a 12-hour TTL.
3. If the cache is valid, use it directly. Otherwise, fetch from the API and store the result with a `Date.now()` timestamp.
4. Wrap `localStorage.setItem` in a try/catch for quota safety.

### Rendering

Your UI should render the fetched `CategoryTree` as a nested navigation. For each category, use `getCategoryName()` for the display label and build a URL from `categoryId` and `getCategorySlug()`. Recursively render `cat.categories` for subcategories.

Key points when building your own:

- **Do not use `CategoryService.getCategory()`** for menu data -- it returns a flat category without nested children.
- Use `graphqlClient.execute()` with the recursive query pattern shown above.
- The `language` variable controls which translations are returned for `name` and `slug` fields.
- Authenticated users may see different categories, so include user identity in your cache key if you implement caching.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data & fetching

| Prop | Type | Default | Description |
|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | **required** | Initialized Propeller SDK GraphQL client used to fetch category data |
| `categoryId` | `number` | **required** | Root category ID -- the top of the menu tree |
| `language` | `string` | **required** | Language code for localized category names and slugs (e.g. `'NL'`, `'EN'`) |
| `depth` | `number` | `3` | Maximum nesting depth of the category hierarchy |
| `user` | `Contact \| Customer \| null` | `null` | Authenticated user. When the user changes (login/logout), the cache key changes and the menu re-fetches |
| `configuration` | `any` | `undefined` | App configuration object (from `@/data/config`). Must include `urls.getCategoryUrl(category, language)` for URL generation |

### Appearance

| Prop | Type | Default | Description |
|---|---|---|---|
| `menuStyle` | `string` | `'dropdown-vertical'` | Layout variant: `'dropdown-vertical'` or `'jumbotron'` |
| `menuClass` | `string` | -- | CSS class applied to the inner `<nav>` element |
| `className` | `string` | -- | CSS class applied to the root `<div>` wrapper |
| `menuLinkFormat` | `string` | -- | URL pattern with `{categoryId}` and `{slug}` placeholders (used as fallback if `configuration` is not provided) |

### Callbacks & labels

| Prop | Type | Default | Description |
|---|---|---|---|
| `onMenuItemClick` | `(category: Category) => void` | **required** | Called when a menu link is clicked. The default `<a>` navigation is prevented so the parent controls routing |
| `labels` | `Record<string, string>` | -- | Override UI strings. Keys: `loading`, `error`, `empty` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function fetchCategoryTree(
  client: GraphQLClient,
  categoryId: number,
  language: string,
  depth?: number
): Promise<CategoryTree | null>
```

Types: `GraphQLClient`, `Category`, `LocalizedString` from `propeller-sdk-v2`.

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `client` | `GraphQLClient` | required | `graphqlClient` prop |
| `categoryId` | `number` | required | `categoryId` prop |
| `language` | `string` | required | `language` prop |
| `depth` | `number` | `3` | `depth` prop |

When a `user` is present, the component also passes `contactId` (for Contact users) or `customerId` (for Customer users) in the query variables so the API can apply user-specific category visibility rules.

### Callbacks table

| Callback | When it fires | What to implement |
|---|---|---|
| `onMenuItemClick` | A menu link is clicked | Navigate to the category URL using your framework's router (e.g., `router.push(url)`) |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `menuStyle` — layout variant (`'dropdown-vertical'` or `'jumbotron'`)
- `menuClass` — CSS class on the inner `<nav>`
- `className` — CSS class on the root wrapper
- `menuLinkFormat` — URL pattern fallback
- `labels` — UI strings (`loading`, `error`, `empty`)
- `configuration` — app config for URL generation

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Shown when |
|---|---|---|
| `loading` | `'Loading menu...'` | Categories are being fetched |
| `error` | `'Failed to load menu'` | The GraphQL request failed |
| `empty` | `'No categories found'` | The root category has no visible subcategories |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  loading: 'Loading menu...',
  error: 'Failed to load menu',
  empty: 'No categories found',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Layout styles

### `dropdown-vertical` (default)

A vertical list of top-level categories. On hover, subcategories appear as flyout columns to the right, up to 3 levels deep. Desktop only -- on mobile the component renders an accordion instead.

```
+-----------------+
| Computers       | -> +-----------------+
| Peripherals     |    | Keyboards       | -> +-----------------+
| Networking      |    | Mice            |    | Wireless        |
| ...             |    | Monitors        |    | Wired           |
+-----------------+    | ...             |    | Ergonomic       |
                       +-----------------+    +-----------------+
```

### `jumbotron`

Top-level categories render as horizontal tabs. The hovered tab reveals a full-width panel with subcategories in a responsive grid (2-4 columns). Level 3 items appear as lists beneath each level 2 heading.

```
[ Computers ] [ Peripherals ] [ Networking ] ...
+------------------------------------------------------+
|  Keyboards        Mice            Monitors            |
|  - Wireless       - Gaming        - 4K                |
|  - Mechanical     - Ergonomic     - Ultrawide         |
|  - Compact        - Trackballs    - Curved            |
+------------------------------------------------------+
```

### Mobile accordion (automatic)

On screens narrower than the `md` breakpoint, both styles are hidden and a vertical accordion is shown instead. Tapping a category name navigates to it; tapping the chevron expands/collapses its children.

---

## Behavior

### Caching

The component always caches the fetched category tree in `localStorage` to avoid unnecessary API calls on every render.

- **Cache key format**: `propeller_menu_{categoryId}_{language}` for anonymous users, or `propeller_menu_{categoryId}_{language}_c{contactId}` / `propeller_menu_{categoryId}_{language}_u{customerId}` for authenticated users.
- **TTL**: 12 hours (43,200,000 ms). Expired entries are removed on the next fetch attempt.
- **Quota safety**: `localStorage.setItem` is wrapped in a try/catch so the component degrades gracefully if storage is full.

### Auth-based cache invalidation

Because the cache key includes the user identifier, logging in or out automatically produces a different cache key. This means:

- Anonymous and authenticated users never share cached data.
- Switching between user accounts also uses separate cache buckets.
- No explicit cache-clearing logic is needed on auth transitions -- the `user` prop change triggers a re-fetch against the new cache key.

### Fetch deduplication (React compiled version)

The compiled React component uses a module-level `inflightFetches` Map to deduplicate concurrent requests. When multiple Menu instances (desktop + mobile) or React Strict Mode double-invocations try to fetch with the same cache key simultaneously, only one HTTP request is made. All callers share the same in-flight promise.

Additionally, the `useEffect` uses a `cancelled` flag with cleanup to prevent stale state updates when the effect is re-invoked before a previous fetch completes.

### Preventing double fetch on page load

The parent component (e.g., Header) should gate Menu rendering on `!authState.isLoading`. Without this guard, Menu mounts immediately with `user=null` (anonymous fetch), then auth resolves from localStorage and `user` changes (user-specific fetch) — resulting in two API calls. Gating on `isLoading` ensures Menu only mounts once with the correct user.

### Language support

- Category names and slugs are fetched using the `language` variable in the GraphQL query.
- Changing the `language` prop triggers a re-fetch (and uses a different cache key).
- The component tries to find a localized string matching the requested language; if not found, it falls back to the first available translation.

### Re-fetch triggers

The menu re-fetches when any of these props change:
- `graphqlClient`
- `categoryId`
- `language`
- `user`

On each fetch, the cache is checked first. If a valid (non-expired) cached entry exists for the current cache key, the API call is skipped entirely. In the React compiled version, concurrent fetches for the same cache key are deduplicated at the module level — only one HTTP request goes out.

### Hover state

- **dropdown-vertical**: Tracks hovered L1 and L2 category IDs to show/hide flyout columns. Hovering a new L1 category resets the L2 hover state.
- **jumbotron**: Tracks hovered L1 to display the mega panel. L2 and L3 categories are always visible within the panel.

### CSS class hooks

| Selector | Element |
|---|---|
| `.propeller-menu` | Root wrapper `<div>` |
| `.propeller-menu-dropdown` | Desktop `<nav>` for `dropdown-vertical` style |
| `.propeller-menu-jumbotron` | Desktop `<nav>` for `jumbotron` style |
| `.propeller-menu-mobile` | Mobile accordion `<nav>` |

---

## SDK Services

### Why `graphqlClient.execute()` instead of `CategoryService`

The Propeller SDK's `CategoryService.getCategory()` returns a flat category object -- it does **not** include nested subcategories. To fetch a full category tree (multiple levels deep), the Menu component builds a recursive GraphQL query and executes it directly via `graphqlClient.execute()`.

### Internal query construction

The component constructs its query using a recursive `buildCategoriesQuery(depth)` function:

```typescript
const buildCategoriesQuery = (currentDepth: number): string => {
  if (currentDepth === 0) return '';
  return `
    categories {
      categoryId
      name(language: $language) { value language }
      slug(language: $language) { value }
      ${buildCategoriesQuery(currentDepth - 1)}
    }
  `;
};
```

This produces a nested query where the `categories` field is repeated at each level. For `depth=3`, the generated query looks like:

```graphql
query Menu($categoryId: Float, $language: String) {
  category(categoryId: $categoryId) {
    categoryId
    name(language: $language) { value language }
    slug(language: $language) { value }
    categories {
      categoryId
      name(language: $language) { value language }
      slug(language: $language) { value }
      categories {
        categoryId
        name(language: $language) { value language }
        slug(language: $language) { value }
        categories {
          categoryId
          name(language: $language) { value language }
          slug(language: $language) { value }
        }
      }
    }
  }
}
```

### Execution

```typescript
const response = await graphqlClient.execute({
  query: gql,
  variables: { categoryId: 17, language: 'NL' },
});

const rootCategory = response?.data?.category;
// rootCategory.categories -> L1 categories
// rootCategory.categories[0].categories -> L2 categories
// etc.
```

When a `user` prop is provided, the component also passes `contactId` (for Contact users) or `customerId` (for Customer users) in the query variables so the API can apply user-specific category visibility rules.
