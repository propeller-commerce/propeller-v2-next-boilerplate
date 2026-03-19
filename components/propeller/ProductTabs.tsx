'use client';

import {
  AttributeResult,
  GraphQLClient,
  PaginatedMediaDocumentResponse,
  PaginatedMediaVideoResponse,
  Product,
} from 'propeller-sdk-v2';
import { useEffect, useState } from 'react';
import ProductDescription from './ProductDescription';
import ProductDownloads from './ProductDownloads';
import ProductSpecifications from './ProductSpecifications';
import ProductVideos from './ProductVideos';

export interface ProductTabsProps {
  /** Product for which to display the information. */
  product: Product;

  // ── Tab visibility ────────────────────────────────────────────────────────

  /** If true, displays the Description tab. Defaults to true. */
  showDescription?: boolean;

  /** If true, displays the Specifications tab. Defaults to true. */
  showSpecifications?: boolean;

  /** If true, displays the Downloads tab. Defaults to true. */
  showDownloads?: boolean;

  /** If true, displays the Videos tab. Defaults to true. */
  showVideos?: boolean;

  // ── Shared ────────────────────────────────────────────────────────────────

  /**
   * Language code passed to all sub-components.
   * Defaults to 'NL'.
   */
  language?: string;

  /**
   * Override the tab button labels.
   * Available keys: description, specifications, downloads, videos
   */
  labels?: Record<string, string>;

  // ── Description tab ───────────────────────────────────────────────────────

  /**
   * When true, the description is initially collapsed to `descriptionMaxLength` characters.
   * A "Read more" / "Read less" toggle is shown.
   * Passed as `collapsed` to ProductDescription. Defaults to false.
   */
  descriptionCollapsed?: boolean;

  /**
   * Maximum number of characters shown when the description is collapsed.
   * Passed as `maxLength` to ProductDescription. Defaults to 0 (no truncation).
   */
  descriptionMaxLength?: number;

  // ── Specifications tab ────────────────────────────────────────────────────

  /**
   * Initialised Propeller SDK GraphQL client.
   * Passed to ProductSpecifications for internal attribute fetching.
   */
  graphqlClient?: GraphQLClient;

  /**
   * Product ID to fetch attributes for.
   * Passed to ProductSpecifications for internal attribute fetching.
   */
  productId?: number;

  /**
   * Display layout for the specifications.
   * 'table' — two-column table (name | value). Default.
   * 'list'  — vertical label + value stacked rows.
   * Passed as `layout` to ProductSpecifications.
   */
  specificationsLayout?: string;

  /**
   * When true, groups specifications by their group field with a heading per section.
   * When false or omitted, displays a flat ungrouped table. Default: false.
   * Passed as `grouping` to ProductSpecifications.
   */
  specificationsGrouping?: boolean;

  // ── Downloads tab ─────────────────────────────────────────────────────────

  /**
   * Override UI strings for the Downloads section.
   * Available keys: title, download
   * Passed as `labels` to ProductDownloads.
   */
  downloadsLabels?: Record<string, string>;

  // ── Videos tab ───────────────────────────────────────────────────────────

  /**
   * Override UI strings for the Videos section.
   * Available key: title
   * Passed as `labels` to ProductVideos.
   */
  videosLabels?: Record<string, string>;

  // ── Root ─────────────────────────────────────────────────────────────────

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface ProductTabsState {
  activeTab: string;
  specsVisited: boolean;
  hasDescription: () => boolean;
  isTabVisible: (tab: string) => boolean;
  isActive: (tab: string) => boolean;
  selectTab: (tab: string) => void;
  getLabel: (key: string, fallback: string) => string;
}

function ProductTabs(props: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<ProductTabsState['activeTab']>(() => 'description');

  const [specsVisited, setSpecsVisited] = useState<ProductTabsState['specsVisited']>(() => false);

  function hasDescription(): ReturnType<ProductTabsState['hasDescription']> {
    const lang = props.language || 'NL';
    const descriptions = props.product?.descriptions;
    if (!descriptions || descriptions.length === 0) return false;
    const match = descriptions.find((d) => d.language === lang);
    return !!(match?.value || descriptions[0]?.value);
  }

  function isTabVisible(tab: string): ReturnType<ProductTabsState['isTabVisible']> {
    if (tab === 'description') return props.showDescription !== false && hasDescription();
    if (tab === 'specifications') return props.showSpecifications !== false;
    if (tab === 'downloads') return props.showDownloads !== false;
    if (tab === 'videos') return props.showVideos !== false;
    return false;
  }

  function isActive(tab: string): ReturnType<ProductTabsState['isActive']> {
    return activeTab === tab;
  }

  function selectTab(tab: string): ReturnType<ProductTabsState['selectTab']> {
    if (tab === 'specifications') {
      setSpecsVisited(true);
    }
    setActiveTab(tab);
  }

  function getLabel(key: string, fallback: string): ReturnType<ProductTabsState['getLabel']> {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  useEffect(() => {
    // Set the first visible tab as active
    if (props.showDescription !== false && hasDescription()) {
      setActiveTab('description');
    } else if (props.showSpecifications !== false) {
      setActiveTab('specifications');
    } else if (props.showDownloads !== false) {
      setActiveTab('downloads');
    } else {
      setActiveTab('videos');
    }
  }, []);

  return (
    <div className={`product-tabs ${(props.className as string) || ''}`}>
      <div className="flex border-b border-border">
        {isTabVisible('description') ? (
          <button
            type="button"
            onClick={(event) => selectTab('description')}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive('description')
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {getLabel('description', 'Description')}
          </button>
        ) : null}
        {isTabVisible('specifications') ? (
          <button
            type="button"
            onClick={(event) => selectTab('specifications')}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive('specifications')
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {getLabel('specifications', 'Specifications')}
          </button>
        ) : null}
        {isTabVisible('downloads') ? (
          <button
            type="button"
            onClick={(event) => selectTab('downloads')}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive('downloads')
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {getLabel('downloads', 'Downloads')}
          </button>
        ) : null}
        {isTabVisible('videos') ? (
          <button
            type="button"
            onClick={(event) => selectTab('videos')}
            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive('videos')
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {getLabel('videos', 'Videos')}
          </button>
        ) : null}
      </div>
      <div className="pt-6">
        {isActive('description') && isTabVisible('description') ? (
          <ProductDescription
            product={props.product}
            language={props.language}
            collapsed={props.descriptionCollapsed}
            maxLength={props.descriptionMaxLength}
          />
        ) : null}
        {specsVisited && isTabVisible('specifications') ? (
          <div className={isActive('specifications') ? '' : 'hidden'}>
            <ProductSpecifications
              attributes={props.product.attributes?.items as AttributeResult[]}
              productId={props.productId}
              graphqlClient={props.graphqlClient}
              language={props.language}
              layout={props.specificationsLayout}
              grouping={props.specificationsGrouping}
            />
          </div>
        ) : null}
        {isActive('downloads') && isTabVisible('downloads') ? (
          <ProductDownloads
            downloads={
              (props.product as Product).media?.documents as PaginatedMediaDocumentResponse
            }
            language={(props.language as string) || 'NL'}
            labels={props.downloadsLabels}
          />
        ) : null}
        {isActive('videos') && isTabVisible('videos') ? (
          <ProductVideos
            videos={(props.product as Product).media?.videos as PaginatedMediaVideoResponse}
            language={(props.language as string) || 'NL'}
            labels={props.videosLabels}
          />
        ) : null}
      </div>
    </div>
  );
}

export default ProductTabs;
