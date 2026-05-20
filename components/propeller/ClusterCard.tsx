'use client';
/**
 * @rsc-blocked — Client-only component: interactive state (useState/useReducer).
 * Must be rendered inside (or below) a Client Component boundary; cannot be
 * imported directly into a React Server Component. The 'use client' header
 * above marks this boundary to Next.js.
 */
import * as React from 'react';

import { useState } from 'react';
import { Cluster, AttributeResult } from 'propeller-sdk-v2';
import ItemStock from './ItemStock';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import {
  getClusterImageUrl,
  getClusterSku,
  getLocalizedValue,
} from '@/composables/shared/utils/productHelpers';
import { formatPrice } from '@/composables/shared/utils/formatting';
import { config } from '@/data/config';
import { useResolvedProps, ResolveSpec } from '@/composables/react/useResolvedProps';
import { ProductGridConfig } from '@/context/ProductGridContext';

export interface ClusterCardProps {
  // === Core ===

  /** The cluster object to display */
  cluster: Cluster;

  // === Display toggles ===

  /** Show the cluster name. Defaults to true. */
  showName?: boolean;

  /** When false, hides the price. Defaults to true. */
  showPrice?: boolean;

  /** Show the default product image. Defaults to true. */
  showImage?: boolean;

  /** Show the cluster short description. Defaults to false. */
  showShortDescription?: boolean;

  /**
   * Show the SKU. Displays the cluster SKU; falls back to the default product SKU
   * if the cluster SKU is empty. Defaults to true.
   */
  showSku?: boolean;

  /** Show the default product manufacturer. Defaults to false. */
  showManufacturer?: boolean;

  /**
   * Show default product stock information (quantity badge).
   * Reads `defaultProduct.inventory.totalQuantity`. Defaults to true.
   */
  showStock?: boolean;

  /**
   * Show only the availability indicator (Available / Not available) inside ItemStock.
   * Only relevant when `showStock` is true.
   * Defaults to true.
   */
  showAvailability?: boolean;

  /**
   * Label overrides forwarded to the embedded ItemStock component.
   * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
   */
  stockLabels?: Record<string, string>;

  // === Attribute labels ===

  /**
   * Attribute codes/names to look up on the default product and display as
   * badge overlays on the image. Resolved against
   * `defaultProduct.attributes.items[].attributeDescription.name`.
   * Attributes with no matching value are silently omitted.
   * Example: ['new', 'sale']
   */
  imageLabels?: string[];

  /**
   * Attribute codes/names to look up on the default product and display as
   * extra text rows below the cluster name. Resolved the same way as `imageLabels`.
   * Example: ['brand', 'color']
   */
  textLabels?: string[];

  // === Favourites ===

  /** Renders a heart-icon toggle button on the cluster image. Defaults to false. */
  enableAddFavorite?: boolean;

  /**
   * Called whenever the favourite state is toggled.
   * The second argument indicates the new state: `true` = added, `false` = removed.
   */
  onToggleFavorite?: (cluster: Cluster, isFavorite: boolean) => void;

  // === Navigation ===

  /**
   * Called when the cluster name, image, or "View cluster" button is clicked.
   * When provided, the default `<a>` navigation is prevented so the consumer
   * can use framework-specific routing (e.g. Next.js `router.push`).
   */
  onClusterClick?: (cluster: Cluster) => void;

  // === UI string overrides ===

  /**
   * Override any UI string.
   * Available keys: addToFavorites, removeFromFavorites, viewCluster,
   *                 inStock, lowStock, outOfStock
   */
  labels?: Record<string, string>;

  /** Number of grid columns — when 1 the card renders as a compact horizontal row. */
  columns?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /** Configuration object passed to the component */
  configuration?: any;

  /** Include tax in the price display */
  includeTax?: boolean;

  /** Language code used to resolve localised names and slugs. Defaults to 'NL'. */
  language?: string;
}

// ── Pure helpers (module scope — created once, not per render) ──────────────────

/** Cluster name with fallback chain: cluster.names → defaultProduct.names → 'Cluster'. */
function getClusterName(cluster: Cluster | undefined, language: string): string {
  const fromCluster = getLocalizedValue(cluster?.names, language, '');
  if (fromCluster) return fromCluster;
  return getLocalizedValue(cluster?.defaultProduct?.names, language, 'Cluster');
}

function getClusterShortDescription(cluster: Cluster | undefined, language: string): string {
  const fromCluster = getLocalizedValue(cluster?.shortDescriptions, language, '');
  if (fromCluster) return fromCluster;
  return getLocalizedValue(cluster?.defaultProduct?.shortDescriptions, language, '');
}

function getClusterManufacturer(cluster: Cluster | undefined): string {
  return cluster?.defaultProduct?.manufacturer || '';
}

