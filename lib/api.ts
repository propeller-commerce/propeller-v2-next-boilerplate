import { GraphQLClient, GraphQLClientConfig } from 'propeller-sdk-v2';
import {
  ProductService,
  CartService,
  UserService,
  CategoryService,
  OrderService,
  PayMethodService,
  LoginService,
  AddressService,
  CompanyService,
  CrossupsellService,
  BundleService,
  FavoriteListService,
  PurchaseAuthorizationConfigService,
  ClusterService,
  OrderlistService,
} from 'propeller-sdk-v2';

// Use the Next.js API proxy endpoint instead of direct GraphQL endpoint
const endpoint = '/api/graphql';

const config: GraphQLClientConfig = {
  endpoint,
  apiKey: '', // API key is handled by the proxy
  orderEditorApiKey: process.env.NEXT_PUBLIC_ORDER_EDITOR_API_KEY || '',
  timeout: parseInt(process.env.NEXT_PUBLIC_TIMEOUT || '30000', 10),
  headers: {},
};

export const graphqlClient = new GraphQLClient(config);

/**
 * The single SDK seam for the whole app.
 *
 * Every composable / service used to do `new XxxService(graphqlClient)` inside each
 * callback (48+ sites). That coupled 55 files directly to the SDK with zero reuse.
 * `getServices()` is the one place the SDK is wired up — composables pull what they
 * need from here instead.
 *
 * Memoization is safe: `GraphQLClient` mutates its own config in place via
 * `updateConfig` and reads `this.config.headers` at request time (see SDK
 * `GraphQLClient.buildHeaders`), so a cached service instance still picks up auth
 * header changes after login/logout. Instances are keyed per client so a non-default
 * client (tests, multi-tenant) gets its own set.
 */
export interface Services {
  product: ProductService;
  cart: CartService;
  user: UserService;
  category: CategoryService;
  order: OrderService;
  payMethod: PayMethodService;
  login: LoginService;
  address: AddressService;
  company: CompanyService;
  crossupsell: CrossupsellService;
  bundle: BundleService;
  favoriteList: FavoriteListService;
  purchaseAuthConfig: PurchaseAuthorizationConfigService;
  cluster: ClusterService;
  orderlist: OrderlistService;
}

const servicesByClient = new WeakMap<GraphQLClient, Services>();

export function getServices(client: GraphQLClient = graphqlClient): Services {
  const cached = servicesByClient.get(client);
  if (cached) return cached;

  const services: Services = {
    product: new ProductService(client),
    cart: new CartService(client),
    user: new UserService(client),
    category: new CategoryService(client),
    order: new OrderService(client),
    payMethod: new PayMethodService(client),
    login: new LoginService(client),
    address: new AddressService(client),
    company: new CompanyService(client),
    crossupsell: new CrossupsellService(client),
    bundle: new BundleService(client),
    favoriteList: new FavoriteListService(client),
    purchaseAuthConfig: new PurchaseAuthorizationConfigService(client),
    cluster: new ClusterService(client),
    orderlist: new OrderlistService(client),
  };
  servicesByClient.set(client, services);
  return services;
}

export { config as graphqlConfig };

/**
 * Recursively converts an SDK class instance (or any nested object/array) into
 * a plain JSON-safe object, stripping the leading underscore that the SDK uses
 * for private backing fields (`_items` → `items`, `_firstName` → `firstName`,
 * `_purchaseAuthorizationConfigs` → `purchaseAuthorizationConfigs`).
 *
 * Why this exists: the propeller SDK returns class instances whose getters
 * forward to underscore-prefixed properties. Anything that serializes them
 * (JSON.stringify into localStorage, React state diffing, deep-equals checks)
 * sees the underscored shape — which forces consumers to write
 * `(obj as any).items ?? (obj as any)._items` everywhere. Applying `toPlain`
 * once at the boundary (e.g. right after `getViewer`) lets all downstream code
 * use the clean SDK type names and types.
 *
 * Generic preserves the *advertised* shape so consumers don't have to re-cast.
 * The structural conversion is correct at runtime; the type assertion is the
 * honest answer to "I trust the SDK's public types describe the cleaned shape".
 */
export function toPlain<T>(value: T): T {
  return deepPlainInner(value) as T;
}

function deepPlainInner(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deepPlainInner);
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      const cleanKey = key.startsWith('_') ? key.slice(1) : key;
      out[cleanKey] = deepPlainInner((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
