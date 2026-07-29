# SDK 0.14.0 migration — removed/changed manifest

`@propeller-commerce/propeller-sdk-v2` **0.14.0** removes the **entire deprecated
surface** (every schema-`@deprecated` field/operation/enum value). This document
lists what the SDK dropped and every change made across the UI packages and the
three boilerplates to align with it.

Date: 2026-07-28 · SDK built locally from `D:/laragon/www/npm/propeller-sdk-v2`
(0.14.0, working tree — not yet published).

---

## 1. What the SDK removed (from the 0.14.0 CHANGELOG)

- **23 deprecated root operations** (queries `addressesByOrderId`, `companySearch`,
  `mediaImage(s)`, `mediaVideo(s)`, `mediaDocument(s)`, `shop(s)`; mutations
  `bundleAddItems`, `bundleRemoveItem`, `carrierAssign/UnassignWarehouse`,
  `cartSetUser`, `companySearch*` (5), `logout`, `orderUpdateAddress`,
  `publishPasswordResetEmailEvent`, `shopInvalidateCache`).
- **`ShopService` and `LogoutService` deleted**; **10 service methods** removed
  (`AddressService`/`OrderService.getAddressesByOrderId`,
  `BundleService.addItemsToBundle`, `CartService.setCartUser`,
  `EventActionConfigService.publishPasswordResetEmailEvent`, `UserService.logout`,
  the `getMediaImage/Video/Document(s)` readers).
- **42 deprecated field selections** from 17 fragments — of which the ones that
  reach our storefronts:
  - `Category.name / description / shortDescription / slug / path`
  - `IBaseProduct.class / language`, `Product.class / language`, `Cluster.sku`
  - `ClusterConfigSetting.id / name`
  - (unused here: `OrderStatus.is*`, `Channel.channelId/defaultLetterId/shop`,
    `Contact.debtorId`, `Inventory.dateModified`, `BusinessRule.shopId`, `TenderFields` ×8)
- **62 type/enum members**, incl. enum values `SortOrder.asc/.desc` (→ `ASC/DESC`),
  `PriceSortField.COST_PRICE`, `OrderItemClass.postage/.payment`,
  `CategorySortableFields.dateCreated/.dateChanged` (→ `createdAt/lastModifiedAt`).

### Field/enum replacement map (the members our code actually used)

| Removed | Replacement |
|---|---|
| `Category.name / description / shortDescription / slug` | plural `names / descriptions / shortDescriptions / slugs` (`LocalizedString[]`, all accept `(language:)`) |
| `Category.path` | gone (use `categoryPath: Category[]`) |
| `Product / Cluster / IBaseProduct.class` | `.type` (enum `ProductClass` = `PRODUCT` \| `CLUSTER`) |
| `Product / Cluster / IBaseProduct.language` | gone (fields are localized arrays; `defaultLanguage` still present) |
| `Cluster.sku` | gone (use `cluster.defaultProduct?.sku` / `cluster.code`) |
| `ClusterConfigSetting.name` | `attributeName` |
| `ClusterConfigSetting.id` | `uuid` (string) |
| `SortOrder.asc / .desc` | `ASC / DESC` |
| `CategorySortableFields.dateCreated / .dateChanged` | `createdAt / lastModifiedAt` |

**Verified unused across the whole frontend (0 hits):** `SortOrder.asc/desc`,
`CategorySortableFields.dateCreated/dateChanged`, `OrderItemClass.postage/payment`,
`PriceSortField.COST_PRICE`, `Contact.debtorId`, `product/cluster.language`, and
every removed service method. `OrderItem.class`/`.name` (plain scalar fields) and
`SparePartsMachine.name/description/slug` **survive** — all `item.class === 'product'`
and `machine.*` reads are unchanged and correct.

---

## 2. Changes per UI package

### `propeller-v2-core-ui` (1 file)
- `src/utils/jsonLd.ts` — `product.category.name`→`.names`; `cluster.category.name`→`.names`;
  `cluster.sku || defaultProduct?.sku`→`defaultProduct?.sku`; `item.class`→`item.type`.