/** Resolves attribute codes against the default product, dropping empties. */
function resolveAttributeValues(cluster: Cluster | undefined, codes: string[] | undefined): string[] {
  if (!codes || codes.length === 0) return [];
  const attrs = cluster?.defaultProduct?.attributes?.items || [];
  return codes
    .map((code) => {
      const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
      return found?.value?.value || '';
    })
    .filter((v: string) => v.length > 0);
}

// Two-tier precedence (explicit prop > ProductGrid context > Propeller infra >
// default) for the props ProductGrid otherwise cascades through here.
const RESOLVE_SPEC: ResolveSpec<ClusterCardProps> = {
  configuration: { infra: 'configuration' },
  includeTax: { infra: 'includeTax' },
  language: { infra: 'language', default: 'NL' },
  columns: { grid: 'columns', default: 3 },
  showPrice: { grid: 'showPrice' },
  showStock: { grid: 'showStock' },
  showAvailability: { grid: 'showAvailability' },
  stockLabels: { grid: 'stockLabels' },
  enableAddFavorite: { grid: 'enableAddFavorite' },
  onClusterClick: { grid: 'onClusterClick' },
  onToggleFavorite: {
    grid: 'onToggleFavorite',
    transform: (fn) => (c: Cluster, fav: boolean) =>
      (fn as ProductGridConfig['onToggleFavorite'])!(c, fav),
  },
};

