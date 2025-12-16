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

- **Next.js 15+** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **propeller-sdk-v2** for GraphQL API integration
- **React Hot Toast** for notifications

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
├── components/            # React components
│   ├── common/           # Reusable components (ProductCard, etc.)
│   └── layout/           # Layout components (Header, Footer, CartSidebar)
├── context/              # React context providers
│   ├── AuthContext.tsx   # Authentication state
│   └── CartContext.tsx   # Shopping cart state
├── lib/                  # Utilities and services
│   ├── api.ts           # GraphQL client configuration
│   └── services/        # Service layer (MenuService, etc.)
└── types/               # TypeScript type definitions
```

## Environment Variables

All environment variables are prefixed with `NEXT_PUBLIC_` for client-side access:

- `NEXT_PUBLIC_GRAPHQL_ENDPOINT` - GraphQL API endpoint
- `NEXT_PUBLIC_API_KEY` - API key for authentication
- `NEXT_PUBLIC_DEFAULT_LANGUAGE` - Default language (NL)
- `NEXT_PUBLIC_BASE_CATEGORY_ID` - Root category ID
- `NEXT_PUBLIC_MENU_DEPTH` - Menu nesting depth

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
- Login/Register pages (UI ready, backend integration pending)
- User context for authentication state
- Protected routes support

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
