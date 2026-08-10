# Changelog

All notable changes to the propeller-next boilerplate are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.11.4] - 2026-08-10

### Fixed

- **Cart and checkout showed the same lines on different tax bases.** With the
  header toggle on "Incl. BTW", `/cart` printed € 18,91 for a line that
  `/checkout` printed as € 15,63 — neither labelled (PWP-923). `ItemsOverview`
  never resolved infra from `PropellerProvider`, so it ignored the toggle
  (and silently fell back to `'€'` and no language for surcharges) while
  `CartItem` on the cart page followed it. Fixed in
  `propeller-v2-react-ui` 0.15.4; both components now read the same
  `totalSum` / `totalSumNet` fields. No host change needed —
  `PropellerHostBridge` already supplies `includeTax`.

### Changed

- `@propeller-commerce/propeller-v2-react-ui` → `^0.15.4`.

## [1.11.3] - 2026-08-10

### Fixed

- **The order summary's total did not match its own lines, and ignored the
  payment method.** Two defects, both visible on the cart page and in the
  checkout sidebar (PWP-930):
  - The payment method's transaction costs are part of `total.totalGross` but
    had no line of their own, so a €7.25 order with €49.00 shipping printed a
    "Total excl. VAT" of €56.60. Fixed in `propeller-v2-react-ui` 0.15.3, which
    renders a **Transaction costs** row; `locales/{en,nl}/CartSummary.json` gain
    the matching `transactionCosts` label.
  - Selecting a payment method at step 3 only set local state, so the totals
    kept showing the *previously stored* method's costs and then jumped when
    step 4 loaded. `app/checkout/page.tsx` now persists the method on select
    (skipping the no-op when the cart already carries it).

### Changed

- `@propeller-commerce/propeller-v2-react-ui` → `^0.15.3`.

## [1.11.2] - 2026-08-10

### Fixed

- **The spare-parts (SPL) panel 500'd on every product.** `lib/spl.ts` resolved
  the parts-lookup category from `BOILERPLATE_BASE_CATEGORY_ID` — a variable
  nothing else in the app read — and fell back to `0` when it was unset. Zero is
  not a valid category id, so the hotspot lookup issued a `category` query with
  no usable parameter and the backend rejected the request:
  `GraphQL operation failed (category): At least one lookup parameter must be
  provided: uuid, categoryId, id, or slug`. Both `/api/spl/drawings` and
  `/api/spl/drawing` returned 500; the panel itself mounted fine, so the failure
  looked like an SPL outage rather than a config gap.

  It now calls `resolveBaseCategoryId()` — the same resolver the rest of the app
  uses: explicit `NEXT_PUBLIC_BASE_CATEGORY_ID`, else the channel's
  `catalogRootId`, else the config default. Spare parts therefore follow the
  channel like every other catalog read, and need no environment variable at
  all.

### Removed

- `BOILERPLATE_BASE_CATEGORY_ID` — now read by no code. Dropped from
  `.env.local.example` and the README rather than left as a documented setting
  that silently does nothing. `NEXT_PUBLIC_BASE_CATEGORY_ID` is the single
  (optional) override for both the storefront and the SPL parts lookup.


## [1.11.1] - 2026-08-07

### Fixed

- Cluster configurators spanned by ENUM attributes render their options again
  (via `propeller-v2-core-ui` 0.6.1). The shared attribute extractor read
  `value` for `AttributeEnumValue`, but the schema exposes those on
  `enumValues`, so every ENUM attribute resolved to an empty dropdown. This fix
  was originally prepared as core-ui 0.4.1 but was never published; it is now
  shipped as 0.6.1 and pulled in here.

## [1.11.0] - 2026-08-04

### Added
- Anonymous user id is now derived from the channel at runtime instead of a
  hardcoded config value. `lib/server.ts` reads `channel(channelId)` once
  (cached) and uses its `anonymousUserId` for anonymous catalog/search/machine
  price queries — so guest pricing follows the channel's configured account
  rather than the backend apikey default — and its `catalogRootId` as the
  base-category fallback when `NEXT_PUBLIC_BASE_CATEGORY_ID` is unset. The dead
  `config.anonymousId` / `BOILERPLATE_ANONYMOUS_USER_ID` are removed.

### Changed
- Catalog navigation now paints the `loading.tsx` skeleton instantly on click.
  Three fixes together: `compress: false` + an `X-Accel-Buffering: no` header
  on the catalog routes (`next.config.ts`) stop the streamed skeleton from being
  buffered by gzip/the proxy; `CatalogLoading` renders a static client `Header`
  instead of awaiting the menu, so the shell flushes immediately; and grid /
  slider cards prefetch their destination on hover (`lib/useHoverPrefetch.ts`)
  so the click lands on an already-cached loading shell.

