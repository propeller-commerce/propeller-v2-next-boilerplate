# Claude operating notes — propeller-next

Loaded into every Claude session for this project. Keep concise.

## Hybrid SSR

Catalog pages (category / search / cluster / product) are Server Component
shells with client islands. See `app/<route>/page.tsx` for the shell and
`./<Route>Island.tsx` next to it for the interactive half.

### Caching (anonymous SSR)

Anonymous catalog GraphQL fetches go through Next 16's data cache with
per-entity tags. Logged-in users bypass via the cookie read in
`getServerInfra()`. Mutations stay uncached.

- Source of truth for tags: `tagFor(entity, id?)` in `lib/server.ts`.
  Never inline `'product:42'` literals — call `tagFor('product', 42)`.
- TTL: `ANONYMOUS_CACHE_TTL_SECONDS = 300`. Tune per catalog change rate.
- Bust by tag from `/api/revalidate` (POST, gated by `REVALIDATE_SECRET`,
  body `{ "tag": "..." }`). Pass `{"tag":"*"}` for a nuclear wipe — the
  route rewrites it to `TAG_CATALOG`, which every anonymous cache entry
  carries as an umbrella tag.
- SDK contract: `GraphQLFetchOptions` on `GraphQLOperation` (SDK v0.11.0+).
  NEVER serialised into the request body — transport hint only.
- Cache-key keying depends on **stable variable order** in the
  `build…Input` blocks of `lib/server.ts`. Don't reorder casually — Next
  hashes the POST body byte-for-byte.
- Menu is pre-fetched server-side via `HeaderServer` (Server Component
  wrapper around `Header`). 10 Server pages use `HeaderServer`; 12 client
  pages still use `Header` directly (legacy client-side menu fetch).
- Homepage (`app/page.tsx`) parallel-fetches `getPage('home')` + `fetchMenu`
  and passes the tree to `HomeFallback` so the icon grid is in initial HTML.
  Duplicate `fetchMenu` between page + `HeaderServer` is intentional — the
  Next data cache dedupes by request body, so upstream sees one call.

Full design: see memory note `project-anonymous-ssr-caching`.

## Three repos in play

- `propeller-next` (this repo) — the app.
- `propeller-sdk-v2` at `D:/laragon/www/npm/propeller-sdk-v2` — GraphQL
  SDK. Pinned via `github:propeller-commerce/propeller-sdk-v2#master`
  (which CI rewrites to the GitLab URL). v0.11.0+ supports the
  `fetchOptions` cache hint contract.
- `propeller-v2-react-ui` at `D:/laragon/www/propeller-ui/propeller-v2-react-ui`
  — React component package. Pinned via
  `github:propeller-commerce/propeller-v2-react-ui#master`. `Menu` accepts
  an optional `tree?: MenuCategory[]` prop for server-side pre-fetching;
  `ProductGrid` has the equivalent `products?` opt-in.

Edit components / composables / contexts in the package repo, not here.

## Releasing across repos

Shipping an SDK / UI / payment-package change to the apps is a fixed
bottom-up ritual (packages→npm, then apps re-pin). Don't improvise it —
invoke the **`propeller-release`** skill. It carries the full package map,
release order, the SDK-peer `*` ERESOLVE trap, and per-repo quirks.

## Memory

Project memory lives at
`C:/Users/ThinkBook/.claude/projects/d--laragon-www-propeller-next/memory/`.
`MEMORY.md` is the index — read it first.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
