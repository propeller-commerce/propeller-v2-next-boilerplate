---
name: propeller-composable-components
description: Guide for working with the Propeller Next.js composable architecture. Use when adding features, fixing bugs, or creating new components in the components/propeller/ directory, or when working with composables in composables/react/ and composables/vue/.
version: 1.0.0
tags: [propeller, composables, react, vue, cart, products, components]
---

# Propeller Composable Components

This skill guides you through the Propeller Next.js project's composable architecture — how components are structured, where logic lives, and how to add features correctly.

## Architecture Overview

```
components/propeller/         ← Edit these. Source of truth for features.
composables/react/            ← React hooks (useCart, useOrders, useAuth, …)
composables/vue/              ← Vue composables (mirrors of react/)
composables/shared/           ← Shared types and utilities
output/react/ui-components/   ← Compiled Mitosis output. Do NOT edit.
output/vue/ui-components/     ← Compiled Mitosis output. Do NOT edit.
ui-components/*.lite.tsx      ← Mitosis source. Dropped — do NOT edit.
```

**Rule:** All fixes and features go in `components/propeller/` only. Never touch `output/` files.

## Composable Catalog

| Composable | Covers |
|---|---|
| `useCart` | Cart CRUD, addItem, updateQuantity, deleteItem, actionCodes, processCart, requestAuthorization, checkoutAllowed |
| `useProductSearch` | Product/cluster search, filters, pagination, price bounds |
| `useOrders` | Order/quote listing, pagination, channelIds filter |
| `useAuth` | Login, register (contact/customer/company), logout, forgot/reset password |
| `useCompany` | Company fetch, PAC CRUD, pending carts, acceptCartRequest |
| `usePurchaseAuthorization` | Fetch PAC contacts, create/update/delete PAC entries |
| `useAddress` | Fetch/create/update/delete addresses |
| `useFavorites` | Favorites lists CRUD, add/remove products |
| `useMenu` | Navigation menu fetch |
| `useProductInfo` | Single product details, cross-upsells |
| `useProductSlider` | Slider product fetch |
| `useProductBundles` | Bundle products, add bundle to cart |
| `useProductSpecs` | Product specifications/attributes |
| `useClusterConfigurator` | Cluster configuration and selection |
| `useProductSpecs` | Product attribute fetch and grouping (used by ProductTabs) |

## How Components Use Composables

Each `components/propeller/` component instantiates composables at the top:

```tsx
function ProductGrid(props: ProductGridProps) {
  const { products, loading, search } = useProductSearch({
    graphqlClient: props.graphqlClient!,
    user: props.user ?? null,
    configuration: props.configuration,
  });
  // … JSX only references composable state
}
```

React composables use `useState`/`useCallback`/`useMemo`. Vue composables use `ref`/`computed`. Both expose the same interface.

## Adding a New Prop/Feature

1. **Add prop to the `Props` interface** in `components/propeller/ComponentName.tsx`
2. **If it needs new data fetching/service calls** — add the method to both `composables/react/useXxx.ts` AND `composables/vue/useXxx.ts`
3. **Wire it in the component JSX** — read from props or composable state
4. **TypeScript check:** `npx tsc --noEmit` — should be zero errors in React files

### Example: Adding a new prop to CartSummary

```tsx
// 1. Add to interface
export interface CartSummaryProps {
  showNewFeature?: boolean;
}

// 2. Use in JSX (no composable needed for display-only)
{props.showNewFeature ? <div>...</div> : null}
```

### Example: Adding a new composable method

```ts
// composables/react/useCart.ts — add to UseCartReturn interface:
cancelCart: () => Promise<{ success: boolean; error?: string }>;

// add implementation:
const cancelCart = useCallback(async (): Promise<...> => {
  if (!cartId) return { success: false, error: 'No cart' };
  try {
    const service = new CartService(graphqlClient);
    await service.cancelCart({ id: cartId });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed' };
  }
}, [graphqlClient, cartId]);

// add to return statement
return { ..., cancelCart };
```

Mirror the same in `composables/vue/useCart.ts` using `async function` (not `useCallback`).

## Key Patterns

### Contact vs Customer guard
Only show certain UI (request quote, request authorization) to contacts, not customers:
```tsx
const isContact = props.user && 'contactId' in props.user;
```

### Price formatting
```tsx
function formatItemPrice(price: number): string {
  if (props.formatPrice) return props.formatPrice(price);
  return '€' + Number(price || 0).toFixed(2);
}
```

### Labels / i18n
All user-visible strings go through a `getLabel(key, fallback)` pattern:
```tsx
function getLabel(key: string, fallback: string): string {
  return props.labels?.[key] || fallback;
}
```

### Cart processCart for quotes
```tsx
// Submit cart as quote (orderStatus: 'REQUEST')
const { processCart } = useCart({ graphqlClient, user, cartId });
await processCart('REQUEST');
// Submit as normal order
await processCart('COMPLETE');
```

### PAC / Purchase Authorization
`checkoutAllowed` (from `useCart`) is `false` when a contact-purchaser's cart total exceeds their authorization limit. When `false`, show "Request Authorization" button instead of checkout.

## Sync Between React and Vue Composables

When you add a method to `composables/react/useXxx.ts`, always mirror it in `composables/vue/useXxx.ts`:
- React: `const myMethod = useCallback(async (...) => { ... }, [deps])`
- Vue: `async function myMethod(...) { ... }` (plain async function, no useCallback)
- Both: add to `UseXxxReturn` interface and return statement

## Composable conversion complete

As of 2026-04-16, **all** `components/propeller/` components use composables — zero inline `new XxxService()` calls remain. When adding new components, always instantiate the relevant composable at the top of the function body.

## Merging develop → feature/composables

When new features land in `develop` that need to be brought into `feature/composables`:
1. Commit any uncommitted composable changes first
2. `git merge develop --no-commit --no-ff`
3. For `output/` conflicts: `git checkout --theirs output/...`
4. For `components/propeller/` conflicts: keep composable-based structure, integrate new props/fixes from develop
5. For `package-lock.json`: `git checkout --theirs package-lock.json`
6. Run `npx tsc --noEmit` — fix any React errors (Vue "Cannot find module 'vue'" is expected/pre-existing)

## File Locations Quick Reference

| What | Path |
|---|---|
| Cart component | `components/propeller/CartSummary.tsx` |
| Cart sidebar | `components/propeller/CartIconAndSidebar.tsx` |
| Product grid | `components/propeller/ProductGrid.tsx` |
| Product card | `components/propeller/ProductCard.tsx` |
| Checkout page | `app/checkout/page.tsx` |
| Cart page | `app/cart/page.tsx` |
| React useCart | `composables/react/useCart.ts` |
| Vue useCart | `composables/vue/useCart.ts` |
| Shared cart types | `composables/shared/types/cart.types.ts` |
| Cart init utility | `composables/shared/utils/cartInit.ts` |
