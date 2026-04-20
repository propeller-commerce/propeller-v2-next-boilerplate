---
name: e2e-playwright
description: Guide for the Playwright E2E test suite that covers propeller-vue (the Vue mirror of this project). Use when running tests, investigating failures, adding test cases, or fixing Vue component bugs discovered by tests.
version: 1.0.0
tags: [playwright, e2e, testing, vue, propeller]
---

# Playwright E2E — propeller-vue test suite

The E2E tests live in the **Vue** project, not here. This skill covers how to run them and the critical bugs discovered during the build.

**Test location:** `D:/laragon/www/propeller-vue/e2e/`
**Run from:** `D:/laragon/www/propeller-vue/`

## Quick start

```bash
cd D:/laragon/www/propeller-vue
npx playwright test                          # full suite
npx playwright test --ui                     # visual debug mode
npx playwright test --project=anonymous      # anonymous tests only
npx playwright test --project=setup-contact  # re-generate auth state
npx playwright show-report                   # last HTML report
```

## Results

- **85 pass** / **32 skip** / **0 fail** (as of 2026-04-19)
- 3 test projects: anonymous (41), contact (33), customer (11)
- 32 skips are intentional (cluster products, empty test data, etc.)

## Auth accounts

| Role | Email | Password |
|---|---|---|
| Contact | d.krstev@propel.us | darko000 |
| Customer | j.pardijs@propel.us | Test123123 |

Auth is **localStorage-based**. Setup fixtures produce `e2e/storage-state/*.json` files.

## Critical Vue bugs found during E2E build

### Boolean prop casting (most common)

Vue 3 casts absent optional `boolean` props to `false`. Mitosis pattern `v-if="showX !== false"` fails.

**Fix:** Add `withDefaults` to any Vue component with optional boolean props:

```javascript
const props = withDefaults(defineProps<MyProps>(), {
  showImage: true,
  allowAddToCart: true,
});
```

`withDefaults` is a compiler macro — no import needed.

**Components already fixed:** ProductCard, ClusterCard, AddToCart, ItemStock, CartItem, ProductInfo,
ProductTabs, ProductGallery, Breadcrumbs, CartIconAndSidebar, LoginForm, CartSummary.

**Symptom when broken:** Component renders empty — only `<!--v-if-->` comments visible in source.

### networkidle never resolves

Use `waitForLoadState('domcontentloaded')` everywhere. Vue SPA with GraphQL polling never reaches idle.

### AccountIconAndMenu needs `variant="sidebar"`

`src/views/account/AccountView.vue` must pass `variant="sidebar"` to render nav buttons (Orders, Addresses, etc.)

### Missing SDK exports in api.ts

All SDK services (`cartService`, `categoryService`, `orderService`) must be exported from `src/lib/api.ts`.
Missing exports silently give `undefined` at runtime.

## When you fix a component in propeller-next

Per the Vue sync rule: mirror the fix to `D:/laragon/www/propeller-vue/src/components/propeller/`.
Then run `npx playwright test` in propeller-vue to verify nothing breaks.
