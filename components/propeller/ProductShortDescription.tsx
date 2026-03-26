'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
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
interface ProductShortDescriptionState {
  html: string;
  getShortDescription: () => string;
}
function ProductShortDescription(props: ProductShortDescriptionProps) {
  const [html, setHtml] = useState<ProductShortDescriptionState['html']>(() => '');
  function getShortDescription(): ReturnType<ProductShortDescriptionState['getShortDescription']> {
    const product = props.product as Product;
    if (!product?.shortDescriptions) return '';
    const lang = (props.language as string) || 'NL';
    const match = product.shortDescriptions.find((d: LocalizedString) => d.language === lang);
    return match?.value || product.shortDescriptions?.[0]?.value || '';
  }
  useEffect(() => {
    setHtml(getShortDescription());
  }, [props.product, props.language]);
  return (
    <>
      {!!html ? (
        <>
          <div
            dangerouslySetInnerHTML={{
              __html: html,
            }}
            className={`product-short-description prose prose-slate max-w-none text-muted-foreground ${(props.className as string) || ''}`}
          />
        </>
      ) : null}
    </>
  );
}

export default ProductShortDescription;
