---
name: propeller-composable-components
description: Guide for the Propeller UI component packages (propeller-v2-react-ui / propeller-v2-vue-ui) consumed by the nextDemo and vue-boilerplate apps. Use when adding features, fixing bugs, or creating components/composables in the package src/, or wiring them into the apps.
version: 2.0.0
tags: [propeller, composables, react, vue, cart, products, components, package]
---

# Propeller UI Component Packages

The UI was extracted out of the apps into **standalone packages** (FE hardening refactor). This skill maps the current architecture — where code lives, how the React & Vue packages mirror each other, and how to add features correctly.

## Where the code lives (4 repos in `c:\workspace`)

| Repo | Role |
|---|---|
| `propeller-v2-react-ui-gitlab` | **React package SOURCE** — components in `src/components/*.tsx`, hooks in `src/composables/react/`, shared utils in `src/composables/shared/`. GitLab origin. **No `node_modules` by default** (run `npm install` to typecheck/build). |
| `propeller-v2-vue-ui-gitlab` | **Vue package SOURCE** — `src/components/*.vue`, `src/composables/vue/`, `src/composables/shared/`. Mirrors the React package. |
| `nextDemo` | React APP. Consumes `propeller-v2-react-ui` via `github:...#master`. App pages in `app/`, host glue in `components/layout/PropellerHostBridge.tsx`. |
| `vue-boilerplate/frontend` | Vue APP. Consumes `propeller-v2-vue-ui` via `github:...#master`. `providePropeller(infra)` in `src/App.vue`. |

- **Component/composable fixes go in the gitlab PACKAGE repos**, not the apps. The old `nextDemo/components/propeller/` and `nextDemo/composables/react/` directories are GONE.
- **React ⇄ Vue parity:** nearly every change applies to BOTH packages (`.tsx` + `.vue`, shared `formatting.ts`/`labelHelpers.ts`/`usePagination.ts`). When you fix one, fix the other.
- **PUBLISH LAG:** package edits aren't visible to the apps until GitLab→GitHub mirror + app `npm install` re-resolves `#master`. A new package export makes the app `tsc` fail (`no exported member`) until published — expected. See memory `package-multirepo-workflow`.
- **Public source:** package comments must NOT name internal projects (`playground-v2`, `nextDemo`, cross-package "mirror"). See memory `public-package-comment-policy`.

## Composable Catalog (`src/composables/react|vue/`)

| Composable | Covers |
|---|---|
| `useCart` | Cart CRUD, addItem, updateQuantity, deleteItem, actionCodes, processCart, requestAuthorization, checkoutAllowed, getMinQuantity/getStep |
| `useProductSearch` | Product/cluster search, filters, pagination, price bounds |
| `useOrders` | Order/quote listing, pagination, channelIds filter |
| `useAuth` | Login, register (contact/customer/company), logout, forgot/reset password |
| `useCompany` | Company fetch, PAC CRUD, pending carts, acceptCartRequest |
| `usePurchaseAuthorization` | Fetch PAC contacts, create/update/delete PAC entries |
| `useAddress`, `useFavorites`, `useMenu`, `useProductInfo`, `useProductSlider`, `useProductBundles`, `useProductSpecs`, `useClusterConfigurator` | as named |

React composables use `useState`/`useCallback`/`useMemo`; Vue use `ref`/`computed`. Both expose the same `UseXxxReturn` interface.

## Adding a prop/feature

1. Add the prop to the `Props` interface in `src/components/ComponentName.tsx` AND `.vue`.
2. New data/service calls → add the method to `src/composables/react/useXxx.ts` AND `src/composables/vue/useXxx.ts`, AND to the `UseXxxReturn` interface + return. **Keep the interface signature as loose as the implementation** (e.g. `(product: Product | null | undefined)`, not `(product: Product)`) — a stricter interface than impl was a CI build failure.
3. Wire in JSX/template.
4. Typecheck in the PACKAGE repo: `npm install` (if needed) then `npm run typecheck` (React `tsc --noEmit` / Vue `vue-tsc -b`). Reading-only verification misses type errors.

## Infra from the provider, not props

`currency` / `includeTax` / `language` / `user` / `companyId` are fed into the provider by the host (nextDemo `PropellerHostBridge.tsx`; vue `App.vue` `providePropeller`). Components resolve them via **`useInfraProps`** (React) / `useInfraProps` in a `computed` (Vue) rather than taking explicit props — so app call sites pass only domain data (`cart`, `order`, …). Explicit props still win as overrides. EXCEPTION: `@rsc-safe`/`/pure` display components (ProductPrice, ProductBulkPrices, GridTitle, …) can't read the client provider — they take `currency`/etc. as explicit props from the host.

## Key patterns

- **Contact vs Customer guard:** `const isContact = props.user && 'contactId' in props.user;` (quote/authorization UI is contact-only).
- **Price formatting:** use the shared helper, never hardcode `€` or a local formatter: `formatPrice(value, { symbol: props.currency ?? '€' })` from `../composables/shared/utils/formatting`. It's nl-NL locale-aware (`€ 9,50`). Apps that can't reach it (PDP `/pure` components) get `currency` from `config.currency` / `configuration.currency`.
- **Labels:** `getLabel(props.labels, key, fallback)` from `../composables/shared/utils/labelHelpers` — don't redefine.
- **Service instantiation:** composables call `createServices(graphqlClient)` (NOT the old `getServices`, NOT `new XxxService()`).
- **processCart for quotes:** `await processCart('REQUEST')` (quote) vs `'COMPLETE'` (order).
- **PAC:** `checkoutAllowed` (from `useCart`) is `false` when a contact-purchaser's cart exceeds their authorization limit → show "Request Authorization" instead of checkout.

## Reference behavior source

playground-v2 (`c:\wamp64\www\playground-v2`, WordPress `propeller-ecommerce-v2`) is the behavioral reference for cart/order/surcharge/bonus features — derive logic from it, but NEVER name it in public package comments.

## Quick file reference (package source)

| What | Path (in `propeller-v2-react-ui-gitlab/`) |
|---|---|
| Cart summary / sidebar / item | `src/components/CartSummary.tsx`, `CartIconAndSidebar.tsx`, `CartItem.tsx` |
| Bonus items (cart / order) | `src/components/CartBonusItems.tsx`, `OrderBonusItems.tsx` |
| Grid filters / toolbar | `src/components/GridFilters.tsx`, `GridToolbar.tsx` |
| Product card / grid / videos | `src/components/ProductCard.tsx`, `ProductGrid.tsx`, `ProductVideos.tsx` |
| React useCart | `src/composables/react/useCart.ts` |
| Shared format/label/pagination | `src/composables/shared/utils/{formatting,labelHelpers}.ts`, `src/composables/react/shared/usePagination.ts` |
| Barrel export | `src/index.ts` (add new components here) |

Vue equivalents live at the same paths under `propeller-v2-vue-ui-gitlab/src/` (`.vue` components, `src/composables/vue/`).

## App-side surfaces (nextDemo)

| What | Path |
|---|---|
| Cart page | `app/cart/page.tsx` |
| Checkout page | `app/checkout/page.tsx` |
| Thank-you / order detail / quotes | `app/checkout/thank-you/[orderId]/`, `app/account/orders/[id]/`, `app/account/quotes/[id]/` |
| GraphQL proxy + CSP | `proxy.ts` (CSP `frame-src` must allow youtube/vimeo for ProductVideos) |
| localStorage cart serializer | `utils/cartHelpers.ts` `serializeCart` — FIELD ALLOWLIST; new Cart fields (e.g. `bonusItems`) must be added or they're dropped |
