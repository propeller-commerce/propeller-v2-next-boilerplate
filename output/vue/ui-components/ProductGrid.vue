<template>
  <div :class="`w-full ${className || ''}`">
    <template v-if="getIsLoading()">
      <div :class="getGridColsClass()">
        <template :key="idx" v-for="(_, idx) in getSkeletonItems()">
          <div
            class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div class="aspect-square bg-slate-100 animate-pulse"></div>
            <div class="p-4 flex flex-col gap-2 flex-1">
              <div class="h-3 bg-slate-100 animate-pulse rounded w-1/4"></div>
              <div class="h-4 bg-slate-100 animate-pulse rounded w-3/4"></div>
              <div class="h-4 bg-slate-100 animate-pulse rounded w-1/2"></div>
              <div class="mt-auto pt-2">
                <div class="h-5 bg-slate-100 animate-pulse rounded w-1/3"></div>
              </div>
            </div>
            <template v-if="showAddToCart()">
              <div class="p-4 pt-0">
                <div class="flex items-center gap-2">
                  <div class="h-9 flex-1 bg-slate-100 animate-pulse rounded"></div>
                  <div class="h-9 flex-1 bg-slate-100 animate-pulse rounded"></div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>

    <template v-if="!getIsLoading()">
      <template v-if="getDisplayProducts().length === 0">
        <div class="text-center py-24 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="mx-auto h-12 w-12 text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              :strokeWidth="1"
            ></path>
          </svg>
          <h3 class="mt-4 text-lg font-semibold text-gray-900">No products found</h3>
          <p class="mt-1 text-sm text-gray-500">Try adjusting your filters or search term.</p>
        </div>
      </template>

      <template v-if="getDisplayProducts().length > 0">
        <div :class="getGridColsClass()">
          <template
            :key="item.productId || item.clusterId || idx"
            v-for="(item, idx) in getDisplayProducts()"
          >
            <div>
              <template v-if="isClusterItem(item)">
                <template v-if="!renderClusterCard">
                  <ClusterCard
                    :columns="columns || 3"
                    :cluster="item"
                    :configuration="configuration"
                    :includeTax="includeTax"
                    :language="language || 'NL'"
                    :showStock="showStock"
                    :showAvailability="showAvailability"
                    :stockLabels="stockLabels"
                    :enableAddFavorite="enableAddFavorite"
                    :onToggleFavorite="
                      (cluster, isFav) => {
                        if (onToggleFavorite) {
                          onToggleFavorite(cluster, isFav);
                        }
                      }
                    "
                    :onClusterClick="
                      (cluster) => {
                        if (onClusterClick) {
                          onClusterClick(cluster);
                        }
                      }
                    "
                  ></ClusterCard>
                </template>
              </template>

              <template v-if="!isClusterItem(item)">
                <template v-if="!renderProductCard">
                  <template v-if="showAddToCart()">
                    <ProductCard
                      :columns="columns || 3"
                      :product="item"
                      :graphqlClient="graphqlClient"
                      :user="user || null"
                      :configuration="configuration"
                      :includeTax="includeTax"
                      :cartId="cartId"
                      :createCart="createCart"
                      :onCartCreated="onCartCreated"
                      :afterAddToCart="afterAddToCart"
                      :showModal="showModal"
                      :allowIncrDecr="allowIncrDecr"
                      :enableStockValidation="stockValidation"
                      :language="language || 'NL'"
                      :onProceedToCheckout="onProceedToCheckout"
                      :addToCartLabels="addToCartLabels"
                      :enableAddFavorite="enableAddFavorite"
                      :showStock="showStock"
                      :showAvailability="showAvailability"
                      :stockLabels="stockLabels"
                      :companyId="companyId"
                      :onToggleFavorite="
                        (product, isFav) => {
                          if (onToggleFavorite) {
                            onToggleFavorite(product, isFav);
                          }
                        }
                      "
                      :onProductClick="
                        (product) => {
                          if (onProductClick) {
                            onProductClick(product);
                          }
                        }
                      "
                    ></ProductCard>
                  </template>

                  <template v-if="!showAddToCart()">
                    <ProductCard
                      :columns="columns || 3"
                      :product="item"
                      :graphqlClient="graphqlClient"
                      :user="user || null"
                      :configuration="configuration"
                      :language="language || 'NL'"
                      :cartId="cartId"
                      :enableAddFavorite="enableAddFavorite"
                      :showStock="showStock"
                      :showAvailability="showAvailability"
                      :stockLabels="stockLabels"
                      :companyId="companyId"
                      :onToggleFavorite="
                        (product, isFav) => {
                          if (onToggleFavorite) {
                            onToggleFavorite(product, isFav);
                          }
                        }
                      "
                      :onProductClick="
                        (product) => {
                          if (onProductClick) {
                            onProductClick(product);
                          }
                        }
                      "
                    ></ProductCard>
                  </template>
                </template>
              </template>
            </div>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { GraphQLClient, Product, Cluster, Contact, Customer, Cart, CartMainItem, AttributeFilter, ProductTextFilterInput, ProductsResponse, Category } from 'propeller-sdk-v2';
