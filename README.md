# Propeller Next.js E-commerce

A Next.js e-commerce application powered by propeller-sdk-v2, migrated from the React application.

## Features

- 🛍️ Product catalog with categories
- 🛒 Shopping cart functionality
- 👤 User authentication
- 📱 Responsive design with Tailwind CSS
- 🔥 React Hot Toast notifications
- 🎨 Modern UI components

## Tech Stack

- **Next.js 16** with App Router
- **React 19** (React Compiler enabled — do not hand-write `useMemo`/`useCallback` on props)
- **TypeScript** (strict) for type safety
- **Tailwind CSS 4** for styling
- **propeller-sdk-v2** for GraphQL API integration (proxied via `/api/graphql`)
- **React Hot Toast** for notifications

> **Architecture note:** Components are hand-maintained React in `components/propeller/`,
> business logic in `composables/`. There is **no Mitosis and no code generation** — ignore any
> older reference to `.lite.tsx` or an `output/` directory.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your environment variables (already configured)

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── category/          # Category page — hybrid SSR (server shell + CategoryIsland)
│   ├── search/            # Search page — hybrid SSR (server shell + SearchIsland)
│   ├── cluster/           # Cluster page — hybrid SSR (server shell + ClusterDetailIsland)
│   ├── product/           # Product detail page — hybrid SSR (server shell + islands)
│   ├── csr/               # Legacy fully-client copies of the above, for comparison
│   ├── cart/              # Shopping cart page (client)
│   ├── login/             # Authentication pages (client)
│   └── layout.tsx         # Root layout with providers
├── components/            # Host-side components (layout, CMS, UI primitives)
│   ├── layout/           # Layout components (Header, Footer)
│   ├── cms/              # CMS-driven content blocks
│   └── ui/               # Basic UI primitives
│                         # NOTE: the Propeller business components (ProductCard,
│                         # AddToCart, …) and the composables live in the
│                         # propeller-v2-react-ui package, not here.
├── context/              # React context providers (Auth, Cart, Propeller, …)
├── lib/                  # Services, SDK clients, server helpers
│   ├── api.ts            # Client-side GraphQL client (endpoint: /api/graphql proxy)
│   ├── server.ts         # Server-side SDK helpers — getServerInfra / getAnonymousInfra,
│   │                     #   fetchProduct / fetchCategory / fetchSearch / fetchCluster
│   ├── seo.ts            # SEO metadata resolvers (used by generateMetadata)
│   ├── listingParams.ts  # URL-query parser shared by listing pages + islands
│   └── services/         # Service layer (AuthService, MenuService, …)
└── data/                 # config.ts, defaults, countries
```

## Rendering (SSR)

This is a **hybrid SSR app**, not a client SPA. Next.js App Router renders
server-first by default; pages opt into client rendering only where they need
interactivity.

**Server-rendered pages.** Home, blog and CMS pages are Server Components. The
catalog pages — `category`, `search`, `cluster`, `product` — use a *hybrid
SSR* pattern: the `page.tsx` is an async Server Component that fetches data
from the upstream Propeller GraphQL API (via `lib/server.ts`) and renders the
static shell; the interactive parts (filters, grid, configurator, add-to-cart)
live in a `"use client"` **island** seeded with the server-fetched data. The
result: crawlers and a JS-disabled browser see real product content, prices
and SEO metadata in the initial HTML.

- `lib/server.ts` — server-side SDK helpers. `getServerInfra()` reads the auth
  cookie (→ personalised, dynamic render); `getAnonymousInfra()` skips it
  (→ cacheable). `getListingInfra()` picks between them: anonymous requests
  are cacheable (`revalidate`), logged-in requests render fresh.
- `generateMetadata` on the product / category / cluster pages emits per-page
  `<title>`, `<meta description>`, canonical and OpenGraph tags, resolved from
  the backend's localized `metadata*` fields (`lib/seo.ts`).
- `propeller-v2-react-ui/pure` — the package's RSC-safe component entry, used
  to server-render pure display components (`ProductPrice`, `ItemStock`, …)
  without drawing a client boundary.
- **Anonymous SSR data cache.** Catalog GraphQL fetches issued by anonymous
  Server Components carry Next 16 `next: { revalidate: 300, tags: [...] }`
  hints (via the SDK's `GraphQLFetchOptions` slot, v0.11.0+). Logged-in users
  bypass automatically (cookie read → dynamic render). Tag scheme is
  centralised in `tagFor()` (`lib/server.ts`); per-entity busts go through
  `POST /api/revalidate` (gated by `REVALIDATE_SECRET`, body
  `{ "tag": "product:42" }`) so a backend webhook can refresh just the
  affected catalog entries without waiting on the revalidate window. The
  main menu is also pre-fetched server-side (`HeaderServer`) so anonymous
  navigation HTML lands in the initial response.

**Client-rendered pages.** `cart`, `checkout`, `account/*`, and the auth pages
are fully `"use client"` — they are interactive, session-specific surfaces
with no crawl value.

**`/csr` routes.** `app/csr/` holds verbatim fully-client copies of the
category / search / cluster / product pages (the pre-SSR implementation),
reachable at `/csr/...`. They exist purely for side-by-side comparison of
first paint, bundle size and crawlability — not a long-term fixture.

## Environment Variables

Server-side only (read by the `/api/graphql` proxy and route handlers — **never exposed to the
client**, so the API key and GraphQL endpoint stay secret):

- `BOILERPLATE_GRAPHQL_ENDPOINT` - upstream GraphQL API endpoint
- `BOILERPLATE_API_KEY` - API key injected server-side by the proxy
- `BOILERPLATE_ORDER_EDITOR_API_KEY` - order-editor API key
- `BOILERPLATE_BASE_CATEGORY_ID` - root category ID
- `BOILERPLATE_MENU_DEPTH` - menu nesting depth
- `BOILERPLATE_ANONYMOUS_USER_ID` - anonymous user id
- `BOILERPLATE_DEFAULT_LANGUAGE` - default language (NL)
- `JWT_SECRET` - secret for signing/validating the auth cookie

## Key Features Implemented

### Shopping Cart
- Add products to cart
- Update quantities
- Remove items
- Persistent cart in localStorage
- Cart sidebar with slide-in animation
- Full cart page with checkout flow

### Product Catalog
- Category pages with product listings
- Product detail pages with image gallery
- Product cards with add-to-cart functionality
- Responsive grid layouts

### Authentication
- Login/Register pages wired to the Propeller SDK via server route handlers
- Auth token held in an httpOnly cookie (not readable from JS); `/api/graphql` injects the
  Bearer server-side
- User context for authentication state, protected routes, inactivity session timeout

## Migration from React App

This Next.js application is a migration from the existing React application located in `../propeller-react`. Key changes:

1. **Routing**: Migrated from React Router to Next.js App Router
2. **Environment Variables**: Changed from `REACT_APP_*` to `NEXT_PUBLIC_*`
3. **API Calls**: Adapted for Next.js server/client components
4. **State Management**: Maintained React Context for auth and cart
5. **Styling**: Continued with Tailwind CSS

## Development Guidelines

- Keep files under 200-300 lines of code
- Avoid code duplication
- No mocking data for dev/prod environments
- Use TypeScript for type safety
- Follow Next.js best practices for server/client components

## Build for Production

```bash
npm run build
npm start
```

## Translations

UI strings emitted by `propeller-v2-react-ui` components are resolved through `lib/i18n/`. The default provider reads from `locales/<lang>/<Component>.json` (one JSON file per component namespace).

### Editing translations

Edit the relevant `locales/<lang>/<Component>.json`. Keys are slugs the components emit (see existing keys for the slug list). HMR picks up changes immediately during `npm run dev`.

### Adding a new language

1. Create `locales/<new-lang>/` (lowercase ISO 639-1 code, e.g. `de`, `fr`).
2. Copy `locales/en/*.json` into it and translate the values.
3. Run `npm run locales:build` to regenerate `_registry.ts`.
4. The new language is available the next time the app loads.

### Swapping the provider

The file provider is the default. To use a different source (CMS, Tolgee, Lokalise, etc.), implement the `TranslationProvider` interface from `propeller-v2-react-ui` and add a case to `lib/i18n/index.ts`. Set `TRANSLATIONS_PROVIDER=<name>` to activate it.

A provider's `getNamespace(locale, namespace)` returns `Record<string, string>` synchronously. If your source is async (CMS), cache the responses inside the provider and expose a sync `getNamespace` once the cache is warm.

### Reading translations at call sites

- **Server Components** (no `'use client'` directive): `import { getTranslations } from '@/lib/i18n/server'` then `const labels = getTranslations(lang, 'OrderList')`.
- **Client Components**: `import { useTranslations } from '@/lib/i18n/client'` then `const labels = useTranslations('OrderList')`. `<TranslationsProvider>` is mounted at the root layout and reads from `LanguageContext`, so the hook re-renders automatically when language changes.

### Reviewing seeded NL translations

`locales/nl/_review.md` lists slugs translated best-effort during the initial seed. Review and update as needed.

### Package version requirements

- `propeller-v2-react-ui@0.4.2+` — adds `labels?` to several components that previously didn't accept it (`UserDetails`, `OrderItemCard`, `ProductGallery`, `GridFilters`, `ProductGrid`, `GridToolbar`, `PriceToggle`), and adds forwarding props (`productCardLabels?`, `clusterCardLabels?`, `stockLabels?`, `addToCartLabels?`, `priceLabels?`) on `ProductGrid` / `ProductSlider`, plus `loginFormLabels?` on `AccountIconAndMenu`.
- `propeller-v2-core-ui@0.2.2+` — owns the `TranslationProvider` interface (transitively installed via the UI package).

## License

Private - Propeller Commerce