### Fixed
- Cluster configurator now renders options for ENUM-spanned clusters. The
  shared attribute extractor read `value` for `AttributeEnumValue`, but the
  schema exposes those on `enumValues` — every ENUM attribute resolved to an
  empty option list, blocking variant selection and add-to-cart. Arrives via
  the `propeller-v2-react-ui` / `propeller-v2-core-ui` update.

## [1.10.0] - 2026-07-30

### Added
- Instant `loading.tsx` skeletons for the catalog Server-Component shells
  (category / search / cluster / product). Navigation now paints a header +
  content skeleton immediately and streams the page in behind it, instead of
  sitting on the previous page until the new one is fully built.

## [1.9.0] - 2026-07-30

### Added
- OCI + cXML PunchOut (B2B e-procurement), built on magic-token login and the
  `@propeller-commerce/propeller-v2-punchout` package. `/api/punchout/*` routes
  handle the cXML `PunchOutSetupRequest`, the OCI/cXML session entry, and the
  cart transfer back to the ERP. Field mappings are config-driven and
  overridable per deployment; the cXML shared secret is validated against the
  buyer contact's `CXML_SHARED_SECRET` track attribute.

## [1.8.0] - 2026-07-29

### Added
- Magic-token (passwordless) login: `/magic-login?mtoken=` exchanges a
  backend/ERP-issued token for a session, sharing the post-login flow with the
  standard login. Bumps `propeller-v2-react-ui` to 0.10.0.

## [1.7.0] - 2026-07-29

### Changed
- Aligned with propeller-sdk-v2 0.14.0 (deprecated-surface removal: pluralised
  Category name/slug fields, `.class` → `.type`, `ClusterConfigSetting`
  `attributeName`/`uuid`). Bumps `propeller-v2-react-ui` to 0.9.0.

## [1.6.0] - 2026-07-28

### Added
- SpareParts Live PDP panel (`propeller-v2-spl`): interactive drawing tree with
  pan/zoom hotspots and product cards, localized and themed to the storefront.
- Spare-parts machines section (`/machines`): a contact-only browser over the
  company's installed machines, gated behind auth.

## [1.5.0] - 2026-07-24

### Added
- Prepr CMS: preview (draft mode), data-collection tracking pixel, visitor
  personalization / segments, A/B-test preview bar, and a publish → cache
  revalidation webhook (`/api/cms-revalidate`). All Prepr wiring is gated on
  `CMS_PROVIDER=prepr`, so Strapi / Contentful / none builds are unaffected.
- CMS block type `card-actions`; Hero `description` + adaptive `variantKey`.

### Changed
- CMS provider interface gains locale / preview / personalization options;
  the Prepr provider tags anonymous published reads for surgical revalidation.
- Blog post route and CMS catch-all render on-demand; the catch-all now reserves
  the `home` / `blog` slugs so a CMS page can't collide with an app route.

## [1.4.0] - 2026-07-20

### Added
- Dutch (NL) i18n coverage across account, checkout, layout, blog and static
  pages; enum labels, pluralisation and placeholder translations.
- Unmatched paths return a branded 404 instead of a raw 500.

### Fixed
- Repair sessions that silently degraded to anonymous.
- Listing pages ignore tracking / unknown query params.

## [1.3.0] - 2026-07-08

### Added
- MultiSafepay (MSP) payments via `@propeller-commerce/propeller-v2-msp`,
  behind the provider-agnostic checkout (`PAYMENT_PROVIDER`).

### Changed
- Bumped propeller-sdk-v2 to 0.12.0 and the UI packages to match.

## [1.2.0] - 2026-06-30

### Added
- Mollie PSP payments (`@propeller-commerce/propeller-v2-mollie`): hosted
  payment page, webhook + return handling, and order status resolved from the
  authoritative backend order.

### Fixed
- Removed the `SDK_LOCAL` leak from the public env example; `.npmrc` gitignored.

## [1.1.0] - 2026-06-25

### Added
- Contentful CMS provider (hosted headless CMS), selectable at runtime via
  `CMS_PROVIDER=contentful`.
- Payment-method / carrier logos (SDK 0.11.3).

## [1.0.0] - 2026-06-10

First public release of the Next.js boilerplate.

### Added
- Hybrid SSR catalog (category / search / cluster / product) with anonymous
  fetch caching and per-entity cache tags.
- Consumes the published Propeller UI packages and SDK.
- Public GitHub mirror with CI-driven releases.