import ProductCard from './ProductCard.vue';
import ClusterCard from './ClusterCard.vue';
import { useProductSearch } from '@/composables/vue/useProductSearch';

export interface ProductGridProps {
  graphqlClient?: GraphQLClient;
  products?: (Product | Cluster)[];
  language?: string;
  taxZone?: string;
  categoryId?: number;
  term?: string;
  brand?: string;
  columns?: number;
  isLoading?: boolean;
  renderProductCard?: (product: Product) => any;
  renderClusterCard?: (cluster: Cluster) => any;
  portalMode?: string;
  user?: Contact | Customer | null;
  companyId?: number;
  includeTax?: boolean;
  stockValidation?: boolean;
  allowAddToCart?: boolean;
  onFiltersChange?: (filters: AttributeFilter[]) => void;
  textFilters?: ProductTextFilterInput[];
  priceFilterMin?: number;
  priceFilterMax?: number;
  onSortChange?: (sort: any) => void;
  onPriceBoundsChange?: (min: number, max: number) => void;
  onItemsFoundChange?: (count: number) => void;
  onPageItemCountChange?: (count: number) => void;
  onPageChange?: (page: number) => void;
  onProductsResponse?: (products: ProductsResponse) => void;
  onCategoryChange?: (category: Category) => void;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: string;
  configuration?: any;
  cartId?: string;
  createCart?: boolean;
  onCartCreated?: (cart: Cart) => void;
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;
  showModal?: boolean;
  allowIncrDecr?: boolean;
  onProceedToCheckout?: () => void;
  addToCartLabels?: Record<string, string>;
  showStock?: boolean;
  showAvailability?: boolean;
  stockLabels?: Record<string, string>;
  enableAddFavorite?: boolean;
  onToggleFavorite?: (item: Product | Cluster, isFavorite: boolean) => void;
  onClusterClick?: (cluster: Cluster) => void;
  onProductClick?: (product: Product) => void;
  className?: string;
}

const props = defineProps<ProductGridProps>();

const externalProducts = computed(() => props.products);

const {
  displayProducts,
  isLoading: internalLoading,
  currentPage,
  totalPages,
  goToPage,
} = useProductSearch({
  graphqlClient: props.graphqlClient,
  products: externalProducts,
  categoryId: computed(() => props.categoryId),
  term: computed(() => props.term),
  brand: computed(() => props.brand),
  language: computed(() => props.language || 'NL'),
  taxZone: props.taxZone,
  user: computed(() => props.user as Contact | Customer | null),
  companyId: computed(() => props.companyId),
  textFilters: computed(() => props.textFilters),
  priceFilterMin: computed(() => props.priceFilterMin),
  priceFilterMax: computed(() => props.priceFilterMax),
  sortField: computed(() => props.sortField),
  sortOrder: computed(() => props.sortOrder),
  page: computed(() => props.page),
  pageSize: computed(() => props.pageSize || 12),
  configuration: props.configuration || {},
  onFiltersChange: props.onFiltersChange,
  onPriceBoundsChange: props.onPriceBoundsChange,
  onItemsFoundChange: props.onItemsFoundChange,
  onPageChange: props.onPageChange,
  onProductsResponse: props.onProductsResponse,
  onCategoryChange: props.onCategoryChange,
});

function getDisplayProducts(): (Product | Cluster)[] {
  return displayProducts.value;
}

function getIsLoading(): boolean {
  return props.isLoading || internalLoading.value;
}

function isClusterItem(item: Product | Cluster): boolean {
  return 'clusterId' in item && !(item as any).productId;
}

function showAddToCart(): boolean {
  if (props.allowAddToCart === false) return false;
  if (props.portalMode === 'semi-closed') return false;
  return true;
}

function getGridColsClass(): string {
  const cols = props.columns || 3;
  const colMap: Record<number, string> = {
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  };
  return colMap[cols] || colMap[3];
}

function getSkeletonItems(): number[] {
  return Array.from({ length: props.pageSize || 12 }, (_, i) => i);
}

function handlePageChange(page: number): void {
  goToPage(page);
  props.onPageChange?.(page);
}
</script>
