---
inclusion: always
---

# Product Details Page

## Goal
Build a Product Details Page that fetches product data with `getProduct` from `propeller-sdk-v2`.

## Layout
Full-width (95%) layout divided into:
- Top: Gallery left, product info & purchase right
- Bottom: Info tabs (description, specifications, downloads, videos)

## Variables for getProduct
- Extract `productId` and `slug` from URL
- Pass language and user info if authenticated
- Use imageSearchFilters and imageVariantFilters for high-res images

## Top Section
Left half: Product gallery
- Main large image
- Thumbnail carousel below
- Click thumbnail to change main image

Right half: Product details
- Title and category link
- SKU and price
- Stock information
- Short description
- Quantity selector
- Add to Cart button

## Tabs Below
Four tabs:
1. **Description**: Full product description
2. **Specifications**: Product attributes
3. **Downloads**: Document links
4. **Videos**: Video embeds

## Navigation
- Product URL: `/product/{productId}/{slug}`
- Category URL: `/category/{categoryId}/{slug}`

status: active
