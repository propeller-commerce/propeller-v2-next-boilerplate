# Cluster Card Implementation

## Overview
Implemented proper handling of both Product and Cluster items in category and search pages, following the propeller-sdk-v2 patterns.

## Components Created

### 1. ClusterCard (`components/common/ClusterCard.tsx`)
- Similar to ProductCard but designed for cluster products
- Uses `defaultProduct` for display information
- Links to `/cluster/{clusterId}/{slug}`
- Shows "View Cluster" button instead of "Add to Cart"
- Green button styling to differentiate from regular products

### 2. ProductOrClusterCard (`components/common/ProductOrClusterCard.tsx`)
- Smart wrapper component that decides which card to render
- Checks `item.class === Enums.ProductClass.CLUSTER` or presence of `clusterId`
- Renders `ClusterCard` for clusters, `ProductCard` for products
- Single component to use in listings

## Logic

```typescript
// Determines card type based on product class
const isCluster = item.class === Enums.ProductClass.CLUSTER || item.clusterId;

if (isCluster) {
  return <ClusterCard cluster={item} />;
}

return <ProductCard product={item} />;
```

## Pages Updated

### Category Page (`app/category/[id]/[slug]/page.tsx`)
- Replaced `ProductCard` with `ProductOrClusterCard`
- Automatically handles both products and clusters in listings
- Key uses both `productId` and `clusterId` for uniqueness

### Search Page (`app/search/[term]/page.tsx`)
- Replaced `ProductCard` with `ProductOrClusterCard`
- Properly typed with `Product | Cluster` union type
- Handles mixed results seamlessly

## Key Features

### ClusterCard Differences from ProductCard:
1. **Navigation**: Goes to `/cluster/` route instead of `/product/`
2. **No Quantity Selector**: Clusters are configured on their detail page
3. **No Add to Cart**: Shows "View Cluster" button instead
4. **Uses defaultProduct**: Displays info from cluster's default product
5. **Green Styling**: Different button color for visual distinction

### Type Safety:
- Uses proper types from `propeller-sdk-v2`
- Handles `Product | Cluster` union types
- Checks `Enums.ProductClass.CLUSTER` for accurate detection

## Usage Example

```tsx
// In any listing page
import ProductOrClusterCard from '@/components/common/ProductOrClusterCard';

// In render
{items.map((item) => (
  <ProductOrClusterCard 
    key={item.productId || item.clusterId} 
    item={item} 
  />
))}
```

## Benefits

1. **Automatic Detection**: No manual checking needed in parent components
2. **Consistent UI**: Both card types have similar layouts
3. **Type Safe**: Proper TypeScript types throughout
4. **Reusable**: Single component works everywhere
5. **Maintainable**: Changes to card logic in one place

## Build Status

✅ TypeScript: No errors
✅ Build: Successful
✅ All routes: Generated correctly

---

**Implementation Date**: November 11, 2025
