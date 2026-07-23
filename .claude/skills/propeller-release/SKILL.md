---
name: propeller-release
description: How to run a multi-repo release/rollout across the Propeller stack — commit, bump versions, publish npm packages, and fan the new pins out to the boilerplate apps. Use whenever the user says to "commit and push", "release", "roll out", "bump versions", or ship an SDK/UI/payment-package change to the apps. Covers the package graph, release order, the SDK-peer ERESOLVE trap, and per-repo quirks.
version: 1.0.0
tags: [release, rollout, npm, publish, monorepo, sdk, versioning, ci, propeller]
---

# Propeller multi-repo release

Shipping one change usually touches several repos: a package is published to npm,
then every app that consumes it re-pins and rebuilds. This skill is the ritual.
Do it **bottom-up: packages first (SDK → UI/payment packages), then apps.**

## The repos & packages (the map)

Everything hangs off the SDK. `@propeller-commerce/*` on npm, published **public**.

| Repo (path) | npm name | Branch model | CI publish trigger | Consumed by |
|---|---|---|---|---|
| `D:/laragon/www/npm/propeller-sdk-v2` | `…/propeller-sdk-v2` | **straight to `master`** | push→master (GitLab→GitHub→npm) | everything |
| `D:/laragon/www/propeller-ui/propeller-v2-core-ui` | `…/propeller-v2-core-ui` | develop → master | push→master | react-ui (dep) |
| `D:/laragon/www/propeller-ui/propeller-v2-react-ui` | `…/propeller-v2-react-ui` | develop → master | push→master | propeller-next |
| `D:/laragon/www/propeller-ui/propeller-v2-vue-ui` | `…/propeller-v2-vue-ui` | develop → master | push→master | propeller-vue, propeller-nuxt |
| `D:/laragon/www/npm/propeller-v2-mollie` | `…/propeller-v2-mollie` | **single-branch `master`** | push→master | next, vue, nuxt |
| `D:/laragon/www/npm/propeller-v2-msp` | `…/propeller-v2-msp` | **single-branch `master`** | push→master | propeller-next only |
| `D:/laragon/www/propeller-next` | — (private app) | develop → master | GitLab CI build (+public mirror) | — |
| `D:/laragon/www/propeller-vue` | — (private app) | develop → master | GitLab CI build (+public mirror) | — |
| `D:/laragon/www/propeller-nuxt` | — (private app) | develop → master | GitLab CI build (+public mirror) | — |

- **CMS packages** (`propeller-v2-cms-react`, `propeller-v2-cms-vue`, `cms-adapter`)
  also live under `propeller-ui/` — same rules if a release touches them; usually
  it doesn't.
- **Tina works these repos concurrently.** `git fetch` + pull `develop` (and
  `master`) on EVERY repo before you branch or merge, or you'll clobber her work.

## Dependency graph (who breaks whom)

```
propeller-sdk-v2  (peer/dep of ALL packages)
  ├─ propeller-v2-core-ui ── dep of ── propeller-v2-react-ui ── consumed by ── propeller-next
  ├─ propeller-v2-vue-ui ───────────────────────────────────── consumed by ── propeller-vue, propeller-nuxt
  ├─ propeller-v2-mollie ───────────────────────────────────── consumed by ── next, vue, nuxt
  └─ propeller-v2-msp ──────────────────────────────────────── consumed by ── propeller-next
```

**A minor SDK bump reaches every box below it.** Any package whose SDK **peer**
range is a strict caret (`^0.12.0`) will throw `ERESOLVE` in every consumer the
moment the SDK crosses a minor. → **the #1 trap, see Critical rules.**

## Release order (always)

1. **SDK** — commit machine/query surface, bump minor, straight to `master`, push, **wait for npm**.
2. **UI packages** (core-ui if changed → react-ui / vue-ui) — dev-link against the *published* SDK, bump, develop→master, push, wait for npm.
3. **Payment packages** (mollie / msp) — only if the SDK bump or a fix touches them; bump, push, wait for npm.
4. **Apps** (next / vue / nuxt) — re-pin every bumped dependency to the just-published versions, regen lockfile, build, develop→master, push.

Never re-pin an app to a version npm hasn't published yet — the install 404s or
silently resolves the old one. **Wait between a package push and the app bump**
until `npm view <pkg> version` shows the new number (CI publish lags a few min).

## Per-repo recipe

### A. A published package (SDK / core-ui / react-ui / vue-ui / mollie / msp)

1. `git fetch` + pull develop/master (Tina).
2. Make the change on `develop` (SDK & mollie/msp: directly on `master`).
3. **Bump `version`** in `package.json` (SemVer 0.x: feature = minor, fix = patch).
4. **Add a dated CHANGELOG section** `## [x.y.z] - YYYY-MM-DD` — the publish gate
   is **version-based**: CI publishes on master push iff the version parses, the
   CHANGELOG section is dated (NOT "Unreleased"), and the version isn't already
   on npm. No date / stale version = no publish, silently.
