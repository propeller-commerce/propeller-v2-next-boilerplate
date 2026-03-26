import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductVideos

Renders product videos as embedded players (YouTube, Vimeo) or native HTML5 `<video>` elements. Automatically detects the video platform from the URI and converts it to an embeddable format. Resolves localized video URIs and titles based on the provided language code.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage on a product detail page

```tsx
import ProductVideos from '@/components/propeller/ProductVideos';

<ProductVideos
  videos={product.media.videos}
  language="EN"
/>
```

### With custom labels

```tsx
<ProductVideos
  videos={product.media.videos}
  language="NL"
  labels={{
    title: 'Productvideo\'s',
    empty: 'Geen video\'s beschikbaar',
  }}
/>
```

### With custom styling

```tsx
<ProductVideos
  videos={product.media.videos}
  language="EN"
  className="mt-6 max-w-2xl"
/>
```

### Conditionally rendering only when videos exist

```tsx
{product.media?.videos?.items?.length > 0 && (
  <ProductVideos
    videos={product.media.videos}
    language="EN"
    labels={{ title: 'Watch' }}
  />
)}
```

### Inside a tabbed product detail layout

```tsx
<Tabs>
  <Tab label="Description">
    <ProductDescription ... />
  </Tab>
  <Tab label="Videos">
    <ProductVideos
      videos={product.media.videos}
      language={currentLanguage}
    />
  </Tab>
</Tabs>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom video component, keep these points in mind:

1. **Accept `PaginatedMediaVideoResponse`** as your data shape. This is the standard format returned by the Propeller API for product media videos.

2. **Resolve localized fields manually.** Both `MediaVideo.videos` (URIs) and `MediaVideo.alt` (titles) are arrays of localized entries. Filter by language code and provide a fallback.

3. **Convert watch URLs to embed URLs.** YouTube and Vimeo watch/share URLs do not work inside iframes. Extract the video ID and construct the embed URL:
   - YouTube: `https://www.youtube.com/embed/{videoId}`
   - Vimeo: `https://player.vimeo.com/video/{videoId}`

4. **Use a 16:9 aspect ratio container for iframes.** Iframes do not auto-size to their content. The `padding-bottom: 56.25%` technique with `position: absolute` on the iframe ensures responsive sizing.

5. **Fall back to native `<video>` for non-embeddable URIs.** Self-hosted or CDN video files can be played directly with the HTML5 video element. Use `preload="metadata"` to keep initial page load light.

6. **Handle the empty state.** Always check `items.length` before rendering the list, and show a meaningful fallback message.

### Example skeleton

```tsx
function CustomProductVideos({ videos, language }: {
  videos: PaginatedMediaVideoResponse;
  language: string;
}) {
  const items = videos?.items || [];

  const resolveUri = (video: MediaVideo) => {
    const match = video.videos?.find(v => v.language === language);
    return match?.uri || video.videos?.[0]?.uri || '';
  };

  if (items.length === 0) {
    return <p>No videos available</p>;
  }

  return (
    <div>
      {items.map((video, i) => {
        const uri = resolveUri(video);
        const embedUrl = toEmbedUrl(uri); // your conversion logic
        return embedUrl !== uri
          ? <iframe key={i} src={embedUrl} ... />
          : <video key={i} controls src={uri} />;
      })}
    </div>
  );
}
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `videos` | `PaginatedMediaVideoResponse` | The video media object from the product. Pass `product.media.videos` directly. |
| `language` | `string` | Two-letter language code (e.g. `"EN"`, `"NL"`) used to resolve the correct localized video URI and title. Falls back to `"NL"` when empty. |

### Optional — Appearance

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | `undefined` | Additional CSS class applied to the root `<div>`. |

### Optional — Labels

| Prop | Type | Default | Description |
|---|---|---|---|
| `labels` | `Record<string, string>` | `undefined` | Override UI strings. Supported keys: `title` (heading above the video list, default `"Videos"`), `empty` (message when no videos exist, default `"No videos"`). |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderProductVideos(options: {
  videos: PaginatedMediaVideoResponse;
  language: string;
}): void
```

Types from `propeller-sdk-v2`: `PaginatedMediaVideoResponse`, `MediaVideo`.

### Options table

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `videos` | `PaginatedMediaVideoResponse` | *required* | `videos` prop — the video media object from `product.media.videos` |
| `language` | `string` | `'NL'` | `language` prop — language code for resolving localized video URIs and titles |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `className` — additional CSS class on the root element
- `labels` — UI string overrides (`title`, `empty`)

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|---|---|---|
| `title` | `"Videos"` | Heading above the video list |
| `empty` | `"No videos"` | Message when no videos exist |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  title: 'Videos',
  empty: 'No videos',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Platform detection and embedding

The component inspects each video URI to determine how to render it:

| Platform | URL patterns detected | Rendered as |
|---|---|---|
| YouTube | `youtube.com/watch?v=...`, `youtu.be/...` | `<iframe>` pointing to `youtube.com/embed/{id}` |
| Vimeo | `vimeo.com/{id}` | `<iframe>` pointing to `player.vimeo.com/video/{id}` |
| Other (self-hosted, CDN) | Any URI not matching above | Native `<video>` element with controls |

Embedded iframes use a 16:9 aspect ratio (`padding-bottom: 56.25%`) and load lazily. They allow accelerometer, autoplay, clipboard-write, encrypted-media, gyroscope, and picture-in-picture permissions.

Native video players use `preload="metadata"` to avoid downloading full video files until the user hits play.

### Empty state

When `videos.items` is empty or not provided, the component renders a muted text message (default: "No videos"). The heading is hidden in this case.

### Rendering order

Videos are rendered in the same order they appear in the `items` array. Each video is wrapped in a rounded, bordered container with a black background.

---

## GraphQL Query Example

When fetching a product, include the `media.videos` field to supply data to this component:

```graphql
query GetProduct($productId: Int!, $language: String) {
  product(id: $productId, language: $language) {
    productId
    name {
      language
      value
    }
    media {
      videos {
        items {
          videos {
            language
            uri
          }
          alt {
            language
            value
          }
        }
      }
    }
  }
}
```

---

## SDK Services

This component does **not** call any SDK service directly. It is a presentational component that receives data through its `videos` prop.

### Product fields consumed

The `videos` prop expects the `PaginatedMediaVideoResponse` type, which is found at `product.media.videos`. The component reads the following nested fields:

| Field path | Type | Purpose |
|---|---|---|
| `videos.items` | `MediaVideo[]` | The list of video entries to render. |
| `videos.items[].videos` | `LocalizedVideo[]` | Localized video URIs. Each entry has `language` (string) and `uri` (string). |
| `videos.items[].alt` | `LocalizedString[]` | Localized alt text / titles. Each entry has `language` (string) and `value` (string). |

### Language resolution

For both URIs and titles, the component:

1. Searches the localized array for an entry matching the `language` prop.
2. Falls back to the first entry in the array if no match is found.
3. Falls back to an empty string (URI) or `"Video"` (title) if the array is empty.
