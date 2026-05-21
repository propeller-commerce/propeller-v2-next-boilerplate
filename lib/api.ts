/**
 * Client-side SDK seam — propeller-next's own GraphQL client and Services
 * bundle.
 *
 * Hosted in the consumer (this app) rather than in `propeller-v2-react-ui`
 * because GraphQL transport is application-specific:
 *  - The endpoint URL (`/api/graphql`) is a propeller-next convention — we
 *    proxy through a Next.js Route Handler that adds the API key, body
 *    inspection, and refresh-token retry. A different consumer might use a
 *    direct upstream URL or a different proxy path.
 *  - The env-var names (`NEXT_PUBLIC_*`) are Next.js conventions; a Vite or
 *    Remix consumer would use different ones.
 *  - The timeout and headers default policy are app concerns.
 *
 * Construction sequence:
 *   1. Build `graphqlClient` with our app-specific config.
 *   2. Build `services = createServices(graphqlClient)` once.
 *   3. Pass BOTH into `<PropellerProvider value={{ graphqlClient, services, ... }}>`
 *      (wired by `components/layout/PropellerHostBridge.tsx`).
 *   4. Components and composables inside the provider tree read `services`
 *      via `useServices()` or accept an explicit `graphqlClient` option
 *      (e.g. `useCart({ graphqlClient, user, ... })`).
 *
 * Re-exports `toPlain` from the package so callers that need to strip SDK
 * underscore-prefixed backing fields (e.g. before `JSON.stringify`-ing into
 * cookies or localStorage) have one place to find it.
 */

import { GraphQLClient, type GraphQLClientConfig } from 'propeller-sdk-v2';
import { createServices, toPlain, type Services } from 'propeller-v2-react-ui';

const config: GraphQLClientConfig = {
  // Point at our own Next.js proxy. The route handler at
  // `app/api/graphql/route.ts` adds the API key, runs body-size / depth /
  // rate-limit checks, and handles refresh-token retry on 401.
  endpoint: '/api/graphql',
  apiKey: '', // API key is handled by the proxy
  orderEditorApiKey: process.env.NEXT_PUBLIC_ORDER_EDITOR_API_KEY || '',
  timeout: parseInt(process.env.NEXT_PUBLIC_TIMEOUT || '30000', 10),
  headers: {},
};

/**
 * The single GraphQL client instance for the client runtime. Constructed
 * once at module-eval, mutated in place via `updateConfig` when the
 * Bearer token changes (the SDK reads `this.config.headers` per request,
 * so this is safe — services cached by `createServices` keep working
 * after login/logout without rebuilding).
 */
export const graphqlClient = new GraphQLClient(config);

/**
 * Memoized Services bundle for `graphqlClient`. Built once at module-eval;
 * `<PropellerProvider value={{ graphqlClient, services, ... }}>` passes
 * this same instance into context so `useServices()` returns it.
 */
export const services: Services = createServices(graphqlClient);

export { config as graphqlConfig };
export { createServices, toPlain };
export type { Services };
