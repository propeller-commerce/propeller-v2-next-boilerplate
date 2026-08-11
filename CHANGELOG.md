# Changelog

All notable changes to the propeller-next boilerplate are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.11.13] - 2026-08-11

### Fixed

- **Login sometimes stopped on "Already logged in" instead of the dashboard.**
  Two independent causes. `afterLogin` awaited the whole post-login sequence
  (session cookie, active-cart fetch, anonymous-cart merge) before redirecting,
  but dispatched `userLoggedIn` a third of the way in — so `AuthContext` flipped
  `isAuthenticated` while the cart work was still running, and the page swapped
  to the already-signed-in branch before `router.push` ran. Whichever finished
  first won, which is why it was intermittent; an anonymous cart to merge made
  it likelier. Separately, a user whose `primaryLanguage` differed from the
  active one hit `setLanguage`, which navigates — reloading `/login` and
  discarding the redirect every time.

  The login page now redirects when a visit that started signed *out* becomes
  authenticated. The "Already logged in" screen is unchanged for someone who
  opens `/login` while signed in.

- **A language switch during login could abort the cart merge.** `setLanguage`
  calls `window.location.assign`, and all three login paths called it *before*
  `fetchActiveCart` / `mergeAnonymousCart` / `deleteCart` — so the anonymous
  cart could be left unmerged or undeleted when the navigation won the race. The
  switch now runs last, after the cart is saved.

### Changed

- `setLanguage(language, targetPath?)` takes an optional unprefixed path, so
  login can switch language and land on the dashboard in one navigation instead
  of reloading the login page.

## [1.11.12] - 2026-08-11

### Fixed

- **Quick order could add products from outside the shop's catalogue.** Both the
  row typeahead and the XLSX upload resolved codes through the flat `products`
  resolver, which ignores catalog and orderlist scoping server-side — so quick
  order surfaced products the category grid and the search preview correctly
  hid. Fixed in react-ui 0.15.8, which routes the search through
  `category.getCategory` over a base category with `userId` / `companyId` /
  `applyOrderlists`, the same path `ProductGrid` and `SearchBar` use. The page
  now passes `baseCategoryId` (via `useBaseCategoryId()`) so the search is
  scoped; codes outside the catalogue are reported as missing instead of being
  added.

### Changed

- `@propeller-commerce/propeller-v2-react-ui` → `^0.15.8`.

## [1.11.11] - 2026-08-11

### Fixed

- **A free bonus item showed its list price on the thank-you page.** It read
  € 0,00 in the cart and at checkout, then reappeared at e.g. € 2,77 on the
  order confirmation and in order details. The API models a bonus as two order
  lines — the product line at its list price, plus a sibling `incentive` line
  carrying the negative delta and pointing back via `parentOrderItemId` — and
  `OrderBonusItems` rendered only the product line. Fixed in react-ui 0.15.7
  (via `getNettedBonusItems()` in core-ui 0.6.2), which nets each bonus against
  its incentive siblings; partial discounts keep their remainder. Order totals
  were already correct — this was display-only. Consumed here by pinning
  react-ui `^0.15.7`.

## [1.11.10] - 2026-08-10

### Fixed

- **The last package strings that stayed English on a Dutch page.** react-ui
  0.15.6 makes them overridable; this supplies the keys so they follow the
  language switcher.

  - `CategoryDescription` — the Read more / Read less toggle, in a new
    namespace. The visible one: the component truncates at 200 characters by
    default, so any category with a longer description showed an English
    toggle regardless of language.
  - `ProductTabs` — the same two keys, which the package forwards to
    `ProductDescription`.
  - `Machines` — the loading and empty states.
  - `RegisterForm` — the account-type validation message.
  - `AccountIconAndMenu` — the greeting, via a `{name}` placeholder so the
    translation controls word order.
  - Both authorization components — the modal close button's accessible name.

### Changed

- `@propeller-commerce/propeller-v2-react-ui` → `^0.15.6`.
- The two dashboard card titles are capitalised.

## [1.11.9] - 2026-08-10

### Fixed

- **Six pages ignored the `/en` prefix.** 1.11.8 made the proxy forward the
  URL's locale as `x-cms-locale`, but the home page, both blog pages and the
  CMS catch-all still read `preferred_language` on its own — so `/en/blog`
  carrying a Dutch cookie server-rendered Dutch, and the language a page
  fetched its data with could disagree with the language the client (which
  reads the URL) rendered around it. That divergence is what made a category
  description vanish while its heading stayed in the other language.
  `resolveRequestLanguage()` is now exported from `lib/server.ts` and is the
  single resolver for every server render — prefix, then cookie, then default.
  `app/layout.tsx`, `not-found` and `terms-conditions` had the same order
  inlined three times over; they now call it too.

### Tests

- `e2e/tests/anonymous/12-language-prefix.spec.ts` covers both halves of the
  contract against the *server* response: a prefixed URL outranks a stale
  cookie, and an unprefixed one keeps the stored preference.

## [1.11.8] - 2026-08-10

### Fixed

- **The site could not be browsed in English.** Selecting EN re-rendered the
  current page, but any navigation reverted to Dutch. The proxy reset
  `preferred_language` to the default on every unprefixed request, so the
  choice survived exactly one page; `LanguageContext` wrote only to
  localStorage, which Server Components cannot read; the client snapshot read
  the URL alone and so reported the default on unprefixed paths; and the mount
  effect synced storage from the URL unconditionally, overwriting the
  preference on each navigation. Unprefixed requests now leave the cookie
  alone, the choice is mirrored into it, and both client and server resolve
  the same order — a prefixed URL wins (forwarded as `x-cms-locale` on both
  proxy branches), else the cookie, else the default.

