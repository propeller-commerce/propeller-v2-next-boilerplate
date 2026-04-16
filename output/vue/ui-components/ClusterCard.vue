<template>
  <div
    :class="`group relative flex h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-secondary/20 ${
      isRow() ? 'flex-row flex-wrap md:flex-nowrap items-center' : 'flex-col'
    } ${className || ''}`"
  >
    <template v-if="showImage !== false">
      <div
        :class="`relative overflow-hidden bg-gray-50 ${
          isRow() ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-[4/3] sm:aspect-square p-2 sm:p-4'
        }`"
      >
        <a
          class="block h-full w-full"
          :href="getClusterUrl()"
          @click="async (e) => handleClusterClick(e)"
        >
          <template v-if="!!getClusterImageUrl()">
            <img
              class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              :src="getClusterImageUrl()"
              :alt="getClusterName()"
            />
          </template>

          <template v-if="!getClusterImageUrl()">
            <div class="flex h-full w-full items-center justify-center text-gray-200">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-16 w-16">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  :strokeWidth="1"
                ></path>
              </svg>
            </div>
          </template>
        </a>
        <template
          v-if="!!imageLabels && imageLabels.length > 0 && computedImageLabels().length > 0"
        >
          <div class="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
            <template :key="index" v-for="(label, index) in computedImageLabels()">
              <span
                class="inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-white shadow-sm"
                >{{ label }}</span
              >
            </template>
          </div>
        </template>

        <template v-if="enableAddFavorite">
          <button
            type="button"
            @click="async (e) => handleToggleFavorite(e)"
            :aria-label="
              isFavorite
                ? getLabel('removeFromFavorites', 'Remove from favourites')
                : getLabel('addToFavorites', 'Add to favourites')
            "
            :class="`absolute right-2 top-2 rounded-full border bg-white p-1.5 shadow-sm transition-colors ${
              isFavorite
                ? 'border-red-200 text-red-500'
                : 'border-gray-100 text-gray-300 hover:text-red-400'
            }`"
          >
            <svg
              stroke="currentColor"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              :fill="isFavorite ? 'currentColor' : 'none'"
              :strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              ></path>
            </svg>
          </button>
        </template>
      </div>
    </template>

    <template v-if="isRow()">
      <div class="flex flex-1 flex-row items-center gap-4 px-4 py-2 min-w-0">
        <div class="flex flex-col gap-0.5 flex-1 min-w-0">
          <template v-if="showSku !== false && !!getClusterSku()">
            <div class="font-mono text-xs text-gray-400">
              {{ getClusterSku() }}
            </div>
          </template>

          <template v-if="showName !== false">
            <a
              class="text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-primary line-clamp-1"
              :href="getClusterUrl()"
              @click="async (e) => handleClusterClick(e)"
              >{{ getClusterName() }}</a
            >
          </template>

          <template v-if="!!textLabels && textLabels.length > 0 && computedTextLabels().length > 0">
            <div class="flex flex-col gap-0.5">
              <template :key="index" v-for="(item, index) in computedTextLabels()">
                <div class="text-xs text-gray-500">{{ item.value }}</div>
              </template>
            </div>
          </template>

          <template v-if="showManufacturer && !!getClusterManufacturer()">
            <div class="text-xs text-gray-500">
              {{ getClusterManufacturer() }}
            </div>
          </template>

          <template v-if="showShortDescription && !!getClusterShortDescription()">
            <p class="line-clamp-2 text-xs text-gray-500">
              {{ getClusterShortDescription() }}
            </p>
          </template>
        </div>
      </div>
      <div
        class="w-full md:w-auto flex items-center gap-3 px-4 py-2 md:py-0 border-t md:border-t-0 border-gray-100"
      >
        <template v-if="showStock && !!cluster.defaultProduct?.inventory">
          <ItemStock
            :inventory="cluster.defaultProduct?.inventory"
            :showAvailability="false"
            :showStock="true"
            :labels="stockLabels"
          ></ItemStock>
        </template>

        <template v-if="!!getClusterPrice()">
          <span class="font-bold text-gray-900 text-sm whitespace-nowrap">{{
            getClusterPrice()
          }}</span>
        </template>

        <div class="flex-shrink-0 ml-auto">
          <a
            class="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            :href="getClusterUrl()"
            @click="async (e) => handleClusterClick(e)"
            >{{ getLabel('viewCluster', 'View cluster') }}</a
          >
        </div>
      </div>
    </template>

    <template v-if="!isRow()">
      <div class="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <template v-if="showSku !== false && !!getClusterSku()">
          <div class="font-mono text-xs text-gray-400">
            {{ getClusterSku() }}
          </div>
        </template>

        <template v-if="showName !== false">
          <a
            class="text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-primary line-clamp-2"
            :href="getClusterUrl()"
            @click="async (e) => handleClusterClick(e)"
            >{{ getClusterName() }}</a
          >
        </template>

        <template v-if="showStock && !!cluster.defaultProduct?.inventory">
          <ItemStock
            :inventory="cluster.defaultProduct?.inventory"
            :showAvailability="showAvailability !== false"
            :showStock="true"
            :labels="stockLabels"
          ></ItemStock>
        </template>

        <template v-if="!!textLabels && textLabels.length > 0 && computedTextLabels().length > 0">
          <div class="flex flex-col gap-0.5">
            <template :key="index" v-for="(item, index) in computedTextLabels()">
              <div class="text-xs text-gray-500">{{ item.value }}</div>
            </template>
          </div>
        </template>

        <template v-if="showManufacturer && !!getClusterManufacturer()">
          <div class="text-xs text-gray-500">
            {{ getClusterManufacturer() }}
          </div>
        </template>

        <template v-if="showShortDescription && !!getClusterShortDescription()">
          <p class="line-clamp-2 text-xs text-gray-500">
            {{ getClusterShortDescription() }}
          </p>
        </template>

        <template v-if="!!getClusterPrice()">
          <div class="mt-auto pt-1">
            <span class="font-bold text-gray-900 text-base sm:text-lg">{{
              getClusterPrice()
            }}</span>
          </div>
        </template>
      </div>
      <div class="px-3 pb-3 sm:px-4 sm:pb-4">
        <a
          class="flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          :href="getClusterUrl()"
          @click="async (e) => handleClusterClick(e)"
          >{{ getLabel('viewCluster', 'View cluster') }}</a
        >
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { Cluster, AttributeResult } from 'propeller-sdk-v2';
import ItemStock from './ItemStock.vue';

export interface ClusterCardProps {
  // === Core ===

  /** The cluster object to display */
  cluster: Cluster;

  // === Display toggles ===

  /** Show the cluster name. Defaults to true. */
  showName?: boolean;

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
   * Show the price below the product name.
   * Defaults to true.
   */
  showPrice?: boolean;

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
interface ClusterCardState {
  isFavorite: boolean;
  includeTax: boolean;
  priceListener: any;
  isRow: () => boolean;
  getClusterName: () => string;
  getClusterSku: () => string;
  getClusterImageUrl: () => string;
  getClusterUrl: () => string;
  getClusterShortDescription: () => string;
  getClusterManufacturer: () => string;
  getStockQuantity: () => number;
  getStockStatusLabel: () => string;
  getStockStatusClass: () => string;
  getClusterPrice: () => string;
  getLabel: (key: string, fallback: string) => string;
  handleClusterClick: (e: any) => void;
  handleToggleFavorite: (e: any) => void;
  computedImageLabels: () => string[];
  computedTextLabels: () => {
    name: string;
    value: string;
  }[];
}

const props = defineProps<ClusterCardProps>();
const isFavorite = ref<ClusterCardState['isFavorite']>(false);
const includeTax = ref<ClusterCardState['includeTax']>(false);
const priceListener = ref<ClusterCardState['priceListener']>(null);

function isRow(): ReturnType<ClusterCardState['isRow']> {
  return (props.columns as number) === 1;
}
function getClusterName(): ReturnType<ClusterCardState['getClusterName']> {
  const lang = (props.language as string) || 'NL';
  const names = (props.cluster as Cluster)?.names;
  const match = names?.find((n: any) => n.language === lang);
  if (match?.value) return match.value;
  const dpNames = (props.cluster as Cluster)?.defaultProduct?.names;
  const dpMatch = dpNames?.find((n: any) => n.language === lang);
  return dpMatch?.value || names?.[0]?.value || dpNames?.[0]?.value || 'Cluster';
}
function getClusterSku(): ReturnType<ClusterCardState['getClusterSku']> {
  return (props.cluster as Cluster)?.sku || (props.cluster as Cluster)?.defaultProduct?.sku || '';
}
function getClusterImageUrl(): ReturnType<ClusterCardState['getClusterImageUrl']> {
  return (
    (props.cluster as Cluster)?.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]
      ?.url || ''
  );
}
function getClusterUrl(): ReturnType<ClusterCardState['getClusterUrl']> {
  return props.configuration.urls.getClusterUrl(props.cluster, props.language);
}
function getClusterShortDescription(): ReturnType<ClusterCardState['getClusterShortDescription']> {
  const lang = (props.language as string) || 'NL';
  const descs = (props.cluster as Cluster)?.shortDescriptions;
  const match = descs?.find((d: any) => d.language === lang);
  if (match?.value) return match.value;
  const dpDescs = (props.cluster as Cluster)?.defaultProduct?.shortDescriptions;
  const dpMatch = dpDescs?.find((d: any) => d.language === lang);
  return dpMatch?.value || descs?.[0]?.value || dpDescs?.[0]?.value || '';
}
function getClusterManufacturer(): ReturnType<ClusterCardState['getClusterManufacturer']> {
  return (props.cluster as Cluster)?.defaultProduct?.manufacturer || '';
}
function getStockQuantity(): ReturnType<ClusterCardState['getStockQuantity']> {
  const qty = (props.cluster as Cluster)?.defaultProduct?.inventory?.totalQuantity;
  return qty !== undefined && qty !== null ? qty : -1;
}
function getStockStatusLabel(): ReturnType<ClusterCardState['getStockStatusLabel']> {
  const qty = getStockQuantity();
  if (qty < 0) return '';
  if (qty === 0) return getLabel('outOfStock', 'Out of stock');
  if (qty <= 5) return getLabel('lowStock', 'Low stock');
  return getLabel('inStock', 'In stock');
}
function getStockStatusClass(): ReturnType<ClusterCardState['getStockStatusClass']> {
  const qty = getStockQuantity();
  if (qty <= 0) return 'text-red-600 bg-red-50';
  if (qty <= 5) return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
}
function getClusterPrice(): ReturnType<ClusterCardState['getClusterPrice']> {
  if (!props.showPrice) return '';
  const priceObj = (props.cluster as Cluster)?.defaultProduct?.price;
  const useTax: boolean =
    props.includeTax.value !== undefined ? !!props.includeTax.value : includeTax.value;
  const value: number | undefined = useTax ? priceObj?.net : priceObj?.gross;
  if (!value && value !== 0) return '';
  return `\u20AC${Number(value).toFixed(2)}`;
}
function getLabel(key: string, fallback: string): ReturnType<ClusterCardState['getLabel']> {
  return (props.labels as Record<string, string>)?.[key] || fallback;
}
function handleClusterClick(e: any): ReturnType<ClusterCardState['handleClusterClick']> {
  if (props.onClusterClick) {
    e.preventDefault();
    props.onClusterClick(props.cluster);
  }
}
function handleToggleFavorite(e: any): ReturnType<ClusterCardState['handleToggleFavorite']> {
  e.preventDefault();
  e.stopPropagation();
  isFavorite.value = !isFavorite.value;
  if (props.onToggleFavorite) {
    props.onToggleFavorite(props.cluster, isFavorite.value);
  }
}
function computedImageLabels(): ReturnType<ClusterCardState['computedImageLabels']> {
  if (!props.imageLabels || (props.imageLabels as string[]).length === 0) return [];
  const attrs = (props.cluster as Cluster)?.defaultProduct?.attributes?.items || [];
  return (props.imageLabels as string[])
    .map((code: string) => {
      const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
      return found?.value?.value || '';
    })
    .filter((v: string) => v.length > 0);
}
function computedTextLabels(): ReturnType<ClusterCardState['computedTextLabels']> {
  if (!props.textLabels || (props.textLabels as string[]).length === 0) return [];
  const attrs = (props.cluster as Cluster)?.defaultProduct?.attributes?.items || [];
  return (props.textLabels as string[])
    .map((code: string) => {
      const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
      return {
        name: code,
        value: found?.value?.value || '',
      };
    })
    .filter((item: { name: string; value: string }) => item.value.length > 0);
}
</script>
