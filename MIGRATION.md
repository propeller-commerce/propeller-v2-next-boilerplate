# Migration Guide: React to Next.js

This document outlines the migration from the React application (`../propeller-react`) to this Next.js application.

## Key Changes

### 1. Framework Migration
- **From**: Create React App with React Router
- **To**: Next.js 15+ with App Router

### 2. Routing
- **React Router** → **Next.js App Router**
  - `/category/:id/:slug` → `/app/category/[id]/[slug]/page.tsx`
  - `/product/:productId/:slug` → `/app/product/[productId]/[slug]/page.tsx`
  - `/cart` → `/app/cart/page.tsx`
  - `/login` → `/app/login/page.tsx`
  - `/register` → `/app/register/page.tsx`
  - `/account` → `/app/account/page.tsx`

### 3. Environment Variables
All environment variables changed from `REACT_APP_*` to `NEXT_PUBLIC_*`:
- `REACT_APP_GRAPHQL_ENDPOINT` → `NEXT_PUBLIC_GRAPHQL_ENDPOINT`
- `REACT_APP_API_KEY` → `NEXT_PUBLIC_API_KEY`
- `REACT_APP_DEFAULT_LANGUAGE` → `NEXT_PUBLIC_DEFAULT_LANGUAGE`
- etc.

### 4. Component Structure
- **Client Components**: Components using hooks or browser APIs marked with `'use client'`
- **Server Components**: Default for pages, can fetch data directly
- **Layout**: Root layout in `app/layout.tsx` wraps all pages

### 5. State Management
Maintained React Context for:
- **AuthContext**: User authentication state
- **CartContext**: Shopping cart state

### 6. API Integration
- Kept `propeller-sdk-v2` integration
- Simplified GraphQL client configuration in `lib/api.ts`
- Services: ProductService, CartService, UserService, CategoryService

## File Structure Comparison

### React App Structure
```
src/
├── components/
├── context/
├── pages/
├── routes/
├── services/
└── App.tsx
```

### Next.js App Structure
```
app/                    # Pages and routes
├── category/
├── product/
├── cart/
├── login/
├── register/
├── account/
├── layout.tsx         # Root layout
└── page.tsx           # Home page
components/            # React components
├── common/
└── layout/
context/              # React contexts
lib/                  # Utilities and services
├── api.ts
└── services/
```

## Components Migrated

### Core Components
- ✅ Header with cart and user menu
- ✅ Footer
- ✅ CartSidebar with slide-in animation
- ✅ ProductCard with add to cart
- ✅ Layout structure

### Pages Migrated
- ✅ Home page
- ✅ Category page (client-side)
- ✅ Product detail page (client-side)
- ✅ Cart page
- ✅ Login page (UI ready)
- ✅ Register page (UI ready)
- ✅ Account page

### Context Providers
- ✅ AuthContext
- ✅ CartContext

### Services
- ✅ GraphQL client configuration
- ✅ ProductService
- ✅ CartService
- ✅ UserService
- ✅ CategoryService
- ✅ MenuService

## What's Different

### 1. Data Fetching
**React (useEffect)**:
```tsx
useEffect(() => {
  fetchData();
}, []);
```

**Next.js (Server Component)**:
```tsx
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

**Next.js (Client Component)**:
```tsx
'use client';
export default function Page() {
  useEffect(() => {
    fetchData();
  }, []);
}
```

### 2. Navigation
**React Router**:
```tsx
import { Link, useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/path');
```

**Next.js**:
```tsx
import Link from 'next/link';
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/path');
```

### 3. Images
**React**:
```tsx
<img src={url} alt={alt} />
```

**Next.js**:
```tsx
import Image from 'next/image';
<Image src={url} alt={alt} fill className="object-cover" />
```

## Features Implemented

### Shopping Cart
- ✅ Add to cart functionality
- ✅ Update cart item quantities
- ✅ Remove items from cart
- ✅ Cart sidebar with slide-in animation
- ✅ Cart persistence in localStorage
- ✅ Toast notifications

### Product Catalog
- ✅ Category pages with product listings
- ✅ Product detail pages with gallery
- ✅ Product cards with quantity selector
- ✅ Image optimization with Next.js Image

### Authentication
- ✅ Login page (UI ready)
- ✅ Register page (UI ready)
- ✅ User context for auth state
- ✅ Protected routes support
- ⏳ Backend integration pending

## Still To Migrate

### Pages
- ⏳ Cluster pages
- ⏳ Search page with autocomplete
- ⏳ Checkout flow
- ⏳ Order history
- ⏳ Favorites/Wishlists
- ⏳ Address management

### Components
- ⏳ Filters sidebar for categories
- ⏳ Pagination component
- ⏳ Product tabs (specifications, downloads, videos)
- ⏳ Attribute selector
- ⏳ Cluster configurator

### Features
- ⏳ Menu service with expandable navigation
- ⏳ Search with autocomplete
- ⏳ User authentication (backend)
- ⏳ Order placement
- ⏳ Payment integration

## Running the Application

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
npm start
```

### Type Checking
```bash
npm run build  # Includes TypeScript checking
```

## Notes

### propeller-sdk-v2 Types
The SDK has strict TypeScript types. Some adjustments were made:
- Simplified image transformation filters
- Used empty transformations array where needed
- Converted itemId to string for cart operations

### Client vs Server Components
- Pages fetching data on client use `'use client'` directive
- Can be optimized later to use server components where appropriate
- Cart and Auth contexts require client-side state

### Image Domains
Configured in `next.config.ts`:
- `api.staging.helice.cloud`
- `playground2.dev.wp-propel.com`

## Next Steps

1. Complete remaining page migrations
2. Implement search functionality
3. Add filters and pagination to category pages
4. Complete authentication backend integration
5. Implement checkout flow
6. Add order management
7. Optimize with server components where possible
8. Add loading states and error boundaries
9. Implement SEO metadata
10. Add analytics and monitoring

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [propeller-sdk-v2 Documentation](https://github.com/propeller-commerce/propeller-sdk-v2)
