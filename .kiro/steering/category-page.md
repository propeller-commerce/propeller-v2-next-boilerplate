---
inclusion: always
---

# Category Page

## Goal
Implement a Category Page using the `getCategory` method from `propeller-sdk-v2/CategoryService`.

## Input Variables
- Extract `categoryId` and `slug` from URL
- Pass user info if logged in (contactId/companyId or customerId)
- Always pass:
  - `hidden: 'N'`
  - `language: NEXT_PUBLIC_DEFAULT_LANGUAGE`
  - `priceCalculateProductInput.taxZone`
  - User IDs if authenticated

## Page Layout
- Show category name and description
- Product/Cluster grid (12 per page)
- Filters sidebar on left
- Pagination at bottom

## Product/Cluster Grid
For each product:
- If `class` is `PRODUCT`: show product card with add to cart
- If `class` is `CLUSTER`: show cluster card with "View Cluster" button
- Link to appropriate detail page

## Pagination
Use `category.products.pages` data to show pagination controls.

## Filters Sidebar
- Price slider using min/max price
- Attribute filters as accordions
- Checkboxes for filter values
- Update URL params and refetch on change

status: active
