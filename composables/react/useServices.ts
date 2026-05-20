/**
 * useServices — read the SDK services bundle from the PropellerProvider.
 *
 * Phase D.2: composables migrating off direct `getServices()` imports can
 * call this hook to get the same `Services` shape, scoped to whatever
 * GraphQL client the PropellerProvider was given. For the boilerplate that
 * client is the shared `graphqlClient` singleton from `lib/api.ts`;
 * standalone consumers can construct their own client and inject it via
 * `<PropellerProvider value={{ graphqlClient: myClient, ... }}>`.
 *
 * Fallback behaviour: when called outside any provider (e.g. unit tests,
 * Storybook, throw-away scripts), it uses the module-level `graphqlClient`
 * — matches the pre-Phase-D import path so swapping `getServices(client)`
 * for `useServices()` is risk-free.
 */

import { getServices, graphqlClient, Services } from '@/lib/api';
import { usePropellerContext } from '@/context/PropellerContext';
import type { GraphQLClient } from 'propeller-sdk-v2';

export function useServices(): Services {
  const infra = usePropellerContext();
  // PropellerInfra.graphqlClient is the canonical client; fall back to the
  // module singleton when no provider is mounted. getServices() memoizes per
  // client so this is cheap to call from any render path.
  const client = (infra?.graphqlClient as GraphQLClient | undefined) ?? graphqlClient;
  return getServices(client);
}
