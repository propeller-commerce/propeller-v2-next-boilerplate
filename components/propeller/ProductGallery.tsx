'use client';
import * as React from 'react';

import { useState } from 'react';

export interface ProductGalleryProps {
  /**
   * Array of image URLs to display.
   * Obtain from: `product.media?.images?.items?.[0]?.imageVariants?.map(v => v.url)`
   * Component is in skeleton/loading state when this is an empty array.
   */
  images: string[];

  /** Show image thumbnails below the main image. Defaults to true. */
  showThumbnails?: boolean;

  /** Enable cursor-zoom-in hint on the main image. Defaults to true. */
  enableZoom?: boolean;

  /** Enable fullscreen lightbox when clicking the main image. Defaults to true. */
  enableLightbox?: boolean;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
function ProductGallery(props: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const images = props.images || [];
  const mainImage = images.length === 0 ? '' : images[selectedIndex] || images[0] || '';
  const hasThumbnails = images.length > 1;
  function openLightbox(): void {
    if (props.enableLightbox !== false) setLightboxOpen(true);
  }
  function prevImage(): void {
    if (images.length === 0) return;
    setSelectedIndex((idx) => (idx - 1 + images.length) % images.length);
  }
  function nextImage(): void {
    if (images.length === 0) return;
    setSelectedIndex((idx) => (idx + 1) % images.length);
  }
  return (
    <div className={`propeller-product-gallery ${props.className || ''}`}>
      <div className="propeller-product-gallery__stage relative aspect-square bg-card overflow-hidden">
        {images.length === 0 ? (
          <div className="propeller-product-gallery__empty flex h-full w-full items-center justify-center bg-surface-hover">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="propeller-product-gallery__empty-icon h-24 w-24 text-foreground-subtle"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                strokeWidth={1}
              />
            </svg>
          </div>
        ) : null}
        {images.length > 0 ? (
          <img
            alt="Product image"
            src={mainImage}
            onClick={openLightbox}
            className={`h-full w-full object-contain p-8 transition-transform duration-200 ${props.enableZoom !== false ? 'cursor-zoom-in hover:scale-105' : ''}`}
          />
        ) : null}
      </div>
      {props.showThumbnails !== false && hasThumbnails ? (
        <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              type="button"
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`propeller-product-gallery__thumbnail relative flex-shrink-0 w-20 h-20 rounded-container border-2 overflow-hidden transition-all bg-card ${selectedIndex === index ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'}`}
            >
              <img
                className="w-full h-full object-contain p-1"
                src={img}
                alt={`Product image ${index + 1}`}
              />
            </button>
          ))}
        </div>
      ) : null}
      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
                strokeWidth={2}
              />
            </svg>
          </button>
          {hasThumbnails ? (
            <button
              type="button"
              aria-label="Previous image"
              className="absolute left-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                  strokeWidth={2}
                />
              </svg>
            </button>
          ) : null}
          <img
            alt="Product image fullscreen"
            className="max-h-full max-w-full object-contain rounded-lg"
            src={mainImage}
            onClick={(e) => e.stopPropagation()}
          />
          {hasThumbnails ? (
            <button
              type="button"
              aria-label="Next image"
              className="absolute right-4 z-10 rounded-full bg-white/20 p-2 text-white hover:bg-white/40 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                  strokeWidth={2}
                />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default ProductGallery;