### `propeller-v2-react-ui` (7 files)
- `composables/react/useMenu.ts` — hand-written menu GraphQL `name/slug(language:)`
  → `names/slugs(language:)` (root + recursive queries); `mapCategory` `raw.name/slug`
  → `raw.names/slugs`; `MenuCategoryRaw` type renamed.
- `components/Breadcrumbs.tsx` — `cat.name`→`cat.names`, `cat.slug`→`cat.slugs`.
- `components/CategoryDescription.tsx` — `category.description`→`descriptions`.
- `components/CategoryShortDescription.tsx` — `category.shortDescription`→`shortDescriptions`.
- `components/Menu.tsx` — partial-`Category` cast keys `name/slug`→`names/slugs`;
  **dropped `as any`** — arrays are typed `LocalizedString[]`.
- `composables/react/useClusterConfigurator.ts` — `setting.name`→`.attributeName`,
  `setting.id`→`.uuid`; public `ConfiguredSetting.id` `number`→`string`.
- `composables/react/useProductInfo.ts` — `setting.name`→`.attributeName`.

### `propeller-v2-vue-ui` (9 files)
- `composables/vue/useMenu.ts` — menu GraphQL + `raw.name/slug` + `MenuCategoryRaw` (as react).
- `components/Breadcrumbs.vue` — `cat.name`→`.names`, `cat.slug`→`.slugs`.
- `components/CategoryDescription.vue` — `description`→`descriptions`.
- `components/CategoryShortDescription.vue` — `shortDescription`→`shortDescriptions`.
- `components/OrderItemCard.vue` — dropped removed `cluster.slug` fallback (keep `cluster.slugs`).
- `components/Menu.vue` — partial-`Category` cast `name/slug`→`names/slugs`; **dropped `as any`**.
- `composables/vue/useClusterConfigurator.ts` — `getSortedSettings()` now maps to a
  `SortedSetting = ClusterConfigSetting & { name; id }` alias (`attributeName`→`name`,
  `uuid`→`id`), so downstream reads are unchanged; `ConfiguredSetting.id`→`string`.
