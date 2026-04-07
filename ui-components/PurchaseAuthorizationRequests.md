# PurchaseAuthorizationRequests

Allows contacts with the `AUTHORIZATION_MANAGER` role to view and act on carts that purchasers have submitted for authorization.

Renders nothing if the logged-in user is not an authorization manager for the given company.

## Usage

```tsx
import PurchaseAuthorizationRequests from '@/components/propeller/PurchaseAuthorizationRequests';

<PurchaseAuthorizationRequests
  graphqlClient={graphqlClient}
  user={user}
  companyId={companyId}
  configuration={config}
  afterAcceptRequest={(cart) => { /* take over cart */ }}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | ✅ | — | Propeller SDK GraphQL client |
| `user` | `Contact \| Customer` | ✅ | — | Logged-in user (role is read from their PAC data) |
| `companyId` | `number` | ✅ | — | Active company ID |
| `onAcceptRequest` | `(cartId: string) => void` | — | — | Override default `acceptPurchaseAuthorizationRequest()` call |
| `afterAcceptRequest` | `(cart: Cart) => void` | — | — | Fires after request accepted; receives the accepted Cart |
| `onError` | `(err: Error) => void` | — | — | Called when an SDK operation fails |
| `labels` | `Record<string, string>` | — | `{}` | Override any displayed text |
| `className` | `string` | — | `''` | Additional CSS class |
| `configuration` | `Record<string, any>` | — | — | App config passthrough (imageSearchFiltersGrid, imageVariantFiltersSmall) |

## Labels

| Key | Default |
|-----|---------|
| `title` | `Authorization Requests` |
| `colId` | `#` |
| `colDate` | `Date` |
| `colQuantity` | `Quantity` |
| `colTotal` | `Total` |
| `colRequestedBy` | `Requested by` |
| `colActions` | `Actions` |
| `view` | `View` |
| `modalTitle` | `Authorization Request` |
| `requesterInfo` | `Requester` |
| `itemsTitle` | `Items` |
| `itemProduct` | `Product` |
| `itemQty` | `Qty` |
| `itemUnitPrice` | `Unit price` |
| `itemTotal` | `Total` |
| `totalExclVat` | `Total excl. VAT:` |
| `totalVat` | `VAT:` |
| `total` | `Total:` |
| `cancel` | `Cancel` |
| `acceptRequest` | `Accept request` |
| `accepting` | `Accepting...` |
| `empty` | `No pending authorization requests` |

## Role guard

Reads `user.purchaseAuthorizationConfigs.items` and checks for a PAC with `purchaseRole === AUTHORIZATION_MANAGER` and `company.companyId === companyId`. If not found, renders nothing.

## Data fetching

On mount and on every `companyId` change, calls `CartService.getCarts({ statuses: [PENDING_PURCHASE_AUTHORIZATION], companyIds: [companyId] })`.

When "View" is clicked, calls `CartService.getCart()` to fetch the full cart with items, delivery address, and totals.

## Cart takeover flow

On `/account/authorization-requests`, `afterAcceptRequest` is implemented to:
1. Serialize the manager's current cart to `localStorage['manager_cart']`
2. Call `saveCart(acceptedCart)` to replace the active cart in CartContext

The manager can then proceed to checkout with the accepted cart.

## SDK services

- `CartService.getCarts(CartSearchInput)` — list pending authorization carts
- `CartService.getCart(CartQueryVariables)` — fetch full cart for modal preview
- `CartService.acceptPurchaseAuthorizationRequest({ id })` — accept the authorization request

## CartSummary changes (companion change)

`CartSummary` was extended in the same feature to show a "Request Authorization" button for purchasers when:
- `cart.purchaseAuthorizationRequired === true`
- User has `PURCHASER` role for the active company
- `cart.total.totalNet > purchaser's authorizationLimit`

New CartSummary props: `graphqlClient?`, `user?`, `companyId?`, `onRequestAuthorization?`, `afterRequestAuthorization?`, `onError?`.
