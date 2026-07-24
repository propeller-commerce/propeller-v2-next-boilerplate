# Changelog

All notable changes to the propeller-next boilerplate are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-07-24

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

## [1.0.0] - 2026-06-10

First public release of the Next.js boilerplate.

### Added
- Hybrid SSR catalog (category / search / cluster / product) with anonymous
  fetch caching and per-entity cache tags.
- Consumes the published Propeller UI packages and SDK.
- Public GitHub mirror with CI-driven releases.
