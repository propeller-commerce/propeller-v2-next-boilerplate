'use client';

/**
 * Routes the UI package's images through `next/image`.
 *
 * Package components used to emit a bare `<img src="https://media.…">`, so
 * catalog images were fetched straight from the media CDN. That CDN sends no
 * `X-Robots-Tag` and serves no `robots.txt`, so those images sat outside this
 * storefront's crawler directives. Serving them through `/_next/image` puts the
 * bytes behind this origin and its headers.
 *
 * Hosts set this once on `<PropellerDepsProvider>`; every package component
 * picks it up, including ones added later.
 */

import Image from 'next/image';
import type { ImgComponentProps } from '@propeller-commerce/propeller-v2-core-ui';

/** Hosts `next/image` is allowed to fetch from — mirrors `next.config.ts`. */
const ALLOWED_HOSTS = [
  'api.staging.helice.cloud',
  'staging.media.helice.cloud',
  'media.helice.cloud',
  'playground2.dev.wp-propel.com',
  'images.ctfassets.net',
];

function isOptimizable(src: string): boolean {
  if (!src) return false;
  if (src.startsWith('/')) return true;
  try {
    return ALLOWED_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

export default function NextImageAdapter(props: ImgComponentProps) {
  const { src, alt, className, width, height, loading, onClick } = props;

  // A src outside `remotePatterns` throws at runtime in next/image, and the
  // package also renders non-catalog artwork. Degrade to a plain <img> rather
  // than break the page.
  if (!isOptimizable(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading}
        onClick={onClick as React.MouseEventHandler<HTMLImageElement> | undefined}
      />
    );
  }

  // `next/image` needs both dimensions or `fill`. Package surfaces mostly size
  // with CSS and pass none, so those take `fill`.
  if (typeof width === 'number' && typeof height === 'number') {
    return (
      <Image
        src={src}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading ?? 'lazy'}
        onClick={onClick as React.MouseEventHandler<HTMLImageElement> | undefined}
      />
    );
  }

  // `fill` positions against the nearest positioned ancestor, and several
  // package wrappers are sized but not `relative` (product/cluster cards, cart
  // thumbnails) — filling those would escape to a distant ancestor and break
  // the layout. Supplying our own `relative` wrapper keeps the behaviour
  // identical to the `<img>` it replaces, whatever the consumer's markup.
  //
  // A surface that only constrains with `max-*` has no size of its own — the
  // image itself sizes the box (the gallery lightbox). `fill` needs a sized
  // box, so it would collapse to nothing there. Use an unsized <img> instead
  // and keep the intrinsic sizing the markup is asking for.
  const classes = className ?? '';
  const intrinsic = /\bmax-[wh]-/.test(classes) && !/\b[wh]-(?!auto)/.test(classes.replace(/\bmax-[wh]-\S+/g, ''));
  if (intrinsic) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading ?? 'lazy'}
        onClick={onClick as React.MouseEventHandler<HTMLImageElement> | undefined}
      />
    );
  }

  // The wrapper has to carry `className`, because that is where the package puts
  // the SIZE (`w-16 h-16`, `h-full w-full`). Leaving it on the filled image
  // collapses the wrapper to zero in a flex row — the add-to-cart modal lost its
  // thumbnail that way. `object-*` is the one part the image itself needs.
  const objectFit = classes.match(/\bobject-(contain|cover|fill|none|scale-down)\b/)?.[0];
  return (
    <span className={`relative block overflow-hidden ${className ?? 'h-full w-full'}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className={objectFit ?? 'object-contain'}
        loading={loading ?? 'lazy'}
        onClick={onClick as React.MouseEventHandler<HTMLImageElement> | undefined}
        // The CDN already resizes via Fastly IO params, so without this the
        // smallest grid thumbnail still requests the full-size source.
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    </span>
  );
}
