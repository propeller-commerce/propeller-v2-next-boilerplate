<template>
  <div
    :class="`group relative flex overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 ${
      isRow() ? 'flex-row items-center' : 'flex-col'
    } ${className || ''}`"
  >
    <template v-if="showImage !== false">
      <div
        :class="`relative overflow-hidden bg-gray-50 ${
          isRow() ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-square p-4'
        }`"
      >
        <a
          class="block h-full w-full"
          :href="getProductUrl()"
          @click="async (e) => handleProductClick(e)"
        >
          <template v-if="!!getProductImageUrl()">
            <img
              class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
              :src="getProductImageUrl()"
              :alt="getProductName()"
            />
          </template>

          <template v-if="!getProductImageUrl()">
            <div
              class="flex h-full w-full items-center justify-center text-gray-200"
            >
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                class="h-16 w-16"
              >
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
          v-if="
            !!imageLabels &&
            imageLabels.length > 0 &&
            computedImageLabels().length > 0
          "
        >
          <div
            class="pointer-events-none absolute left-2 top-2 flex flex-col gap-1"
          >
            <template
              :key="index"
              v-for="(label, index) in computedImageLabels()"
            >
              <span
                class="inline-block rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm"
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

    <div
      :class="`flex flex-1 ${
        isRow()
          ? 'flex-row items-center gap-4 px-4 py-2 min-w-0'
          : 'flex-col gap-2 p-4'
      }`"
    >
      <template v-if="showSku !== false && !!getProductSku()">
        <div class="font-mono text-xs text-gray-400">{{ getProductSku() }}</div>
      </template>

      <template v-if="showName !== false">
        <a
          :href="getProductUrl()"
          @click="async (e) => handleProductClick(e)"
          :class="`text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-violet-600 ${
            isRow() ? 'line-clamp-1 flex-1 min-w-0' : 'line-clamp-2'
          }`"
          >{{ getProductName() }}</a
        >
      </template>

      <template
        v-if="
          !!textLabels &&
          textLabels.length > 0 &&
          computedTextLabels().length > 0
        "
      >
        <div class="flex flex-col gap-0.5">
          <template :key="index" v-for="(item, index) in computedTextLabels()">
            <div class="text-xs text-gray-500">{{ item.value }}</div>
          </template>
        </div>
      </template>

      <template v-if="showStock && !!product.inventory">
        <ItemStock
          :inventory="product.inventory"
          :showAvailability="showAvailability !== false"
          :showStock="true"
          :labels="stockLabels"
        ></ItemStock>
      </template>

      <template v-if="showManufacturer && !!getProductManufacturer()">
        <div class="text-xs text-gray-500">{{ getProductManufacturer() }}</div>
      </template>

      <template v-if="showShortDescription && !!getProductShortDescription()">
        <p class="line-clamp-2 text-xs text-gray-500">
          {{ getProductShortDescription() }}
        </p>
      </template>

      <template v-if="!!getProductPrice()">
        <div :class="isRow() ? '' : 'mt-auto pt-2'">
          <span
            :class="`font-bold text-gray-900 ${
              isRow() ? 'text-sm whitespace-nowrap' : 'text-lg'
            }`"
            >{{ getProductPrice() }}</span
          >
        </div>
      </template>
    </div>
    <div :class="isRow() ? 'flex-shrink-0 pr-4' : 'px-4 pb-4'">
      <AddToCart
        :graphqlClient="graphqlClient"
        :user="user"
        :product="product"
        :cartId="cartId"
        :configuration="configuration"
        :childItems="childItems"
        :notes="notes"
        :price="price"
        :createCart="createCart"
        :onCartCreated="onCartCreated"
        :onAddToCart="onAddToCart"
        :afterAddToCart="afterAddToCart"
        :showModal="showModal"
        :allowIncrDecr="allowIncrDecr"
        :enableStockValidation="enableStockValidation"
        :language="language"
        :onProceedToCheckout="onProceedToCheckout"
        :labels="addToCartLabels"
      ></AddToCart>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

import {
  GraphQLClient,
  Product,
  Contact,
  Customer,
  Cart,
  CartMainItem,
  CartChildItemInput,
  AttributeResult,
} from "propeller-sdk-v2";
import AddToCart from "./AddToCart.vue";
import ItemStock from "./ItemStock.vue";

export interface ProductCardProps {
  // === Core ===

  /** The product object to display */
  product: Product;

  // === Display toggles ===

  /** Show the product name. Defaults to true. */
  showName?: boolean;

  /** Show the product image. Defaults to true. */
  showImage?: boolean;

  /** Show the product short description. Defaults to false. */
  showShortDescription?: boolean;

  /** Show the product SKU. Defaults to true. */
  showSku?: boolean;

  /** Show the product manufacturer. Defaults to false. */
  showManufacturer?: boolean;

  /**
   * Show the stock / availability widget below the product name.
   * Uses the embedded `ItemStock` component driven by `product.inventory`.
   * Defaults to false.
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
   * Attribute codes/names to look up and display as badge overlays on the product image.
   * Each code is resolved against `product.attributes.items[].attributeDescription.code`
   * (or `.name`). Attributes with no matching value are silently omitted.
   * Example: ['new', 'sale']
   */
  imageLabels?: string[];

  /**
   * Attribute codes/names to look up and display as extra text rows below the product name.
   * Resolved the same way as `imageLabels`.
   * Example: ['brand', 'color']
   */
  textLabels?: string[];

  // === UI string overrides ===

  /**
   * Override any UI string.
   * Available keys: addToFavorites, removeFromFavorites
   */
  labels?: Record<string, string>;

  // === Favourites ===

  /** Renders a heart-icon toggle button on the product image. Defaults to false. */
  enableAddFavorite?: boolean;

  /**
   * Called whenever the favourite state is toggled.
   * The second argument indicates the new state: `true` = added, `false` = removed.
   */
  onToggleFavorite?: (product: Product, isFavorite: boolean) => void;

  // === Navigation ===

  /**
   * Called when the product name or image is clicked.
   * When provided, the default `<a>` navigation is prevented so the consumer
   * can use framework-specific routing (e.g. Next.js `router.push`).
   */
  onProductClick?: (product: Product) => void;

  // === Appearance ===

  /** Number of grid columns — when 1 the card renders as a compact horizontal row. */
  columns?: number;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /**
   * URL pattern controlling which segments appear in product links.
   * Tokens: page → 'product', id → productId, slug → slug value.
   * Examples: 'page/id/slug' (default) | 'page/slug' | 'page/id'
   * Defaults to 'page/id/slug' when omitted.
   */
  urlPattern?: string;

  // === AddToCart pass-through props ===

  /** Initialised Propeller SDK GraphQL client (required by embedded AddToCart). */
  graphqlClient: GraphQLClient;

  /** Authenticated user — used for cart creation / lookup. */
  user: Contact | Customer | null;

  /** ID of an existing cart to add items to. */
  cartId?: string;

  /** Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall. */
  configuration?: any;

  /** Cluster ID for configurable products. */
  clusterId?: number;

  /** Product IDs of selected cluster child options. */
  childItems?: number[];

  /** Free-text notes attached to the cart item. */
  notes?: string;

  /** Custom unit price override. Omit to use calculated price. */
  price?: number;

  /**
   * When true and no cartId is available, the embedded AddToCart automatically
   * looks up or creates a cart. Always pair with onCartCreated.
   */
  createCart?: boolean;

  /** Called after a new cart is created internally by AddToCart. */
  onCartCreated?: (cart: Cart) => void;

  /**
   * Fully replaces the internal CartService.addItemToCart call inside AddToCart.
   * Must return a Cart object.
   */
  onAddToCart?: (
    product: Product,
    clusterId?: number,
    quantity?: number,
    childItems?: CartChildItemInput[],
    notes?: string,
    price?: number,
    showModal?: boolean
  ) => Cart;

  /** Called after every successful add-to-cart. Receives the updated cart and the added item. */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /**
   * When true the embedded AddToCart shows a modal after a successful add
   * instead of the default toast notification. Defaults to false.
   */
  showModal?: boolean;

  /**
   * Renders − and + buttons beside the quantity input in AddToCart.
   * Defaults to true.
   */
  allowIncrDecr?: boolean;

  /** Validate stock before adding to cart. Defaults to false. */
  enableStockValidation?: boolean;

  /** Language code forwarded to CartService operations. Defaults to 'NL'. */
  language?: string;

  /** Called when the user clicks "Proceed to checkout" inside the AddToCart modal. */
  onProceedToCheckout?: () => void;

  /** Label overrides for UI strings
   *
   * available labels:
   * - outOfStock
   * - noCartId
   * - errorAdding
   * - addedToCart
   * - modalTitle
   * - quantity
   * - continueShopping
   * - proceedToCheckout
   * - add
   * - adding
   */
  addToCartLabels?: Record<string, string>;
}
interface ProductCardState {
  isFavorite: boolean;
  getProductName: () => string;
  getProductSku: () => string;
  getProductImageUrl: () => string;
  getProductPrice: () => string;
  getProductUrl: () => string;
  getProductShortDescription: () => string;
  getProductManufacturer: () => string;
  getLabel: (key: string, fallback: string) => string;
  getAttributeValue: (code: string) => string;
  handleProductClick: (e: any) => void;
  handleToggleFavorite: (e: any) => void;
  isRow: () => boolean;
  computedImageLabels: () => string[];
  computedTextLabels: () => {
    name: string;
    value: string;
  }[];
}

const props = defineProps<ProductCardProps>();
const isFavorite = ref<ProductCardState["isFavorite"]>(false);

function isRow(): ReturnType<ProductCardState["isRow"]> {
  return (props.columns as number) === 1;
}
function getProductName(): ReturnType<ProductCardState["getProductName"]> {
  return (props.product as Product)?.names?.[0]?.value || "Product";
}
function getProductSku(): ReturnType<ProductCardState["getProductSku"]> {
  return (props.product as Product)?.sku || "";
}
function getProductImageUrl(): ReturnType<
  ProductCardState["getProductImageUrl"]
> {
  return (
    (props.product as Product)?.media?.images?.items?.[0]?.imageVariants?.[0]
      ?.url || ""
  );
}
function getProductPrice(): ReturnType<ProductCardState["getProductPrice"]> {
  const price = (props.product as Product)?.price?.gross;
  if (!price && price !== 0) return "";
  return `\u20AC${Number(price).toFixed(2)}`;
}
function getProductUrl(): ReturnType<ProductCardState["getProductUrl"]> {
  return props.configuration.urls.getProductUrl(props.product);
}
function getProductShortDescription(): ReturnType<
  ProductCardState["getProductShortDescription"]
> {
  return (props.product as Product)?.shortDescriptions?.[0]?.value || "";
}
function getProductManufacturer(): ReturnType<
  ProductCardState["getProductManufacturer"]
> {
  return (props.product as Product)?.manufacturer || "";
}
function getLabel(
  key: string,
  fallback: string
): ReturnType<ProductCardState["getLabel"]> {
  return (props.labels as Record<string, string>)?.[key] || fallback;
}
function getAttributeValue(
  code: string
): ReturnType<ProductCardState["getAttributeValue"]> {
  const attrs = (props.product as Product)?.attributes?.items || [];
  const found = attrs.find(
    (a: AttributeResult) => a.attributeDescription?.name === code
  );
  return found?.value?.value || "";
}
function handleProductClick(
  e: any
): ReturnType<ProductCardState["handleProductClick"]> {
  if (props.onProductClick) {
    e.preventDefault();
    props.onProductClick(props.product);
  }
}
function handleToggleFavorite(
  e: any
): ReturnType<ProductCardState["handleToggleFavorite"]> {
  e.preventDefault();
  e.stopPropagation();
  isFavorite.value = !isFavorite.value;
  if (props.onToggleFavorite) {
    props.onToggleFavorite(props.product, isFavorite.value);
  }
}
function computedImageLabels(): ReturnType<
  ProductCardState["computedImageLabels"]
> {
  if (!props.imageLabels || (props.imageLabels as string[]).length === 0)
    return [];
  const attrs = (props.product as Product)?.attributes?.items || [];
  return (props.imageLabels as string[])
    .map((code: string) => {
      const found = attrs.find(
        (a: AttributeResult) => a.attributeDescription?.name === code
      );
      return found?.value?.value || "";
    })
    .filter((v: string) => v.length > 0);
}
function computedTextLabels(): ReturnType<
  ProductCardState["computedTextLabels"]
> {
  if (!props.textLabels || (props.textLabels as string[]).length === 0)
    return [];
  const attrs = (props.product as Product)?.attributes?.items || [];
  return (props.textLabels as string[])
    .map((code: string) => {
      const found = attrs.find(
        (a: AttributeResult) => a.attributeDescription?.name === code
      );
      return {
        name: code,
        value: found?.value?.value || "",
      };
    })
    .filter((item: { name: string; value: string }) => item.value.length > 0);
}
</script>