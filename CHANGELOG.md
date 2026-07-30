# Changelog

All notable changes to the propeller-next boilerplate are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
