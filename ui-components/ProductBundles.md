# ProductBundles Component (Combo Deals)

Displays product bundles / combo deals related to a product. Shows bundled items, pricing with discounts, and an "Add bundle to cart" button.

## File Locations

- **Mitosis source**: `ui-components/ProductBundles.lite.tsx`
- **React (active)**: `components/propeller/ProductBundles.tsx`
- **Compiled output**: `output/react/ui-components/ProductBundles.tsx`

## Usage

### Minimal

```tsx
<ProductBundles
  graphqlClient={graphqlClient}
  productId={12345}
  language="NL"
  taxZone="NL"
  onAddBundleToCart={(bundleId, quantity) => {
    cartService.addBundleToCart({ id: cartId, input: { bundleId, quantity }, language: 'NL', imageSearchFilters, imageVariantFilters });
  }}
/>
```

### Full

```tsx
<ProductBundles
  graphqlClient={graphqlClient}
  productId={12345}
  language="NL"
  taxZone="NL"
  user={authState.user}
  portalMode="open"
  showIndividualItems={true}
  layout="horizontal"
  labels={{
    title: 'Combo deal',
    addToCart: 'Add bundle to cart',
    youSave: 'You save',
    leaderItem: 'Main product',
    condition_ALL: 'Discount on all items',
    condition_EP: 'Discount on extra items',
    loginToSeePrices: 'Log in to see prices',
  }}
  onAddBundleToCart={(bundleId, quantity) => {
    cartService.addBundleToCart({
      id: cart?.cartId,
      input: { bundleId, quantity },
      language: 'NL',
      imageSearchFilters: { page: 1, offset: 1 },
      imageVariantFilters: { transformations: [{ name: 'cart', transformation: { format: 'WEBP', height: 100, width: 100, fit: 'BOUNDS' } }] },
    }).then(updatedCart => saveCart(updatedCart));
  }}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| graphqlClient | GraphQLClient | Yes | — | Propeller SDK client |
| productId | number | Yes | — | Product ID to fetch bundles for |
| language | string | Yes | — | Language code |
| taxZone | string | Yes | — | Tax zone for pricing |
| includeTax | boolean | No | localStorage | Overrides PriceToggle state |
| portalMode | string | No | 'open' | 'semi-closed' hides prices for anonymous users |
| user | Contact \| Customer | No | null | Authenticated user |
| stockValidation | boolean | No | false | Validate stock before purchase |
| showIndividualItems | boolean | No | true | Show individual bundled products |
| layout | string | No | 'horizontal' | 'vertical', 'horizontal', or 'compact' |
| labels | Record<string, string> | No | {} | UI string overrides |
| onAddBundleToCart | (bundleId: string, qty: number) => void | Yes | — | Cart callback |
| className | string | No | 'mb-12' | Container CSS class |

## Labels

| Key | Default | Description |
|-----|---------|-------------|
| title | Combo deal | Fallback bundle title |
| addToCart | Add bundle to cart | Button text |
| adding | Adding... | Button text while adding |
| youSave | You save | Savings label |
| leaderItem | Main product | Leader item badge |
| condition_ALL | Discount on all items | ALL condition label |
| condition_EP | Discount on extra items | EP condition label |
| loginToSeePrices | Log in to see prices and add to cart | Semi-closed mode message |

## Behavior

- **No bundles**: Component renders nothing (returns null)
- **Loading**: Shows skeleton placeholder
- **Multiple bundles**: Renders each bundle as a separate card
- **Discount badge**: Shows percentage discount when bundle price < original price
- **Semi-closed portal**: Hides prices and add-to-cart button, shows login prompt
- **PriceToggle**: Listens for `priceToggleChanged` event (same as ProductCard/ProductSlider)
- **Leader items**: Bundle items with `isLeader: 'Y'` are marked as "Main product"
- **Bundle condition**: `ALL` = discount on all items, `EP` = discount on extra products only

## SDK Notes

- **Bundle ID is a string** (not number) — matches `CartAddBundleInput.bundleId`
- **BundlePrice**: `net` = incl. VAT, `gross` = excl. VAT, `originalNet`/`originalGross` = before discount
- **SDK bug**: `BundleService.getBundles()` has same query variable declaration bug as `CrossupsellService.getCrossupsells()`. Uses `executeQuery` workaround. Will work with standard `getBundles()` once SDK is fixed.
- **Cart integration**: `CartService.addBundleToCart()` works correctly (mutation properly declares variables)
