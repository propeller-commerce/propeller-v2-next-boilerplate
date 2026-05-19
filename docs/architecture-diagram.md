# Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                 │
│                                              BROWSER                                                            │
│                                                                                                                 │
│   ┌─ State ──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                                          │  │
│   │  AuthContext (useReducer)          CartContext (useState)           GlobalContext                         │  │
│   │  ├─ accessToken, refreshToken      ├─ cart state                   └─ CMS global data (logo, nav,       │  │
│   │  ├─ user object                    ├─ cross-tab sync (storage)         footer) from Strapi               │  │
│   │  ├─ 30min inactivity logout        │   events                                                           │  │
│   │  ├─ events: userLoggedIn/Out       └─ event: cartUpdated           All three wrap app in layout.tsx      │  │
│   │  └─ persists to localStorage           persists to localStorage    (server component)                    │  │
│   │                                                                                                          │  │
│   └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                 │
│   ┌─ Pages (app/) ───────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                                          │  │
│   │  ROUTE RESOLUTION ORDER (highest → lowest priority)                     DATA SOURCE                      │  │
│   │  ─────────────────────────────────────────────────────────────────────────────────────                    │  │
│   │                                                                                                          │  │
│   │  1. STATIC ROUTES                                                       Propeller API                    │  │
│   │     /login ─────────────── LoginPage                                    ├─ userService.login()           │  │
│   │     /register ─────────── RegisterPage                                  ├─ userService.register()        │  │
│   │     /cart ─────────────── CartPage                                      ├─ cartService                   │  │
│   │     /checkout ─────────── CheckoutPage                                  ├─ orderService                  │  │
│   │     /forgot-password ──── ForgotPasswordPage                            └─ payMethodService              │  │
│   │     /terms-conditions ─── TermsPage                                                                      │  │
│   │                                                                                                          │  │
│   │  2. DYNAMIC ROUTES [param]                                              Propeller API                    │  │
│   │     /product/[productId]/[slug] ──── ProductPage                        └─ productService.getProduct()   │  │
│   │     /category/[id]/[slug] ────────── CategoryPage (+CMS banner)            + getCategoryBanner()         │  │
│   │     /cluster/[clusterId]/[slug] ──── ClusterPage                           clusterService.getCluster()   │  │
│   │     /search/[term] ──────────────── SearchPage (ProductGrid)               productService (via grid)     │  │
│   │     /checkout/thank-you/[orderId] ── ThankYouPage                          orderService                  │  │
│   │                                                                                                          │  │
│   │  3. PROTECTED ROUTES (/account/layout.tsx guards all)                   Propeller API                    │  │
│   │     ┌─ useAuth() → !authenticated? → redirect /login                                                    │  │
│   │     │                                                                                                    │  │
│   │     ├─ /account ──────────────────── AccountDashboard                   └─ userService                   │  │
│   │     ├─ /account/orders ───────────── OrdersPage                            orderService                  │  │
│   │     ├─ /account/orders/[id] ──────── OrderDetailPage                       orderService                  │  │
│   │     ├─ /account/addresses ─────────── AddressesPage                        userService                   │  │
│   │     ├─ /account/favorites ─────────── FavoritesPage                        favoriteListService           │  │
│   │     ├─ /account/favorites/[id] ────── FavoriteDetailPage                   favoriteListService           │  │
│   │     ├─ /account/invoices ──────────── InvoicesPage                         orderService                  │  │
│   │     ├─ /account/quotes ────────────── QuotesPage                           orderService                  │  │
│   │     ├─ /account/quotes/[id] ───────── QuoteDetailPage                      orderService                  │  │
│   │     └─ /account/price-requests ────── PriceRequestsPage                    orderService                  │  │
│   │                                                                                                          │  │
│   │  4. ADMIN (optional catch-all [[...admin]])                             MySQL                            │  │
│   │     /admin/[[...admin]] ──── react-admin SPA                            └─ admin_users table             │  │
│   │     ├─ Own auth: JWT (24h) via /api/admin/auth/login                       (bcryptjs passwords)          │  │
│   │     └─ Client-side routing handled by react-admin                                                        │  │
│   │                                                                                                          │  │
│   │  5. CMS CATCH-ALL (lowest priority — matches anything unmatched)        Strapi CMS                      │  │
│   │     /(cms)/[...slug] ──── CmsPage                                       └─ getPage(slug)                │  │
│   │     ├─ /about-us → slug=["about-us"] → getPage("about-us")                                              │  │
│   │     ├─ /legal/privacy → slug=["legal","privacy"] → getPage("legal/privacy")                              │  │
│   │     ├─ Found → DynamicBlockRenderer (renders Strapi blocks)                                              │  │
│   │     └─ Not found → 404                                                                                   │  │
│   │                                                                                                          │  │
│   │  6. HOME PAGE (special case)                                            Strapi → Propeller fallback      │  │
│   │     / ──── app/page.tsx                                                                                  │  │
│   │     ├─ getPage("home") returns CMS page → DynamicBlockRenderer                                           │  │
│   │     └─ getPage("home") returns null → HomeFallback                                                       │  │
│   │         ├─ menuService.getMenu() → top categories from Propeller                                         │  │
│   │         └─ categoryService.getCategory() → featured products                                              │  │
│   │                                                                                                          │  │
│   └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                                 │
│   ┌─ SDK Layer (lib/api.ts) ─────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                                                                                          │  │
│   │  GraphQLClient({ endpoint: "/api/graphql", apiKey: "" })    ← apiKey empty; proxy injects it server-side │  │
│   │    ├── productService   = new ProductService(client)                                                     │  │
│   │    ├── cartService      = new CartService(client)           Some components (ProductGrid, AddToCart)      │  │
│   │    ├── userService      = new UserService(client)           receive graphqlClient as a prop and call      │  │
│   │    ├── categoryService  = new CategoryService(client)       the SDK directly, bypassing singletons.      │  │
│   │    ├── orderService     = new OrderService(client)                                                       │  │
│   │    └── payMethodService = new PayMethodService(client)                                                   │  │
│   │                                                                                                          │  │
│   └──────────────────────────────────┬───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                                                          │
│                                      │ POST /api/graphql                                                        │
│                                      │ + Authorization: Bearer <token> (if logged in)                           │
│                                      │                                                                          │
└──────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                  │
│                                         NEXT.JS SERVER                                                           │
│                                                                                                                  │
│   ┌─ API Routes ─────────────────────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                                          │   │
│   │  /api/graphql (route.ts)                          /api/admin/auth/login                                  │   │
│   │  ├─ Receives POST from browser                    ├─ Validates email/password ──────────► MySQL          │   │
│   │  ├─ Injects header: apikey = API_KEY              └─ Returns signed JWT (24h)            admin_users     │   │
│   │  ├─ Forwards Authorization header                                                                        │   │
│   │  └─ Proxies to GRAPHQL_ENDPOINT ──────────────────────────────────────────────► Propeller GraphQL API    │   │
│   │                                                                                  api.staging.helice.cloud│   │
│   └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                                  │
│   ┌─ Server-Side Data Fetching ──────────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                                                          │   │
│   │  layout.tsx (root)                                (cms)/[...slug]/page.tsx                                │   │
│   │  └─ getGlobal() ──────────────────► Strapi        ├─ getPage(slug) ──────────────────► Strapi            │   │
│   │     GET /api/global?populate=*      :1337         │  GET /api/pages?filters[slug]=*     :1337            │   │
│   │     revalidate: 60s (prod)                        └─ generateStaticParams()                              │   │
│   │     no-store (dev)                                   └─ getAllPageSlugs() → pre-renders at build time    │   │
│   │                                                                                                          │   │
│   │  app/page.tsx (home)                              category/[id]/[slug]/page.tsx                           │   │
│   │  └─ getPage("home") ──────────────► Strapi        └─ getCategoryBanner(id) ─────────► Strapi            │   │
│   │     Falls back to HomeFallback      :1337            GET /api/category-banners?...      :1337            │   │
│   │                                                                                                          │   │
│   └──────────────────────────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                       │                              │                          │
                                       ▼                              ▼                          ▼
                          ┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
                          │  Propeller GraphQL   │      │  Strapi CMS         │      │  MySQL              │
                          │  API (SaaS)          │      │  localhost:1337      │      │  localhost:3306      │
                          │                      │      │                      │      │                      │
                          │  Products, Categories│      │  Pages, Global       │      │  admin_users         │
                          │  Cart, Orders, Users │      │  Category Banners    │      │  (admin panel only)  │
                          │  Clusters, Inventory │      │  Articles, About     │      │                      │
                          │  Prices, Pay Methods │      │                      │      │                      │
                          └─────────────────────┘      └─────────────────────┘      └─────────────────────┘

                          ─── CUSTOMER AUTH ───          ─── CMS AUTH ──────          ─── ADMIN AUTH ───
                          Propeller tokens in            Optional API token           JWT in localStorage
                          localStorage, 30min            (STRAPI_API_TOKEN)           (admin_auth), 24h
                          inactivity timeout             server-side only             expiry, JWT_SECRET

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                                  │
│  KEY FILES                                                                                                       │
│                                                                                                                  │
│  app/layout.tsx ─────────── Root server component, fetches CMS global, wraps Auth+Cart+Global providers          │
│  app/(cms)/[...slug]/ ───── CMS catch-all for Strapi-managed pages                                               │
│  app/account/layout.tsx ─── Client-side auth guard for all /account/* routes                                     │
│  lib/api.ts ─────────────── GraphQLClient + 6 service singletons (endpoint: /api/graphql)                        │
│  lib/cms/strapi.ts ──────── Strapi fetch helper (getPage, getGlobal, getCategoryBanner)                          │
│  lib/services/ ──────────── BaseApiService subclasses with retry logic, error handling, caching                  │
│  context/ ───────────────── AuthContext, CartContext, GlobalContext                                               │
│  components/propeller/ ──── Hand-maintained React components (ProductGrid, AddToCart, etc.) — no codegen         │
│  components/cms/ ────────── DynamicBlockRenderer + block components for Strapi content                            │
│  data/config.ts ─────────── Feature flags, URL builders, base category ID                                        │
│  data/defaults.ts ───────── Pagination, search, cart, validation, timeout, cache defaults                        │
│  app/api/graphql/route.ts ── Server-side proxy: injects API_KEY, forwards auth, hides endpoint from browser      │
│                                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
