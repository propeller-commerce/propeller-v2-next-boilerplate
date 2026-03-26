'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import type { Product, Cluster, LocalizedString } from 'propeller-sdk-v2';

export interface ProductDescriptionProps {
  /**
   * Product or Cluster object.
   * The component reads `product.descriptions` (an array of LocalizedString)
   * and renders the matching language entry as HTML.
   */
  product: Product | Cluster;

  /**
   * Language code used to resolve the correct localised description.
   * Defaults to 'NL'.
   */
  language?: string;

  /**
   * When true, the description is initially collapsed to `maxLength` characters.
   * A "Read more" / "Read less" toggle is shown.
   * Defaults to false.
   */
  collapsed?: boolean;

  /**
   * Maximum number of characters shown when collapsed.
   * Set to 0 to display the entire description without truncation.
   * Defaults to 0.
   */
  maxLength?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface ProductDescriptionState {
  expanded: boolean;
  html: string;
  getDescription: () => string;
  getMaxLen: () => number;
  shouldTruncate: () => boolean;
  getTruncated: () => string;
  toggle: () => void;
}

function ProductDescription(props: ProductDescriptionProps) {
  const [expanded, setExpanded] = useState<ProductDescriptionState['expanded']>(() => false);
  const [html, setHtml] = useState<ProductDescriptionState['html']>(() => '');
  function getDescription(): ReturnType<ProductDescriptionState['getDescription']> {
    const product = props.product as Product;
    if (!product?.descriptions) return '';
    const lang = (props.language as string) || 'NL';
    const match = product.descriptions.find((d: LocalizedString) => d.language === lang);
    return match?.value || product.descriptions?.[0]?.value || '';
  }

  function getMaxLen(): ReturnType<ProductDescriptionState['getMaxLen']> {
    const max = props.maxLength;
    if (!max || (max as number) <= 0) return 0;
    return max as number;
  }

  function shouldTruncate(): ReturnType<ProductDescriptionState['shouldTruncate']> {
    if (props.collapsed === false) return false;
    if (!props.collapsed) return false;
    const maxLen = getMaxLen();
    if (maxLen === 0) return false;
    const plain = html.replace(/<[^>]*>/g, '');
    return plain.length > maxLen;
  }

  function getTruncated(): ReturnType<ProductDescriptionState['getTruncated']> {
    const plain = html.replace(/<[^>]*>/g, '');
    const maxLen = getMaxLen();
    if (maxLen === 0 || plain.length <= maxLen) return html;
    const truncated = plain.substring(0, maxLen);
    return truncated.substring(0, truncated.lastIndexOf(' ')) + '\u2026';
  }

  function toggle(): ReturnType<ProductDescriptionState['toggle']> {
    setExpanded(!expanded);
  }

  useEffect(() => {
    setHtml(getDescription());
  }, [props.product, props.language]);
  return (
    <>
      {!!html ? (
        <>
          <div className={`product-description ${(props.className as string) || ''}`}>
            {!shouldTruncate() || expanded ? (
              <div
                className="prose prose-slate max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{
                  __html: html,
                }}
              />
            ) : null}
            {shouldTruncate() && !expanded ? (
              <p className="text-muted-foreground">{getTruncated()}</p>
            ) : null}
            {shouldTruncate() ? (
              <button
                type="button"
                className="mt-2 text-sm font-medium text-primary hover:underline"
                onClick={(event) => toggle()}
              >
                {expanded ? <>Read less</> : null}
                {!expanded ? <>Read more</> : null}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}

export default ProductDescription;
