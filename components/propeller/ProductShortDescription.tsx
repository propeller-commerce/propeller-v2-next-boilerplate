'use client';
import * as React from 'react';

import type { Product, Cluster, LocalizedString } from 'propeller-sdk-v2';

export interface ProductShortDescriptionProps {
  /**
   * Product or Cluster object.
   * The component reads `product.shortDescriptions` (an array of LocalizedString)
   * and renders the matching language entry as HTML.
   */
  product: Product | Cluster;

  /**
   * Language code used to resolve the correct localised short description.
   * Defaults to 'NL'.
   */
  language?: string;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
function ProductShortDescription(props: ProductShortDescriptionProps) {
  // Derived from props — pure render-time computation, no state needed.
  function getShortDescription(): string {
    const product = props.product as Product;
    if (!product?.shortDescriptions) return '';
    const lang = props.language || 'NL';
    const match = product.shortDescriptions.find((d: LocalizedString) => d.language === lang);
    return match?.value || product.shortDescriptions?.[0]?.value || '';
  }
  const html = getShortDescription();
  return (
    <>
      {!!html ? (
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className={`propeller-product-short-description prose prose-slate max-w-none text-muted-foreground ${props.className || ''}`}
        />
      ) : null}
    </>
  );
}

export default ProductShortDescription;