5. Keep the **SDK peer at `*`** (see traps). DevDep SDK may lag — only the peer matters to consumers.
6. Validate: `npm run typecheck && npm test && npm run build` (or the repo's `validate`).
7. Regenerate the lockfile in the **same commit** as the `package.json` bump.
8. `develop` → `master` (`--no-ff`), push both. Single-branch packages: push `master`.
9. **Wait for npm**: `npm view <name> version` must show the new number before touching consumers.

### B. A boilerplate app (propeller-next / propeller-vue / propeller-nuxt)

1. `git fetch` + pull develop/master.
2. On `develop`, re-pin every bumped dep in `package.json` (`^new.version`).
3. Reinstall so the lockfile records the published versions:
   - **next**: `npm install` (root).
   - **nuxt**: `npm install` (root).
   - **vue**: the app is in **`frontend/`** — bump & `npm install` in `frontend/`.
     `frontend/package-lock.json` is the real lockfile; the root one is a ~98-byte
     pointer, don't touch it.
4. **Simulate CI resolution**: `npm install --strict-peer-deps --dry-run` → must exit 0.
5. Build (the real gate):
   - next → `npm run build`  (dev port 3000)
   - nuxt → `npm run build`  (dev port 5000; `typeCheck:false`, 2 pre-existing AppHeader vue-tsc quirks are OK)
   - vue  → `npm run build` in `frontend/`  (dev port 4000)
6. `develop` → `master` (`--no-ff`), push both.
7. **Never commit** generated `locales/_registry.ts` (predev/prebuild output) or `.vite/` / `.next/` / `.nuxt/`.

## Critical rules (the traps)

- **SDK peer must be `*` in every propeller package.** A strict `^0.x.0` SDK peer
  in mollie/msp is what produced the boilerplate-pipeline `ERESOLVE`
  ("Conflicting peer dependency … sdk `^0.12.0`") on the 0.13.0 bump. core-ui /
  react-ui / vue-ui already declare `*`; keep it that way. Fix = widen peer to
  `*`, patch-bump, republish, re-pin consumers.
- **Local install can mask the conflict.** `--install-links` copies packages and
  an already-resolved `node_modules` hides a bad peer. Always confirm with
  `npm install --strict-peer-deps --dry-run` (exit 0) before trusting a green app build.
- **Publish is version-gated, not date-triggered** — forget the version bump or
  the dated CHANGELOG line and CI silently skips publishing.
- **Lockfile in the same commit as the bump**, or CI `npm ci` fails `EUSAGE`.
- **`--install-links` skips the re-copy when the version is unchanged** — for
  purely-local package edits during dev, `rm -rf` the one package dir under
  `node_modules` and reinstall, or the app keeps the stale copy.
- **No AI attribution in commits** (project rule, all repos): no `Co-Authored-By`
  / "Generated with" trailer.
- **develop-behind-master quirk**: master accumulates the merge commits, so
  develop can look "behind" — that's expected, not a lost commit.

## Worked example — this release (2026-07-22, spare-parts machines)

Order and versions actually shipped:

1. `propeller-sdk-v2` **0.13.0** → master → npm (machine query surface).
2. `propeller-v2-react-ui` **0.6.0** (MachineGrid/useMachines) → develop→master → npm.
3. `propeller-v2-mollie` **0.2.4** + `propeller-v2-msp` **0.1.2** — SDK peer
   widened `^0.12.0`→`*` (the ERESOLVE fix) → master → npm.
4. Apps re-pinned & shipped develop→master:
   - `propeller-next`: SDK `^0.13.0`, react-ui `^0.6.0`, mollie `^0.2.4`, msp `^0.1.2`.
   - `propeller-vue` (`frontend/`): SDK `^0.13.0`, mollie `^0.2.4`.
   - `propeller-nuxt`: SDK `^0.13.0`, mollie `^0.2.4`.

(`scripts/build-php-sdk.js` in the SDK was deliberately left untracked — unrelated
PHP emitter, not in package.json/CI/CHANGELOG.)

## Pre-push checklist

- [ ] Fetched + pulled every touched repo (Tina).
- [ ] Version bumped **and** dated CHANGELOG section added on each package.
- [ ] SDK peers are `*` everywhere.
- [ ] Lockfile regenerated in the bump commit.
- [ ] Package on npm (`npm view … version`) **before** re-pinning apps.
- [ ] `npm install --strict-peer-deps --dry-run` exits 0 in each app.
- [ ] App builds green (next/nuxt/vue — vue in `frontend/`).
- [ ] develop→master (`--no-ff`) + pushed both; no AI trailer in commits.
- [ ] Told the user to confirm the GitLab pipelines go green (CI isn't watchable from here).