- **Terms & conditions was half translated.** The heading came from
  `StaticPages` but all eight body sections were hardcoded English. They now
  come from the same namespace, with Dutch copy added.

- **Auth-flow strings stayed English on a Dutch page.** The login failure
  message needed the `invalidCredentials` label the app never supplied. The
  submit buttons on login, register and forgot-password, plus that page's
  title and success message, are package *props* rather than label keys, so
  passing `labels` alone left them English — they are now fed from the same
  namespace. Adds the `accountMenuTitle` key the package reads.

- **Remaining untranslated surfaces**: the PunchOut cart notice and transfer
  button (no `useTranslations` at all), the CSR search heading, and the
  machines page title and card CTA (new `Machines` namespace).

- `<html lang>` was always `en`, including when serving Dutch.

### Known gaps (require a package change)

`CategoryDescription` / `ProductDescription` ("Read more" / "Read less"),
`MachineGrid` ("Loading…", "No machines found."), `RegisterForm` ("Please
select an account type." and the raw server error) and `AccountIconAndMenu`
(the "Hi, " greeting) have no label key or prop to override them.

## [1.11.7] - 2026-08-10

### Fixed

- **Switching to a language with partial translations emptied the category
  menu** (PWP-927). `fetchMenu` asked for `names(language: $language)` /
  `slugs(language: $language)`, so a category with no entry for that language
  came back with empty arrays — and `mapRawMenuCategory`'s "fall back to the
  first translation" then had nothing to fall back to. Those categories rendered
  with a blank label and an empty slug: present in the DOM, invisible and
  unclickable. Verified against the API: of 7 top-level categories, 2 return
  `names: []` in EN.

  Both localized fields are now fetched unfiltered and the mapper picks the
  active language, falling back to whichever translation exists, so an
  untranslated category keeps its (Dutch) name instead of vanishing. `$language`
  is gone from the query signature — an unused GraphQL variable is a validation
  error — and still selects the translation and keys the cache.

### Changed

- `@propeller-commerce/propeller-v2-react-ui` → `^0.15.5`, which fixes the same
  bug on the client-side fallback path (`useMenu`).

## [1.11.6] - 2026-08-10

### Fixed

- **Users no longer have to clear their browser storage after a release**
  (PWP-912). Two unrelated causes, fixed two different ways:
  - *Stale caches.* `useMenu` persists the category tree under
    `propeller_menu_*` with a 12h TTL and no idea which build wrote it, so a
    deploy that changed the catalog left the old menu on screen for up to half a
    day. The new `lib/clientStorage.ts` stamps the build into `localStorage` and
    drops cache keys written by a previous one, before any provider reads
    storage. Only refetchable data is ever purged — carts, sessions and the
    active company are left alone, since wiping those every release would be a
    worse bug than the one being fixed.
  - *Shape drift.* `cart` and `selected_company` were read back with a bare
    `as Cart` / `as Company` type assertion — no runtime validation — so an
    object written by an older build was handed to code that dereferenced fields
    it no longer had. Both now validate the shape on read and discard only what
    genuinely doesn't match (the pattern `AuthContext` already used for its
    `user` hint), so shapes self-heal on any release with no version constant to
    remember to bump. A rejected cart is evicted rather than re-parsed on every
    page load.
- The orphaned `menuData` key — written by `lib/services/MenuService.ts`, which
  1.11.5 deleted — is now removed from returning users' browsers.

### Added

- `NEXT_PUBLIC_APP_VERSION`, injected by `next.config.ts` from
  `NEXT_PUBLIC_BUILD_ID` → `CI_COMMIT_SHORT_SHA` → the package version. The CI
  sha is preferred because it changes on every deploy; a scaffolded shop may
  never bump its package version, and a stamp that never changes purges nothing.
- `e2e/tests/anonymous/11-stale-storage.spec.ts` — seeds storage from a
  fictional older build via an init script (so it lands before app modules
  evaluate) and asserts the stale menu is dropped, a current-build cache is
  kept, `menuData` is removed, and a drifted cart / company is discarded without
  a page error.

## [1.11.5] - 2026-08-10

### Fixed

- **"Failed to load menu" on every client-only page** (PWP-913, reported on
  `/machines`). The catalog root category is meant to come from the channel:
  `resolveBaseCategoryId()` returns `NEXT_PUBLIC_BASE_CATEGORY_ID` when set,
  otherwise `channel(...).catalogRootId`. Only the server called it. Client
  components guessed instead — `Header` with
  `process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '1'`, `HomeFallback` with its own
  `|| '17'`. With the env unset (the intended default) the header asked for
  `category(categoryId: 1)`, the API answered `CATEGORY_NOT_FOUND`, and `<Menu>`
  rendered its error state.

  Server-rendered pages were unaffected because `HeaderServer` resolves the id
  and passes the tree down as a prop; the ~12 pages that render `<Header />`
  directly — `/machines`, `/cart`, `/checkout`, … — all fell through to the
  client fetch and broke. `/machines` is simply where it was noticed.

  The root layout now resolves the id once and seeds it through the new
  `BaseCategoryProvider`, the same way it already seeds price and language.

### Changed

- `config.baseCategoryId` is `number | undefined` — the env override only, no
  literal default. `resolveBaseCategoryId()` throws when neither the env nor the
  channel yields a root, instead of silently querying a category that does not
  exist.
- No client module reads `NEXT_PUBLIC_BASE_CATEGORY_ID` any more; they call
  `useBaseCategoryId()`.

### Removed

- `lib/services/MenuService.ts` — a duplicate client-side menu fetch carrying
  the same `|| '1'` bug, with no callers anywhere in the app.

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