function ClusterCard(rawProps: ClusterCardProps) {
  // Resolve infra (Tier 1) + grid config (Tier 2) declaratively. Non-throwing —
  // standalone use (no provider) falls back to explicit props / defaults.
  const props = useResolvedProps(rawProps, RESOLVE_SPEC);

  const [isFavorite, setIsFavorite] = useState(false);

  const language = (props.language as string) || 'NL';
  const cluster = props.cluster;
  const isRow = props.columns === 1;

  // Derived values — computed once per render (previously redefined every render
  // and called twice each across the layout branches).
  const clusterName = getClusterName(cluster, language);
  const clusterSku = getClusterSku(cluster);
  const clusterImageUrl = getClusterImageUrl(cluster);
  const shortDescription = getClusterShortDescription(cluster, language);
  const manufacturer = getClusterManufacturer(cluster);
  const clusterUrl = props.configuration.urls.getClusterUrl(cluster, props.language);
  const imageLabelValues = resolveAttributeValues(cluster, props.imageLabels);
  const textLabelValues = resolveAttributeValues(cluster, props.textLabels).map((value) => ({
    value,
  }));

  const defaultProductInventory = cluster?.defaultProduct?.inventory;

  const useTax = props.includeTax !== undefined ? !!props.includeTax : false;
  const priceObj = cluster?.defaultProduct?.price;
  const priceValue = useTax ? priceObj?.net : priceObj?.gross;
  const clusterPrice =
    props.showPrice === false ? '' : formatPrice(priceValue, { symbol: config.currency });

  function handleClusterClick(e: React.MouseEvent): void {
    if (props.onClusterClick) {
      e.preventDefault();
      props.onClusterClick(cluster);
    }
  }

  function handleToggleFavorite(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    if (props.onToggleFavorite) {
      props.onToggleFavorite(cluster, isFavorite);
    }
  }

  const viewClusterLabel = getLabel(props.labels, 'viewCluster', 'View cluster');

  return (
    <div
      className={`propeller-cluster-card group relative flex h-full overflow-hidden rounded-container border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-secondary/20 ${isRow ? 'flex-row flex-wrap md:flex-nowrap items-center' : 'flex-col'} ${props.className || ''}`}
      data-layout={isRow ? 'row' : 'grid'}
    >
      {props.showImage !== false ? (
        <div
          className={`propeller-cluster-card__media relative overflow-hidden bg-surface-hover ${isRow ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-[4/3] sm:aspect-square p-2 sm:p-4'}`}
        >
          <a
            className="block h-full w-full"
            href={clusterUrl}
            onClick={(e) => handleClusterClick(e)}
          >
            {clusterImageUrl ? (
              <img
                className="propeller-cluster-card__image h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                src={clusterImageUrl}
                alt={clusterName}
              />
            ) : (
              <div className="propeller-cluster-card__image-placeholder flex h-full w-full items-center justify-center text-foreground-subtle">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-16 w-16">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    strokeWidth={1}
                  />
                </svg>
              </div>
            )}
          </a>
          {imageLabelValues.length > 0 ? (
            <div className="propeller-cluster-card__badges pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
              {imageLabelValues.map((label) => (
                <span
                  key={label}
                  className="propeller-cluster-card__badge inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground shadow-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          {props.enableAddFavorite ? (
            <button
              type="button"
              onClick={(e) => handleToggleFavorite(e)}
              aria-label={
                isFavorite
                  ? getLabel(props.labels, 'removeFromFavorites', 'Remove from favourites')
                  : getLabel(props.labels, 'addToFavorites', 'Add to favourites')
              }
              data-favorite={isFavorite ? 'true' : 'false'}
              className={`propeller-cluster-card__favorite-btn absolute right-2 top-2 rounded-full border bg-card p-1.5 shadow-sm transition-colors ${isFavorite ? 'border-destructive/30 text-destructive' : 'border-border-subtle text-foreground-subtle hover:text-destructive'}`}
            >
              <svg
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill={isFavorite ? 'currentColor' : 'none'}
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}

      {isRow ? (
        <>
          <div className="propeller-cluster-card__body flex flex-1 flex-row items-center gap-4 px-4 py-2 min-w-0">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              {props.showSku !== false && clusterSku ? (
                <div className="propeller-cluster-card__sku font-mono text-xs text-foreground-subtle">
                  {clusterSku}
                </div>
              ) : null}
              {props.showName !== false ? (
                <a
                  className="propeller-cluster-card__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary line-clamp-1"
                  href={clusterUrl}
                  onClick={(e) => handleClusterClick(e)}
                >
                  {clusterName}
                </a>
              ) : null}
              {textLabelValues.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {textLabelValues.map((item) => (
                    <div
                      key={item.value}
                      className="propeller-cluster-card__label text-xs text-muted-foreground"
                    >
                      {item.value}
                    </div>
                  ))}
                </div>
              ) : null}
              {props.showManufacturer && manufacturer ? (
                <div className="propeller-cluster-card__manufacturer text-xs text-muted-foreground">
                  {manufacturer}
                </div>
              ) : null}
              {props.showShortDescription && shortDescription ? (
                <p className="propeller-cluster-card__description line-clamp-2 text-xs text-muted-foreground">
                  {shortDescription}
                </p>
              ) : null}
            </div>
          </div>
          <div className="propeller-cluster-card__footer w-full md:w-auto flex items-center gap-3 px-4 py-2 md:py-0 border-t md:border-t-0 border-border-subtle">
            {props.showStock && defaultProductInventory ? (
              <ItemStock
                inventory={defaultProductInventory}
                showAvailability={false}
                showStock
                labels={props.stockLabels}
              />
            ) : null}
            {clusterPrice ? (
              <span className="propeller-cluster-card__price font-bold text-foreground text-sm whitespace-nowrap">
                {clusterPrice}
              </span>
            ) : null}
            <div className="propeller-cluster-card__cta flex-shrink-0 ml-auto">
              <a
                className="propeller-cluster-card__cta-link flex w-full items-center justify-center rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                href={clusterUrl}
                onClick={(e) => handleClusterClick(e)}
              >
                {viewClusterLabel}
              </a>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="propeller-cluster-card__body flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
            {props.showSku !== false && clusterSku ? (
              <div className="propeller-cluster-card__sku font-mono text-xs text-foreground-subtle">
                {clusterSku}
              </div>
            ) : null}
            {props.showName !== false ? (
              <a
                className="propeller-cluster-card__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-primary line-clamp-2"
                href={clusterUrl}
                onClick={(e) => handleClusterClick(e)}
              >
                {clusterName}
              </a>
            ) : null}
            {props.showStock && defaultProductInventory ? (
              <ItemStock
                inventory={defaultProductInventory}
                showAvailability={props.showAvailability !== false}
                showStock
                labels={props.stockLabels}
              />
            ) : null}
            {textLabelValues.length > 0 ? (
              <div className="propeller-cluster-card__labels flex flex-col gap-0.5">
                {textLabelValues.map((item) => (
                  <div
                    key={item.value}
                    className="propeller-cluster-card__label text-xs text-muted-foreground"
                  >
                    {item.value}
                  </div>
                ))}
              </div>
            ) : null}
            {props.showManufacturer && manufacturer ? (
              <div className="propeller-cluster-card__manufacturer text-xs text-muted-foreground">
                {manufacturer}
              </div>
            ) : null}
            {props.showShortDescription && shortDescription ? (
              <p className="propeller-cluster-card__description line-clamp-2 text-xs text-muted-foreground">
                {shortDescription}
              </p>
            ) : null}
            {clusterPrice ? (
              <div className="propeller-cluster-card__price mt-auto pt-1">
                <span className="font-bold text-foreground text-base sm:text-lg">
                  {clusterPrice}
                </span>
              </div>
            ) : null}
          </div>
          <div className="propeller-cluster-card__cta px-3 pb-3 sm:px-4 sm:pb-4">
            <a
              className="propeller-cluster-card__cta-link flex w-full items-center justify-center rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              href={clusterUrl}
              onClick={(e) => handleClusterClick(e)}
            >
              {viewClusterLabel}
            </a>
          </div>
        </>
      )}
    </div>
  );
}

// Memoized: ProductGrid passes only the stable { cluster } prop; config flows
// via context so shallow-equal props skip re-render (rbp §5.2).
export default React.memo(ClusterCard);
