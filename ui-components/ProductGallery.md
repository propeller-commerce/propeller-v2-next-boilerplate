import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductGallery

Image gallery for product detail pages with thumbnail navigation, hover zoom, and fullscreen lightbox.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage

```tsx
<ProductGallery
  images={[
    'https://cdn.example.com/products/shoe-front.jpg',
    'https://cdn.example.com/products/shoe-side.jpg',
    'https://cdn.example.com/products/shoe-back.jpg',
  ]}
/>
```

### With product data from the SDK

```tsx
const images = product.media?.images?.items?.flatMap(
  (item) => item.imageVariants?.map((v) => v.url) ?? []
) ?? [];

<ProductGallery images={images} />
```

### Thumbnails disabled (single hero image)

```tsx
<ProductGallery images={images} showThumbnails={false} />
```

### Zoom and lightbox disabled (static display)

```tsx
<ProductGallery
  images={images}
  enableZoom={false}
  enableLightbox={false}
/>
```

### Custom styling

```tsx
<ProductGallery images={images} className="max-w-lg mx-auto" />
```

### Loading / skeleton state

Pass an empty array while data is loading. The component renders an SVG placeholder automatically.

```tsx
const [images, setImages] = useState<string[]>([]);

<ProductGallery images={images} />
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To replace or extend this component, implement the following:

1. **Accept a `string[]` of image URLs.** Keep the component decoupled from the SDK -- let the parent extract URLs from the product object.

2. **Track `selectedIndex` state** to control which image is displayed as the main image.

3. **Thumbnail strip.** Render a scrollable row of clickable thumbnails. Highlight the active one. Hide the strip when there is only one image.

4. **Lightbox overlay.** Use a fixed-position overlay (`z-50`) with backdrop click to close. Add prev/next buttons that wrap around the image array. Always call `stopPropagation` on interactive elements inside the overlay.

5. **Zoom behavior.** CSS `hover:scale-*` on the main image is the simplest approach. For a magnifier loupe, track mouse position and render a clipped, enlarged copy of the image.

6. **Empty state.** Render a placeholder (SVG icon, skeleton box, or spinner) when the images array is empty so the layout does not collapse.

7. **Accessibility.** Add `aria-label` attributes to navigation buttons. Consider keyboard navigation (arrow keys in lightbox, Escape to close).

### Extracting images from product data

```ts
// All variants of the first image
const firstImageVariants =
  product.media?.images?.items?.[0]?.imageVariants?.map((v) => v.url) ?? [];

// One variant per image (e.g. the first/largest variant of each)
const onePerImage =
  product.media?.images?.items?.map(
    (item) => item.imageVariants?.[0]?.url ?? ''
  ).filter(Boolean) ?? [];
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Image Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `images` | `string[]` | *(required)* | Array of image URLs to display. An empty array triggers the skeleton/placeholder state. |

### Display Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showThumbnails` | `boolean` | `true` | Show the horizontal thumbnail strip below the main image. Hidden automatically when only one image is provided. |
| `enableZoom` | `boolean` | `true` | Show a zoom-in cursor on hover and apply a subtle scale-up effect on the main image. |
| `enableLightbox` | `boolean` | `true` | Allow clicking the main image to open a fullscreen overlay. |

### Layout

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `undefined` | Additional CSS class(es) applied to the root `<div>`. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderProductGallery(
  images: string[]
): void
```

The component is data-agnostic: it accepts plain `string[]` URLs. The URLs typically come from the Propeller product media structure (`product.media.images.items[].imageVariants[].url`).

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `images` | `string[]` | *(required)* | `images` prop |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `showThumbnails` — toggle thumbnail strip visibility
- `enableZoom` — toggle hover zoom effect
- `enableLightbox` — toggle fullscreen lightbox on click
- `className` — extra CSS class on the root element

  </TabItem>
</Tabs>

---

## Behavior

### Thumbnail Navigation

- Thumbnails appear in a horizontal strip below the main image when `showThumbnails` is `true` (default) and more than one image is provided.
- Clicking a thumbnail immediately switches the main image.
- The active thumbnail is highlighted with a primary-color border and ring.
- The strip scrolls horizontally (`overflow-x-auto`) when thumbnails exceed the container width.

### Zoom

- When `enableZoom` is `true`, hovering the main image shows a `cursor-zoom-in` pointer and scales the image up slightly (`hover:scale-105`).
- This is a CSS-only effect; no magnifier loupe is rendered.

### Fullscreen Lightbox

- Clicking the main image (when `enableLightbox` is `true`) opens a fixed overlay covering the viewport with a semi-transparent black backdrop.
- The lightbox displays the current image at maximum size while preserving aspect ratio.
- Navigation arrows (previous / next) appear on the left and right edges when multiple images exist. Clicking wraps around (last image -> first, and vice versa).
- A close button sits in the top-right corner.
- Clicking the backdrop (outside the image) also closes the lightbox.
- Click events on the image and controls call `stopPropagation` so they do not accidentally close the overlay.

### Responsive

- The main image area uses `aspect-square` to maintain a 1:1 ratio at any width.
- Images use `object-contain` with padding (`p-8`) so they are never cropped.
- Thumbnails are fixed at 80x80px (`w-20 h-20`) with `flex-shrink-0`, scrolling horizontally on smaller screens.
- The lightbox is fully responsive: `max-h-full max-w-full` ensures the image fits any viewport.

### Empty / Loading State

- When `images` is an empty array the component renders a light gray placeholder with an SVG image icon, serving as a skeleton state while data loads.

---

## GraphQL Query Example

Request product images with specific transformations using `imageVariantFilters`:

```graphql
query ProductWithImages($productId: Int!) {
  product(id: $productId) {
    productId
    name {
      value
    }
    media {
      images {
        items {
          imageVariants(input: {
            transformations: [
              { name: "fill", width: 800, height: 800 }
            ]
          }) {
            url
          }
        }
      }
    }
  }
}
```

> **Note:** The `transformations` array must not be empty. The Propeller API rejects an empty `{}` for `imageVariantFilters`.

---

## SDK Services -- Product Media Fields

The component itself is data-agnostic: it accepts plain `string[]` URLs. The URLs typically come from the Propeller product media structure.

### Fields read from a `Product` object

```
product
  └─ media
       └─ images
            └─ items[]
                 └─ imageVariants[]
                      └─ url        <-- the URL string you pass to `images`
```

Each `items` entry represents one product image. Each image can have multiple `imageVariants` (different sizes/transforms). Pick the variant that suits your display size.

### Extracting images

```ts
// All variants of the first image
const firstImageVariants =
  product.media?.images?.items?.[0]?.imageVariants?.map((v) => v.url) ?? [];

// One variant per image (e.g. the first/largest variant of each)
const onePerImage =
  product.media?.images?.items?.map(
    (item) => item.imageVariants?.[0]?.url ?? ''
  ).filter(Boolean) ?? [];
```
