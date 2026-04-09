'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  Product,
  GraphQLClient,
  ProductService,
  PaginatedMediaDocumentResponse,
  PaginatedMediaVideoResponse,
  AttributeResult,
} from 'propeller-sdk-v2';
import ProductDescription from './ProductDescription';
import ProductSpecifications from './ProductSpecifications';
import ProductDownloads from './ProductDownloads';
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
  fetchedAttributes: AttributeResult[];
  hasDescription: () => boolean;
  isTabVisible: (tab: string) => boolean;
  isActive: (tab: string) => boolean;
  selectTab: (tab: string) => void;
  getLabel: (key: string, fallback: string) => string;
  getSpecsAttributes: () => AttributeResult[];
}
function ProductTabs(props: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<ProductTabsState['activeTab']>(() => 'description');
  const [specsVisited, setSpecsVisited] = useState<ProductTabsState['specsVisited']>(() => false);
  const [fetchedAttributes, setFetchedAttributes] = useState<ProductTabsState['fetchedAttributes']>(
    () => []
  );
  function getSpecsAttributes(): ReturnType<ProductTabsState['getSpecsAttributes']> {
    return fetchedAttributes.length
      ? fetchedAttributes
      : (props.product?.attributes?.items as AttributeResult[]) || [];
  }
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
      setSpecsVisited(true);
    } else if (props.showDownloads !== false) {
      setActiveTab('downloads');
    } else {
      setActiveTab('videos');
    }
  }, []);
  useEffect(() => {
    // Re-evaluate first visible tab when product data or language changes
    if (props.showDescription !== false && hasDescription()) {
      setActiveTab('description');
    }
  }, [props.product, props.language]);
  useEffect(() => {
    if (!props.productId || !props.graphqlClient) return;
    const service = new ProductService(props.graphqlClient as GraphQLClient);
    service
      .getAttributeResultByProductId(props.productId as number, {
        attributeDescription: {
          isPublic: true,
        },
        page: 1,
        offset: 2000,
      })
      .then((result: { items?: AttributeResult[] }) => {
        setFetchedAttributes(result?.items || []);
      })
      .catch(() => {});
  }, [props.productId]);
  return (
    <>
      {props.product ? (
        <>
          <div className={`product-tabs ${(props.className as string) || ''}`}>
            <div className="hidden md:block">
              <div className="flex border-b border-border">
                {isTabVisible('description') ? (
                  <button
                    type="button"
                    onClick={(event) => selectTab('description')}
                    className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${isActive('description') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                  >
                    {getLabel('description', 'Description')}
                  </button>
                ) : null}
                {isTabVisible('specifications') ? (
                  <button
                    type="button"
                    onClick={(event) => selectTab('specifications')}
                    className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${isActive('specifications') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                  >
                    {getLabel('specifications', 'Specifications')}
                  </button>
                ) : null}
                {isTabVisible('downloads') ? (
                  <button
                    type="button"
                    onClick={(event) => selectTab('downloads')}
                    className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${isActive('downloads') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                  >
                    {getLabel('downloads', 'Downloads')}
                  </button>
                ) : null}
                {isTabVisible('videos') ? (
                  <button
                    type="button"
                    onClick={(event) => selectTab('videos')}
                    className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${isActive('videos') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
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
                      attributes={getSpecsAttributes()}
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
            <div className="md:hidden divide-y divide-border border border-border rounded-lg">
              {isTabVisible('description') ? (
                <div>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                    onClick={(event) => {
                      setActiveTab(activeTab === 'description' ? '' : 'description');
                    }}
                  >
                    {getLabel('description', 'Description')}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${isActive('description') ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isActive('description') ? (
                    <div className="px-4 pb-4">
                      <ProductDescription
                        product={props.product}
                        language={props.language}
                        collapsed={props.descriptionCollapsed}
                        maxLength={props.descriptionMaxLength}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {isTabVisible('specifications') ? (
                <div>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                    onClick={(event) => {
                      if (activeTab !== 'specifications') {
                        setSpecsVisited(true);
                        setActiveTab('specifications');
                      } else {
                        setActiveTab('');
                      }
                    }}
                  >
                    {getLabel('specifications', 'Specifications')}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${isActive('specifications') ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {specsVisited && isActive('specifications') ? (
                    <div className="px-4 pb-4">
                      <ProductSpecifications
                        attributes={getSpecsAttributes()}
                        language={props.language}
                        layout={props.specificationsLayout}
                        grouping={props.specificationsGrouping}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {isTabVisible('downloads') ? (
                <div>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                    onClick={(event) => {
                      setActiveTab(activeTab === 'downloads' ? '' : 'downloads');
                    }}
                  >
                    {getLabel('downloads', 'Downloads')}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${isActive('downloads') ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isActive('downloads') ? (
                    <div className="px-4 pb-4">
                      <ProductDownloads
                        downloads={
                          (props.product as Product).media
                            ?.documents as PaginatedMediaDocumentResponse
                        }
                        language={(props.language as string) || 'NL'}
                        labels={props.downloadsLabels}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
              {isTabVisible('videos') ? (
                <div>
                  <button
                    type="button"
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                    onClick={(event) => {
                      setActiveTab(activeTab === 'videos' ? '' : 'videos');
                    }}
                  >
                    {getLabel('videos', 'Videos')}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform ${isActive('videos') ? 'rotate-180' : ''}`}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isActive('videos') ? (
                    <div className="px-4 pb-4">
                      <ProductVideos
                        videos={
                          (props.product as Product).media?.videos as PaginatedMediaVideoResponse
                        }
                        language={(props.language as string) || 'NL'}
                        labels={props.videosLabels}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

export default ProductTabs;
