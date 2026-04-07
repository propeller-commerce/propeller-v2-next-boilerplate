<template>
  <div :class="className">
    <div class="flex items-center gap-2 w-full">
      <template v-if="allowIncrDecr !== false">
        <div class="flex items-center border border-gray-300 rounded-md bg-white h-10">
          <button
            type="button"
            class="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-md select-none"
            @click="async (event) => decrement()"
            :disabled="quantity <= getMinQuantity() || loading"
          >
            -</button
          ><input
            type="number"
            class="w-12 text-center text-sm bg-transparent border-none focus:ring-0 focus:outline-none h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            :min="getMinQuantity()"
            :step="getStep()"
            :value="quantity"
            @change="
              async (e) => {
                const val = parseInt(e.target.value, 10);
                const min = getMinQuantity();
                const step = getStep();
                if (!isNaN(val) && val >= min) {
                  quantity = Math.round((val - min) / step) * step + min;
                }
              }
            "
          /><button
            type="button"
            class="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-md select-none"
            @click="async (event) => increment()"
            :disabled="loading"
          >
            +
          </button>
        </div>
      </template>

      <template v-if="allowIncrDecr === false">
        <input
          type="number"
          class="w-16 h-10 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-secondary focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          :min="getMinQuantity()"
          :step="getStep()"
          :value="quantity"
          @change="
            async (e) => {
              const val = parseInt(e.target.value, 10);
              const min = getMinQuantity();
              const step = getStep();
              if (!isNaN(val) && val >= min) {
                quantity = Math.round((val - min) / step) * step + min;
              }
            }
          "
        />
      </template>

      <button
        type="button"
        class="flex-1 inline-flex justify-center items-center h-10 px-6 border border-transparent text-sm font-medium rounded-md text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        @click="async (event) => handleAddToCart()"
        :disabled="loading"
      >
        <template v-if="loading">
          {{ getLabel('adding', 'Adding...') }}
        </template>

        <template v-if="!loading">
          {{ getLabel('add', 'Add') }}
        </template>
      </button>
    </div>
    <template v-if="toastVisible">
      <div
        :class="`fixed top-4 right-4 z-50 flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 ${
          toastType === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`"
      >
        <div
          :class="`flex-shrink-0 w-5 h-5 mt-0.5 ${
            toastType === 'success' ? 'text-green-500' : 'text-red-500'
          }`"
        >
          <template v-if="toastType === 'success'">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" :strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
          </template>

          <template v-if="toastType === 'error'">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" :strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              ></path>
            </svg>
          </template>
        </div>
        <p
          :class="`flex-1 text-sm font-medium ${
            toastType === 'success' ? 'text-green-800' : 'text-red-800'
          }`"
        >
          {{ toastMessage }}
        </p>
        <button
          type="button"
          @click="async (event) => dismissToast()"
          :class="`flex-shrink-0 rounded focus:outline-none ${
            toastType === 'success'
              ? 'text-green-400 hover:text-green-600'
              : 'text-red-400 hover:text-red-600'
          }`"
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            class="h-4 w-4"
            :strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </template>

    <template v-if="modalVisible">
      <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div class="fixed inset-0 bg-gray-500/20" @click="async (event) => closeModal()"></div>
        <div class="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden">
          <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              class="h-5 w-5 flex-shrink-0 text-green-500"
              :strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
            <h3 class="flex-1 text-base font-semibold text-gray-900">
              {{ getLabel('modalTitle', 'Added to cart') }}
            </h3>
            <button
              type="button"
              class="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
              @click="async (event) => closeModal()"
            >
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                class="h-5 w-5"
                :strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <div class="px-6 py-5">
            <div class="flex items-start gap-4">
              <template v-if="!!getModalImageUrl()">
                <img
                  class="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                  :src="getModalImageUrl()"
                  :alt="getModalName()"
                />
              </template>

              <template v-if="!getModalImageUrl()">
                <div
                  class="w-16 h-16 flex items-center justify-center rounded border border-gray-100 flex-shrink-0 bg-gray-50"
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    class="w-8 h-8 text-gray-300"
                    :strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                    ></path>
                  </svg>
                </div>
              </template>

              <div class="flex-1 min-w-0">
                <a
                  class="text-sm font-medium text-secondary leading-tight hover:underline line-clamp-2"
                  :href="getProductUrl()"
                  >{{ getModalName() }}</a
                >
                <template v-if="!!getModalSku()">
                  <p class="text-xs text-gray-400 mt-0.5">SKU: {{ getModalSku() }}</p>
                </template>
              </div>
              <div class="flex-shrink-0 text-right">
                <p class="text-xs text-gray-500">
                  {{ getLabel('quantity', 'Quantity') }}: {{ quantity }}
                </p>
                <template v-if="!!getModalPrice()">
                  <p class="text-sm font-semibold text-gray-900 mt-0.5">
                    {{ getModalPrice() }}
                  </p>
                </template>
              </div>
            </div>
            <template v-if="getChildItems().length > 0">
              <div class="mt-3 ml-20 space-y-1 border-l-2 border-gray-100 pl-2">
                <template :key="idx" v-for="(child, idx) in getChildItems()">
                  <div class="flex justify-between items-center text-xs text-gray-600">
                    <span class="line-clamp-1">{{
                      child.product?.names?.[0]?.value || 'Option'
                    }}</span
                    ><span class="text-gray-400 whitespace-nowrap ml-2">{{
                      '\u20AC' +
                      (((includeTax !== undefined ? !!includeTax : false)
                        ? child.totalSumNet
                        : child.totalSum
                      )?.toFixed(2) || '0.00')
                    }}</span>
                  </div>
                </template>
              </div>
            </template>
          </div>
          <div class="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button
              type="button"
              class="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
              @click="async (event) => closeModal()"
            >
              {{ getLabel('continueShopping', 'Continue shopping') }}
            </button>
            <template v-if="checkoutAllowed">
              <button
                type="button"
                class="flex-1 inline-flex justify-center rounded-md border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                @click="
                  async (event) => {
                    closeModal();
                    if (onProceedToCheckout) onProceedToCheckout();
                  }
                "
              >
                {{ getLabel('proceedToCheckout', 'Proceed to checkout') }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import type { GraphQLClient, Product, Cart, Contact, Customer, CartMainItem, CartBaseItem, Cluster } from 'propeller-sdk-v2';
import { useCart } from '@/composables/vue/useCart';
import type { AnyUser } from '@/composables/shared/utils/userIdentity';

export interface AddToCartProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The authenticated user (Contact or Customer) */
  user: Contact | Customer | null;

  /** The product to be added to cart */
  product: Product;

  /** Cart ID — required when onAddToCart is not provided */
  cartId?: string;

  /** The cluster to be added to cart */
  cluster?: Cluster;

  /** IDs of the cluster child items, e.g. cluster options */
  childItems?: number[];

  /** Called before adding to cart. Return false to abort (e.g. failed validation). */
  beforeAddToCart?: () => boolean;

  /** Notes for the cart item */
  notes?: string;

  /** Custom price for the product (overrides calculated price) */
  price?: number;

  /** Label overrides for UI strings */
  labels?: Record<string, string>;

  /** If true a new cart is created if no cart ID is provided. Defaults to false. */
  createCart?: boolean;

  /** Callback to handle a new cart being created. */
  onCartCreated?: (cart: Cart) => void;

  /** Callback to handle adding the product to cart. */
  onAddToCart?: (product: Product, clusterId?: number, quantity?: number, childItems?: any[], notes?: string, price?: number, showModal?: boolean) => Cart;

  /** Callback triggered after adding the product to cart. */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /** When true a modal popup is shown after a successful add-to-cart. Defaults to false. */
  showModal?: boolean;

  /** Renders − and + buttons beside the quantity input. Defaults to true. */
  allowIncrDecr?: boolean;

  /** Validates available stock via InventoryService before adding. Defaults to false. */
  enableStockValidation?: boolean;

  /** Language code passed to CartService operations. Defaults to 'en'. */
  language?: string;

  /** Additional CSS class for the root element */
  className?: string;

  /** Callback fired when the "Proceed to checkout" modal button is clicked */
  onProceedToCheckout?: () => void;

  /** Configuration object passed to the component */
  configuration?: any;

  /** Active company ID from the company switcher. */
  companyId?: number;

  /** When true, tax-inclusive price (net) is shown. Defaults to false. */
  includeTax?: boolean;
}

const props = defineProps<AddToCartProps>();

const quantity = ref(1);
const modalVisible = ref(false);
const toastMessage = ref('');
const toastType = ref('');
const toastVisible = ref(false);
const addedCartItem = ref<CartMainItem | null>(null);
const activeFullCart = ref<Cart | null>(null);

const { loading, checkoutAllowed, addItem, getMinQuantity, getStep } = useCart({
  graphqlClient: props.graphqlClient,
  user: computed(() => props.user as AnyUser),
  companyId: computed(() => props.companyId),
  language: computed(() => props.language || 'NL'),
  configuration: props.configuration || { imageSearchFiltersGrid: {}, imageVariantFiltersSmall: {} },
  onCartCreated: props.onCartCreated,
});

onMounted(() => {
  quantity.value = getMinQuantity(props.product);
});

function increment(): void {
  quantity.value = quantity.value + getStep(props.product);
}

function decrement(): void {
  const min = getMinQuantity(props.product);
  const step = getStep(props.product);
  if (quantity.value - step >= min) {
    quantity.value = quantity.value - step;
  }
}

function showToast(message: string, type: string): void {
  toastMessage.value = message;
  toastType.value = type;
  toastVisible.value = true;
  setTimeout(() => { toastVisible.value = false; }, 3000);
}

function dismissToast(): void {
  toastVisible.value = false;
}

function getProductName(): string {
  return (props.product as Product)?.names?.[0]?.value || 'Product';
}

function getProductUrl(): string {
  return props.configuration?.urls?.getProductUrl(props.product, props.language) || '#';
}

function getProductImageUrl(): string {
  return (props.product as Product)?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}

function getProductSku(): string {
  return (props.product as Product)?.sku || '';
}

function getProductPrice(): string {
  const price = props.price !== undefined ? props.price : (props.product as Product)?.price?.gross;
  if (!price && price !== 0) return '';
  return `\u20AC${Number(price).toFixed(2)}`;
}

function getModalImageUrl(): string {
  if (addedCartItem.value) {
    const img = addedCartItem.value.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
    if (img) return img;
  }
  return getProductImageUrl();
}

function getModalName(): string {
  if (addedCartItem.value) {
    return addedCartItem.value.product?.names?.[0]?.value || getProductName();
  }
  return getProductName();
}

function getModalPrice(): string {
  if (addedCartItem.value) {
    const useTax = props.includeTax !== undefined ? !!props.includeTax : false;
    const price = useTax ? addedCartItem.value.totalSumNet : addedCartItem.value.totalSum;
    return '\u20AC' + Number(price).toFixed(2);
  }
  return getProductPrice();
}

function getModalSku(): string {
  if (addedCartItem.value) return addedCartItem.value.product?.sku || '';
  return getProductSku();
}

function getChildItems(): CartBaseItem[] {
  const children = addedCartItem.value?.childItems;
  if (!children || !Array.isArray(children)) return [];
  return children as CartBaseItem[];
}

function closeModal(): void {
  modalVisible.value = false;
  addedCartItem.value = null;
}

function getLabel(key: string, fallback: string): string {
  return (props.labels as any)?.[key] || fallback;
}

async function handleAddToCart(): Promise<void> {
  if (!props.graphqlClient) return;
  if (props.beforeAddToCart && !props.beforeAddToCart()) return;

  const result = await addItem({
    product: props.product,
    cluster: props.cluster,
    childItems: props.childItems,
    quantity: quantity.value,
    notes: props.notes,
    price: props.price,
    onAddToCart: props.onAddToCart ? (p, clusterId, qty, ci, n, pr) => props.onAddToCart!(p, clusterId, qty, ci, n, pr, props.showModal) : undefined,
    afterAddToCart: props.afterAddToCart,
    enableStockValidation: props.enableStockValidation,
    cartId: props.cartId,
    createCart: props.createCart,
  });

  if (result.success) {
    activeFullCart.value = result.cart || null;
    addedCartItem.value = result.item || null;
    if (props.showModal) {
      modalVisible.value = true;
    } else {
      showToast(`${getProductName()} ${getLabel('addedToCart', 'added to cart')}`, 'success');
    }
  } else {
    const errorMsg = result.error || 'Failed to add item to cart';
    if (errorMsg === 'Insufficient stock available') {
      showToast(getLabel('outOfStock', errorMsg), 'error');
    } else if (errorMsg === 'No cart ID provided') {
      showToast(getLabel('noCartId', errorMsg), 'error');
    } else {
      showToast(getLabel('errorAdding', errorMsg), 'error');
    }
  }
}
</script>