- `components/ClusterConfigurator.vue` — `<script>` `setting.name`→`.attributeName`,
  `setting.id`→`.uuid`; local `ConfiguredSetting.id`→`string`. (Template `setting.name`
  reads the composable's `ConfiguredSetting` and is unchanged.)
- `composables/vue/useProductInfo.ts` — `setting.name`→`.attributeName`.

---

## 3. Changes per boilerplate

### `propeller-next` (6 files)
- `data/config.ts` — `getCategoryUrl`: `category.slug`→`.slugs` (product/cluster already `.slugs`).
- `app/category/[id]/[slug]/page.tsx` — SEO `category.name`→`.names`,
  `[shortDescription, description]`→plural; server `<h1>` name read → `.names`.
- `app/category/[id]/[slug]/CategoryIsland.tsx` — `category.slug`→`.slugs`.
- `app/csr/category/[id]/[slug]/page.tsx` — `category.slug`→`.slugs`, `category.name`→`.names`.
- `lib/server.ts` — `fetchMenu` GraphQL + `mapRawMenuCategory` + `RawMenuCategory` type
  → plural; cluster-config attribute list `setting.name`→`.attributeName`.
- `lib/services/MenuService.ts` — menu GraphQL → plural (legacy client fetch; unused export).

### `propeller-vue` (3 files, under `frontend/`)
- `src/lib/config.ts` — `getCategoryUrl`: `category.slug`→`.slugs`.
- `src/views/CategoryView.vue` — SEO `category.name`→`.names`,
  `[shortDescription, description]`→plural; `getCategoryName()` retyped strictly to
  `category.value.names` (**dropped `as any`**).
- `src/lib/server.ts` — `fetchMenu` GraphQL + `mapRawMenuCategory` + `RawMenuCategory`
  → plural; cluster-config `setting.name`→`.attributeName`.

### `propeller-nuxt` (3 files)
- `app/utils/config.ts` — `getCategoryUrl`: `category.slug`→`.slugs`.
- `app/pages/category/[id]/[slug].vue` — SEO block retyped strictly against `Category`
  (**dropped 6 `as any`**); `name`→`names`, `shortDescription/description`→plural.
- `server/utils/fetchers.ts` — `fetchMenu` GraphQL + `mapRawMenuCategory` +
  `RawMenuCategory` → plural; cluster-config `setting.name`→`.attributeName`.

---

## 4. Verified unaffected (no changes needed)

`propeller-v2-spl`, `propeller-v2-mollie`, `propeller-v2-msp`,
`propeller-v2-cms-react`, `propeller-v2-cms-vue` — all typecheck **clean** against
SDK 0.14.0. They touch no removed catalog fields.

---

## 5. Validation (all against locally-wired SDK 0.14.0)

| Repo | Gate | Result |
|---|---|---|
| core-ui | `tsc` + `tsup` build + vitest | ✅ 198 tests |
| react-ui | `tsc` + build + vitest | ✅ 44 tests |
| vue-ui | `vue-tsc` + build + vitest | ✅ 33 tests |
| propeller-next | `tsc --noEmit` + `next build` | ✅ green |
| propeller-vue | `vite build` (CI gate) | ✅ green |
| propeller-nuxt | `nuxt build` + `nuxt typecheck` | ✅ green |
| spl / mollie / msp / cms-react / cms-vue | typecheck | ✅ clean |

**Runtime proof (next production server):** the migrated menu renders category
links from `fetchMenu` (`names/slugs`); the category page `<h1>` renders the
localized `category.names` ("Sempergreen"); breadcrumbs render via the migrated
`Breadcrumbs` (`cat.names/slugs`).

---

## 6. Pre-existing issues surfaced (NOT part of this migration)

- **propeller-vue `build:check`** (`vue-tsc`) — CMS-provider type drift
  (`_type` vs `type` on `CmsBlock`, `CmsPage` vs `CmsRichPage`) from Tina's
  cms-vue 0.1.4 typed-block work not yet wired into propeller-vue's providers. The
  `vite` build (CI gate) passes. Also: this working copy was missing the
  `cms-vue`/`xlsx` installs (added by Tina's quick-order) — `npm install` restored them.
- **propeller-nuxt `nuxt typecheck`** — 2 pre-existing `AppHeader.vue` template
  parse quirks (documented, expected).
- **propeller-next anonymous e2e** — 29 pass / 34 fail / 1 skip. The failures are
  pre-existing environment issues, not the migration:
  1. **Locale mismatch** — app defaults to `NL` (`BOILERPLATE_DEFAULT_LANGUAGE=NL`,
     cart `<h1>` = "Winkelwagen") but the specs assert English text
     (`/email/i`, `/password/i`, "Shopping Cart").
  2. **Empty product grids** — the known `Product.slugs` backend break
     (see memory `project-product-slugs-schema-break`) leaves grids empty, failing
     the product/cluster/grid specs.
  Full green e2e needs the app in EN + the backend product data (and the SDK
  `.env` test account for the `contact`/`customer` authed projects).
- **propeller-vue e2e** — not re-run: it shares next's exact pre-existing failure
  mode (`VITE_DEFAULT_LANGUAGE=NL` + same backend), and its CI gate (`vite build`)
  is green. **propeller-nuxt** has no e2e suite (its `nuxt build` is the gate). The
  migrated Vue surface is exercised by vue-ui's 33 unit tests + the vue build.

---

## 7. Release (pending — separate, gated)

Local `--install-links`/overlay only so far; nothing published. To ship: publish
SDK 0.14.0 → minor-bump + publish core-ui / react-ui (→0.8.0) / vue-ui (→0.6.0)
(SDK peer stays `*`) → re-pin the 3 boilerplates to npm `^0.14.0` + new UI
versions → `develop`→`master` per repo. Follow the **`propeller-release`** skill.
