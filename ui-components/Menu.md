# Menu

A modular navigation component that renders a category hierarchy based on a given `categoryId`. It fetches category data using the Propeller SDK via the provided `graphqlClient` and displays a structured menu up to a configurable depth.

The component supports two layout styles: **dropdown-vertical** (nested flyout panels on hover) and **jumbotron** (full-width mega-menu panel). It is language-aware and adapts category labels accordingly.

User interactions are handled via the `onMenuItemClick` callback, allowing the parent application to control routing behaviour. The component is reusable across header navigation, sidebar menus, and mega-menu implementations.

**Source:** `ui-components/Menu.lite.tsx`
**Compiled React:** `output/react/ui-components/Menu`
**Compiled Vue:** `output/vue/ui-components/Menu`

---

## Usage

### Minimal — dropdown in a header

```tsx
import Menu from '@/components/propeller/Menu';
import { graphqlClient } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { config } from '@/data/config';

const router = useRouter();

<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category))
  }
/>
```

### Jumbotron / mega-menu style

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  menuStyle="jumbotron"
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category))
  }
/>
```

### Custom URL format

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  menuLinkFormat="shop/{slug}-c{categoryId}"
  onMenuItemClick={(category) =>
    router.push(`/shop/${slug}-c${category.categoryId}`)
  }
/>
```

### Sidebar menu with custom class

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  menuClass="border rounded-lg bg-white shadow-sm"
  className="w-64"
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category))
  }
/>
```

### With caching for anonymous users only

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  cacheEnabled={!authState.isAuthenticated}
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category))
  }
/>
```

> **Important:** Always disable caching for logged-in Propeller users.
> Authenticated users may see different category visibility or pricing,
> so they should always get fresh data. Pass `cacheEnabled={!isAuthenticated}`
> to ensure the cache is only used for anonymous visitors.

### Fully localised (Dutch)

```tsx
<Menu
  graphqlClient={graphqlClient}
  categoryId={17}
  language="NL"
  labels={{
    loading: 'Menu laden...',
    error: 'Menu kon niet geladen worden',
    empty: 'Geen categorieën gevonden',
  }}
  onMenuItemClick={(category) =>
    router.push(config.urls.getCategoryUrl(category))
  }
/>
```

---

## Props

### Required

| Prop | Type | Description |
|---|---|---|
| `graphqlClient` | `GraphQLClient` | Initialised Propeller SDK GraphQL client |
| `categoryId` | `number` | Base category ID — root of the menu tree |
| `language` | `string` | Language code for category names and slugs (e.g. `'NL'`, `'EN'`) |
| `onMenuItemClick` | `(category: Category) => void` | Called when a menu item is clicked. Use for SPA routing |

### Optional

| Prop | Type | Default | Description |
|---|---|---|---|
| `depth` | `number` | `3` | Maximum nesting depth of the category hierarchy |
| `menuClass` | `string` | — | CSS class for the inner menu container (`<nav>` element) |
| `menuStyle` | `string` | `'dropdown-vertical'` | Layout variant: `'dropdown-vertical'` or `'jumbotron'` |
| `menuLinkFormat` | `string` | `'category/{categoryId}/{slug}'` | URL pattern with `{categoryId}` and `{slug}` placeholders |
| `labels` | `Record<string, string>` | — | Override UI strings. See labels table below |
| `cacheEnabled` | `boolean` | `false` | Enable localStorage caching for the menu tree. Useful for anonymous users to avoid re-fetching on every page load |
| `cacheDuration` | `number` | `43200000` (12h) | Cache duration in milliseconds. Only used when `cacheEnabled` is `true` |
| `className` | `string` | — | CSS class applied to the root `<div>` |

---

## Labels

| Key | Default value | Shown when |
|---|---|---|
| `loading` | `'Loading menu...'` | Categories are being fetched |
| `error` | `'Failed to load menu'` | The API call failed |
| `empty` | `'No categories found'` | The root category has no subcategories |

---

## Layout styles

### `dropdown-vertical` (default)

Renders a vertical list of top-level categories. On hover, subcategories appear as flyout panels to the right, up to 3 levels deep. This is suitable for header navigation bars where the menu appears below a trigger button.

```
┌─────────────────┐
│ Computers       │ → ┌─────────────────┐
│ Peripherals     │   │ Keyboards       │ → ┌─────────────────┐
│ Networking      │   │ Mice            │   │ Wireless        │
│ ...             │   │ Monitors        │   │ Wired           │
└─────────────────┘   │ ...             │   │ Ergonomic       │
                      └─────────────────┘   └─────────────────┘
```

### `jumbotron`

Renders top-level categories as horizontal tabs. The active tab reveals a full-width panel with subcategories arranged in a responsive grid (2–4 columns). Level 3 items are listed below each level 2 heading. Suitable for mega-menu implementations.

```
[ Computers ] [ Peripherals ] [ Networking ] ...
┌──────────────────────────────────────────────────────┐
│  Keyboards        Mice            Monitors           │
│  ├ Wireless       ├ Gaming        ├ 4K              │
│  ├ Mechanical     ├ Ergonomic     ├ Ultrawide        │
│  └ Compact        └ Trackballs    └ Curved           │
└──────────────────────────────────────────────────────┘
```

---

## Internal behaviour

### Data fetching
- Uses `graphqlClient.execute()` with a recursive GraphQL query to fetch the full category tree up to the configured `depth`
- Fetches on mount and re-fetches when `graphqlClient`, `categoryId`, or `language` props change
- Filters out categories with missing names or slugs

### Caching (`cacheEnabled: true`)
- Stores the fetched category tree in `localStorage` under key `propeller_menu_{categoryId}_{language}`
- On fetch, checks cache first — if valid (not expired), uses cached data instantly without an API call
- Cache expires after `cacheDuration` ms (default 12 hours)
- Expired entries are removed automatically
- Switching language fetches and caches separately per language
- **Must be disabled for logged-in users** — pass `cacheEnabled={!isAuthenticated}` from the parent. Authenticated users may have different category visibility or pricing

### Hover state
- `dropdown-vertical`: tracks hovered L1 and L2 category IDs to show/hide flyout panels
- `jumbotron`: tracks hovered L1 to show the mega panel; L2/L3 are always visible in the panel
- Hovering a new L1 resets the L2 hover state

### URL generation
- Builds URLs by replacing `{categoryId}` and `{slug}` in the `menuLinkFormat` template
- Prepends a `/` to the result
- When `onMenuItemClick` is provided, `e.preventDefault()` is called and the callback handles routing

### CSS classes
- Root: `propeller-menu` + optional `className`
- Dropdown nav: `propeller-menu-dropdown` + optional `menuClass`
- Jumbotron nav: `propeller-menu-jumbotron` + optional `menuClass`
