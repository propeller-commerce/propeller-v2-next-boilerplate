# Propeller Next.js E-commerce

A Next.js e-commerce application powered by propeller-sdk-v2, migrated from the React application.

## Features

- 🛍️ Product catalog with categories
- 🛒 Shopping cart functionality
- 👤 User authentication
- 📱 Responsive design with Tailwind CSS
- 🔥 React Hot Toast notifications
- 🎨 Modern UI components

## Tech Stack

- **Next.js 16** with App Router
- **React 19** (React Compiler enabled — do not hand-write `useMemo`/`useCallback` on props)
- **TypeScript** (strict) for type safety
- **Tailwind CSS 4** for styling
- **propeller-sdk-v2** for GraphQL API integration (proxied via `/api/graphql`)
- **React Hot Toast** for notifications

> **Architecture note:** Components are hand-maintained React in `components/propeller/`,
> business logic in `composables/`. There is **no Mitosis and no code generation** — ignore any
> older reference to `.lite.tsx` or an `output/` directory.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with your environment variables (already configured)

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── cart/              # Shopping cart page
│   ├── category/          # Category pages
│   ├── product/           # Product detail pages
│   ├── login/             # Authentication pages
│   └── layout.tsx         # Root layout with providers
├── components/            # React components (hand-maintained, no codegen)
│   ├── propeller/        # Propeller business components (ProductCard, AddToCart, etc.)
│   ├── layout/           # Layout components (Header, Footer)
│   ├── cms/              # CMS-driven content blocks
│   └── ui/               # Basic UI primitives
├── composables/          # Shared logic
│   ├── react/            # React hooks (useCart, useAuth, useProductSearch, …)
│   └── shared/           # Framework-agnostic utils + types
├── context/              # React context providers (Auth, Cart, Propeller, …)
├── lib/                  # Services & SDK client
│   ├── api.ts           # GraphQL client configuration
│   └── services/        # Service layer (AuthService, MenuService, …)
└── data/                 # config.ts, defaults, countries
```

## Environment Variables

Server-side only (read by the `/api/graphql` proxy and route handlers — **never exposed to the
client**, so the API key and GraphQL endpoint stay secret):

- `BOILERPLATE_GRAPHQL_ENDPOINT` - upstream GraphQL API endpoint
- `BOILERPLATE_API_KEY` - API key injected server-side by the proxy
- `BOILERPLATE_ORDER_EDITOR_API_KEY` - order-editor API key
- `BOILERPLATE_BASE_CATEGORY_ID` - root category ID
- `BOILERPLATE_MENU_DEPTH` - menu nesting depth
- `BOILERPLATE_ANONYMOUS_USER_ID` - anonymous user id
- `BOILERPLATE_DEFAULT_LANGUAGE` - default language (NL)
- `JWT_SECRET` - secret for signing/validating the auth cookie

## Key Features Implemented

### Shopping Cart
- Add products to cart
- Update quantities
- Remove items
- Persistent cart in localStorage
- Cart sidebar with slide-in animation
- Full cart page with checkout flow

### Product Catalog
- Category pages with product listings
- Product detail pages with image gallery
- Product cards with add-to-cart functionality
- Responsive grid layouts

### Authentication
- Login/Register pages wired to the Propeller SDK via server route handlers
- Auth token held in an httpOnly cookie (not readable from JS); `/api/graphql` injects the
  Bearer server-side
- User context for authentication state, protected routes, inactivity session timeout

## Migration from React App

This Next.js application is a migration from the existing React application located in `../propeller-react`. Key changes:

1. **Routing**: Migrated from React Router to Next.js App Router
2. **Environment Variables**: Changed from `REACT_APP_*` to `NEXT_PUBLIC_*`
3. **API Calls**: Adapted for Next.js server/client components
4. **State Management**: Maintained React Context for auth and cart
5. **Styling**: Continued with Tailwind CSS

## Development Guidelines

- Keep files under 200-300 lines of code
- Avoid code duplication
- No mocking data for dev/prod environments
- Use TypeScript for type safety
- Follow Next.js best practices for server/client components

## Build for Production

```bash
npm run build
npm start
```

## License

Private - Propeller Commerce
