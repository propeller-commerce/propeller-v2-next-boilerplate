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

  /** Notes for the cart item */
  notes?: string;

  /** Custom price for the product (overrides calculated price) */
  price?: number;

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
  labels?: Record<string, string>;

  /**
   * If true a new cart is created if no cart ID is provided.
   * Defaults to false.
   */
  createCart?: boolean;

  /**
   * Callback to handle a new cart being created.
   * WARNING: If not provided the component create new carts on every add-to-cart.
   */
  onCartCreated?: (cart: Cart) => void;

  /**
   * Callback to handle adding the product to cart.
   * If not provided the component calls CartService.addItemToCart internally.
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

  /**
   * Callback triggered after adding the product to cart.
   */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /**
   * When true a modal popup is shown after a successful add-to-cart
   * with buttons to continue shopping or proceed to checkout.
   * Defaults to false (only a brief inline success message is shown).
   */
  showModal?: boolean;

  /**
   * Renders − and + buttons beside the quantity input.
   * Defaults to true.
   */
  allowIncrDecr?: boolean;

  /**
   * Validates available stock via InventoryService before adding.
   * Defaults to false.
   */
  enableStockValidation?: boolean;

  /** Language code passed to CartService operations. Defaults to 'en'. */
  language?: string;

  /** Additional CSS class for the root element */
  className?: string;

  /** Callback fired when the "Proceed to checkout" modal button is clicked */
  onProceedToCheckout?: () => void;

  /** Configuration object passed to the component */
  configuration?: any;
}

/**
 * Cart query variables interface
 Variables for the cart query
 */
/**
 * Cart query variables interface
 Variables for the cart query
 */
export interface CartQueryVariables {
  /** Cart ID to fetch */
  cartId: string;
  /** Language for localized content */
  language: string;
  /** Image search filters */
  imageSearchFilters: MediaImageProductSearchInput;
  /** Image transformation filters */
  imageVariantFilters: TransformationsInput;
}
/**
 * Cart query variables interface
 Variables for the cart query
 */

interface AddToCartState {
  quantity: number;
  loading: boolean;
  success: boolean;
  modalVisible: boolean;
  activeCartId: string;
  toastMessage: string;
  toastType: string;
  toastVisible: boolean;
  increment: () => void;
  decrement: () => void;
  showToast: (message: string, type: string) => void;
  dismissToast: () => void;
  getProductName: () => string;
  getProductUrl: () => string;
  getProductImageUrl: () => string;
  getProductSku: () => string;
  getProductPrice: () => string;
  initCart: () => Promise<void>;
  handleAddToCart: () => Promise<void>;
  closeModal: () => void;
  getLabel: (key: string, fallback: string) => string;
}

import {
  CartService,
  CartChildItemInput,
  GraphQLClient,
  Product,
  Cart,
  Contact,
  Customer,
  CartSearchInput,
  TransformationsInput,
  MediaImageProductSearchInput,
  CartStartInput,
  CartStartVariables,
  Address,
  Enums,
  CartMainItem,
  Cluster,
} from "propeller-sdk-v2";

/**
 * Usage:
 *
 *  <add-to-cart></add-to-cart>
 *
 */
class AddToCart extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      quantity: 1,
      loading: false,
      success: false,
      modalVisible: false,
      activeCartId: "",
      toastMessage: "",
      toastType: "",
      toastVisible: false,
      increment() {
        self.state.quantity = self.state.quantity + 1;
        self.update();
      },
      decrement() {
        if (self.state.quantity > 1) {
          self.state.quantity = self.state.quantity - 1;
          self.update();
        }
      },
      showToast(message: string, type: string) {
        self.state.toastMessage = message;
        self.update();
        self.state.toastType = type;
        self.update();
        self.state.toastVisible = true;
        self.update();
        setTimeout(() => {
          self.state.toastVisible = false;
          self.update();
        }, 3000);
      },
      dismissToast() {
        self.state.toastVisible = false;
        self.update();
      },
      getProductName() {
        return (self.props.product as any)?.names?.[0]?.value || "Product";
      },
      getProductUrl() {
        return self.props.configuration.urls.getProductUrl(self.props.product);
      },
      getProductImageUrl() {
        return (
          (self.props.product as any)?.media?.images?.items?.[0]
            ?.imageVariants?.[0]?.url || ""
        );
      },
      getProductSku() {
        return (self.props.product as any)?.sku || "";
      },
      getProductPrice() {
        const price =
          self.props.price !== undefined
            ? self.props.price
            : (self.props.product as any)?.price?.gross;
        if (!price && price !== 0) return "";
        return `\u20AC${Number(price).toFixed(2)}`;
      },
      initCart: async function initCart() {
        const cartService = new CartService(self.props.graphqlClient);
        // 1. Check for existing carts for this user first
        if (self.props.user) {
          try {
            const searchInput: CartSearchInput = {
              offset: 100,
            };
            if ("contactId" in self.props.user && self.props.user.contactId) {
              searchInput.contactIds = [self.props.user.contactId];
              if (
                self.props.user.company &&
                "companyId" in self.props.user.company &&
                self.props.user.company.companyId
              ) {
                searchInput.companyIds = [self.props.user.company.companyId];
              }
            } else if (
              "customerId" in self.props.user &&
              self.props.user.customerId
            ) {
              searchInput.customerIds = [self.props.user.customerId];
            }
            const carts = await cartService.getCarts(searchInput);
            if (carts && carts.items && carts.items.length > 0) {
              const cartId = carts.items[carts.items.length - 1].cartId;
              const cartVariables: CartQueryVariables = {
                cartId: cartId,
                imageSearchFilters:
                  self.props.configuration.imageSearchFiltersGrid,
                imageVariantFilters:
                  self.props.configuration.imageVariantFiltersSmall,
                language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "NL",
              };
              const cart = await cartService.getCart(cartVariables);
              self.state.activeCartId = cart.cartId;
              self.update();
              if (self.props.onCartCreated) {
                self.props.onCartCreated(cart);
              }
            }
          } catch (e) {
            console.error("Failed to check existing carts", e);
          }
        }

        // 2. Start a new cart
        const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "NL";
        const startCartInput: CartStartInput = {
          language,
        };
        if (self.props.user) {
          if ("contactId" in self.props.user && self.props.user.contactId) {
            startCartInput.contactId = self.props.user.contactId;
            if ("companyId" in self.props.user && self.props.user.companyId) {
              startCartInput.companyId = self.props.user.companyId as number;
            }
          } else if (
            "customerId" in self.props.user &&
            self.props.user.customerId
          ) {
            startCartInput.customerId = self.props.user.customerId;
          }
        }
        const cartStartVars: CartStartVariables = {
          input: startCartInput,
          imageSearchFilters: self.props.configuration.imageSearchFiltersGrid,
          imageVariantFilters:
            self.props.configuration.imageVariantFiltersSmall,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "NL",
        };
        let newCart = await cartService.startCart(cartStartVars);

        // 3. Assign Default Addresses
        if (newCart && self.props.user) {
          const addresses =
            "company" in self.props.user
              ? self.props.user.company?.addresses
              : (self.props.user as Customer).addresses;
          if (addresses && Array.isArray(addresses)) {
            const defaultInvoice = addresses.find(
              (addr: Address) =>
                addr.isDefault === "Y" && addr.type === "invoice"
            );
            const defaultDelivery = addresses.find(
              (addr: Address) =>
                addr.isDefault === "Y" && addr.type === "delivery"
            );
            if (defaultInvoice) {
              newCart = await cartService.updateCartAddress({
                id: newCart.cartId,
                input: {
                  type: Enums.CartAddressType.INVOICE,
                  firstName: defaultInvoice.firstName || "",
                  lastName: defaultInvoice.lastName || "",
                  street: defaultInvoice.street || "",
                  postalCode: defaultInvoice.postalCode || "",
                  city: defaultInvoice.city || "",
                  country: defaultInvoice.country || "NL",
                  company: defaultInvoice.company || "",
                  gender: defaultInvoice.gender || Enums.Gender.U,
                  middleName: defaultInvoice.middleName || "",
                  number: defaultInvoice.number || "",
                  numberExtension: defaultInvoice.numberExtension || "",
                  email: defaultInvoice.email || "",
                  mobile: defaultInvoice.mobile || "",
                  phone: defaultInvoice.phone || "",
                  notes: defaultInvoice.notes || "",
                },
                imageSearchFilters:
                  self.props.configuration.imageSearchFiltersGrid,
                imageVariantFilters:
                  self.props.configuration.imageVariantFiltersSmall,
                language: language,
              });
            }
            if (defaultDelivery) {
              newCart = await cartService.updateCartAddress({
                id: newCart.cartId,
                input: {
                  type: Enums.CartAddressType.DELIVERY,
                  firstName: defaultDelivery.firstName || "",
                  lastName: defaultDelivery.lastName || "",
                  street: defaultDelivery.street || "",
                  postalCode: defaultDelivery.postalCode || "",
                  city: defaultDelivery.city || "",
                  country: defaultDelivery.country || "NL",
                  company: defaultDelivery.company || "",
                  gender: defaultDelivery.gender || Enums.Gender.U,
                  middleName: defaultDelivery.middleName || "",
                  number: defaultDelivery.number || "",
                  numberExtension: defaultDelivery.numberExtension || "",
                  email: defaultDelivery.email || "",
                  mobile: defaultDelivery.mobile || "",
                  phone: defaultDelivery.phone || "",
                  notes: defaultDelivery.notes || "",
                },
                imageSearchFilters:
                  self.props.configuration.imageSearchFiltersGrid,
                imageVariantFilters:
                  self.props.configuration.imageVariantFiltersSmall,
                language: language,
              });
            }
          }
        }
        self.state.activeCartId = newCart.cartId;
        self.update();
        if (self.props.onCartCreated) {
          self.props.onCartCreated(newCart);
        }
      },
      handleAddToCart: async function handleAddToCart() {
        if (!self.props.graphqlClient) return;
        self.state.loading = true;
        self.update();
        self.state.success = false;
        self.update();
        try {
          // Optional stock validation
          if (self.props.enableStockValidation) {
            const inventory = self.props.product.inventory;
            const available = inventory?.totalQuantity || 0;
            if (available < self.state.quantity) {
              self.state.showToast(
                self.state.getLabel(
                  "outOfStock",
                  "Insufficient stock available"
                ),
                "error"
              );
              return;
            }
          }

          // Map raw child-item IDs → CartChildItemInput[]
          const childItems: CartChildItemInput[] | undefined = self.props
            .childItems
            ? self.props.childItems.map((id: number) => ({
                productId: id,
                quantity: self.state.quantity,
              }))
            : undefined;
          if (self.props.onAddToCart) {
            // Consumer-provided handler
            const cart = self.props.onAddToCart(
              self.props.product,
              self.props.cluster?.clusterId,
              self.state.quantity,
              childItems,
              self.props.notes,
              self.props.price,
              self.props.showModal
            );
            self.props.afterAddToCart?.(
              cart,
              cart.items?.find(
                (item) => item.productId === self.props.product.productId
              )
            );
          } else {
            // Internal CartService fallback — resolve cart ID
            let cartId = self.props.cartId || self.state.activeCartId;
            if (!cartId) {
              if (self.props.createCart) {
                await self.state.initCart();
                cartId = self.state.activeCartId;
              }
              if (!cartId) {
                self.state.showToast(
                  self.state.getLabel("noCartId", "No cart ID provided"),
                  "error"
                );
                return;
              }
            }
            const cartService = new CartService(self.props.graphqlClient);
            const cart = await cartService.addItemToCart({
              id: cartId,
              input: {
                productId: self.props.product.productId,
                quantity: self.state.quantity,
                ...(self.props.cluster?.clusterId !== undefined && {
                  clusterId: self.props.cluster?.clusterId,
                }),
                ...(childItems && {
                  childItems,
                }),
                ...(self.props.notes && {
                  notes: self.props.notes,
                }),
                ...(self.props.price !== undefined && {
                  price: self.props.price,
                }),
              },
              language: self.props.language || "NL",
              imageSearchFilters:
                self.props.configuration.imageSearchFiltersGrid,
              imageVariantFilters:
                self.props.configuration.imageVariantFiltersSmall,
            });
            self.props.afterAddToCart?.(
              cart,
              cart.items?.find(
                (item) => item.productId === self.props.product.productId
              )
            );
          }
          self.state.success = true;
          self.update();
          if (self.props.showModal) {
            self.state.modalVisible = true;
            self.update();
          } else {
            self.state.showToast(
              `${self.state.getProductName()} ${self.state.getLabel(
                "addedToCart",
                "added to cart"
              )}`,
              "success"
            );
          }
        } catch (error) {
          console.error("Error adding to cart:", error);
          self.state.showToast(
            self.state.getLabel("errorAdding", "Failed to add item to cart"),
            "error"
          );
        } finally {
          self.state.loading = false;
          self.update();
        }
      },
      closeModal() {
        self.state.modalVisible = false;
        self.update();
        self.state.success = false;
        self.update();
      },
      getLabel(key: string, fallback: string) {
        return (self.props.labels as any)?.[key] || fallback;
      },
    };
    if (!this.props) {
      this.props = {};
    }

    this.componentProps = [
      "product",
      "configuration",
      "price",
      "graphqlClient",
      "user",
      "onCartCreated",
      "enableStockValidation",
      "childItems",
      "onAddToCart",
      "cluster",
      "notes",
      "showModal",
      "afterAddToCart",
      "cartId",
      "createCart",
      "language",
      "labels",
      "className",
      "allowIncrDecr",
      "onProceedToCheckout",
    ];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'click' event on button-add-to-cart-1
    this.onButtonAddToCart1Click = (event) => {
      this.state.decrement();
    };

    // Event handler for 'change' event on input-add-to-cart-1
    this.onInputAddToCart1Change = (e) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 1) {
        this.state.quantity = val;
        this.update();
        this.update();
      }
    };

    // Event handler for 'click' event on button-add-to-cart-2
    this.onButtonAddToCart2Click = (event) => {
      this.state.increment();
    };

    // Event handler for 'change' event on input-add-to-cart-2
    this.onInputAddToCart2Change = (e) => {
      const val = parseInt(e.target.value, 10);
      if (val >= 1) {
        this.state.quantity = val;
        this.update();
        this.update();
      }
    };

    // Event handler for 'click' event on button-add-to-cart-3
    this.onButtonAddToCart3Click = (event) => {
      this.state.handleAddToCart();
    };

    // Event handler for 'click' event on button-add-to-cart-4
    this.onButtonAddToCart4Click = (event) => {
      this.state.dismissToast();
    };

    // Event handler for 'click' event on div-add-to-cart-7
    this.onDivAddToCart7Click = (event) => {
      this.state.closeModal();
    };

    // Event handler for 'click' event on button-add-to-cart-5
    this.onButtonAddToCart5Click = (event) => {
      this.state.closeModal();
    };

    // Event handler for 'click' event on button-add-to-cart-6
    this.onButtonAddToCart6Click = (event) => {
      this.state.closeModal();
    };

    // Event handler for 'click' event on button-add-to-cart-7
    this.onButtonAddToCart7Click = (event) => {
      this.state.closeModal();
      if (this.props.onProceedToCheckout) this.props.onProceedToCheckout();
    };

    if (undefined) {
      this.attachShadow({ mode: "open" });
    }
  }

  destroyAnyNodes() {
    // destroy current view template refs before rendering again
    this.nodesToDestroy.forEach((el) => el.remove());
    this.nodesToDestroy = [];
  }

  connectedCallback() {
    this.getAttributeNames().forEach((attr) => {
      const jsVar = attr.replace(/-/g, "");
      const regexp = new RegExp(jsVar, "i");
      this.componentProps.forEach((prop) => {
        if (regexp.test(prop)) {
          const attrValue = this.getAttribute(attr);
          if (this.props[prop] !== attrValue) {
            this.props[prop] = attrValue;
          }
        }
      });
    });

    this._root.innerHTML = `
      <div data-el="div-add-to-cart-1">
        <div class="flex items-center gap-2 w-full">
          <template data-el="show-add-to-cart">
            <div
              class="flex items-center border border-gray-300 rounded-md bg-white h-10"
            >
              <button
                type="button"
                class="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-md select-none"
                data-el="button-add-to-cart-1"
              >
                -
              </button>
              <input
                type="number"
                class="w-10 text-center text-sm bg-transparent border-none focus:ring-0 focus:outline-none h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                data-el="input-add-to-cart-1"
                data-dom-state="AddToCart-input-add-to-cart-1"
              />
              <button
                type="button"
                class="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-md select-none"
                data-el="button-add-to-cart-2"
              >
                +
              </button>
            </div>
          </template>
          <template data-el="show-add-to-cart-2">
            <input
              type="number"
              class="w-16 h-10 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              data-el="input-add-to-cart-2"
              data-dom-state="AddToCart-input-add-to-cart-2"
            />
          </template>
          <button
            type="button"
            class="flex-1 inline-flex justify-center items-center h-10 px-6 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-el="button-add-to-cart-3"
          >
            <template data-el="show-add-to-cart-3">
              <template data-el="div-add-to-cart-2">
                <!-- state.getLabel('adding', 'Adding...') -->
              </template>
            </template>
            <template data-el="show-add-to-cart-4">
              <template data-el="div-add-to-cart-3">
                <!-- state.getLabel('add', 'Add') -->
              </template>
            </template>
          </button>
        </div>
        <template data-el="show-add-to-cart-5">
          <div data-el="div-add-to-cart-4">
            <div data-el="div-add-to-cart-5">
              <template data-el="show-add-to-cart-6">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  data-el="svg-add-to-cart-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </template>
              <template data-el="show-add-to-cart-7">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  data-el="svg-add-to-cart-2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  ></path>
                </svg>
              </template>
            </div>
            <p data-el="p-add-to-cart-1">
              <template data-el="div-add-to-cart-6">
                <!-- state.toastMessage -->
              </template>
            </p>
            <button type="button" data-el="button-add-to-cart-4">
              <svg
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                class="h-4 w-4"
                data-el="svg-add-to-cart-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>
        </template>
        <template data-el="show-add-to-cart-8">
          <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
              class="fixed inset-0 bg-gray-500/20"
              data-el="div-add-to-cart-7"
            ></div>
            <div
              class="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden"
            >
              <div class="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  class="h-5 w-5 flex-shrink-0 text-green-500"
                  data-el="svg-add-to-cart-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
                <h3 class="flex-1 text-base font-semibold text-gray-900">
                  <template data-el="div-add-to-cart-8">
                    <!-- state.getLabel('modalTitle', 'Added to cart') -->
                  </template>
                </h3>
                <button
                  type="button"
                  class="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
                  data-el="button-add-to-cart-5"
                >
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    class="h-5 w-5"
                    data-el="svg-add-to-cart-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              </div>
              <div class="px-6 py-5 flex items-start gap-4">
                <template data-el="show-add-to-cart-9">
                  <img
                    class="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                    data-el="img-add-to-cart-1"
                  />
                </template>
                <div class="flex-1 min-w-0">
                  <a
                    class="text-sm font-medium text-violet-600 leading-tight hover:underline"
                    data-el="a-add-to-cart-1"
                  >
                    <template data-el="div-add-to-cart-9">
                      <!-- state.getProductName() -->
                    </template>
                  </a>
                  <template data-el="show-add-to-cart-10">
                    <p class="text-xs text-gray-400 mt-0.5">
                      SKU:
                      <template data-el="div-add-to-cart-10">
                        <!-- state.getProductSku() -->
                      </template>
                    </p>
                  </template>
                </div>
                <div class="flex-shrink-0 text-right">
                  <p class="text-xs text-gray-500">
                    <template data-el="div-add-to-cart-11">
                      <!-- state.getLabel('quantity', 'Quantity') -->
                    </template>
                    :
                    <template data-el="div-add-to-cart-12">
                      <!-- state.quantity -->
                    </template>
                  </p>
                  <template data-el="show-add-to-cart-11">
                    <p class="text-sm font-semibold text-gray-900 mt-0.5">
                      <template data-el="div-add-to-cart-13">
                        <!-- state.getProductPrice() -->
                      </template>
                    </p>
                  </template>
                </div>
              </div>
              <div class="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button
                  type="button"
                  class="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  data-el="button-add-to-cart-6"
                >
                  <template data-el="div-add-to-cart-14">
                    <!-- state.getLabel('continueShopping', 'Continue shopping') -->
                  </template>
                </button>
                <button
                  type="button"
                  class="flex-1 inline-flex justify-center rounded-md border border-transparent bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                  data-el="button-add-to-cart-7"
                >
                  <template data-el="div-add-to-cart-15">
                    <!-- state.getLabel('proceedToCheckout', 'Proceed to checkout') -->
                  </template>
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>`;
    this.pendingUpdate = true;

    this.render();
    this.onMount();
    this.pendingUpdate = false;
    this.update();
  }

  showContent(el) {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement/content
    // grabs the content of a node that is between <template> tags
    // iterates through child nodes to register all content including text elements
    // attaches the content after the template

    const elementFragment = el.content.cloneNode(true);
    const children = Array.from(elementFragment.childNodes);
    children.forEach((child) => {
      if (el?.scope) {
        child.scope = el.scope;
      }
      if (el?.context) {
        child.context = el.context;
      }
      this.nodesToDestroy.push(child);
    });
    el.after(elementFragment);
  }

  onMount() {}

  onUpdate() {}

  update() {
    if (this.pendingUpdate === true) {
      return;
    }
    this.pendingUpdate = true;
    this.render();
    this.onUpdate();
    this.pendingUpdate = false;
  }

  render() {
    // grab previous input state
    const preStateful = this.getStateful(this._root);
    const preValues = this.prepareHydrate(preStateful);

    // re-rendering needs to ensure that all nodes generated by for/show are refreshed
    this.destroyAnyNodes();
    this.updateBindings();

    // hydrate input state
    if (preValues.length) {
      const nextStateful = this.getStateful(this._root);
      this.hydrateDom(preValues, nextStateful);
    }
  }

  getStateful(el) {
    const stateful = el.querySelectorAll("[data-dom-state]");
    return stateful ? Array.from(stateful) : [];
  }
  prepareHydrate(stateful) {
    return stateful.map((el) => {
      return {
        id: el.dataset.domState,
        value: el.value,
        active: document.activeElement === el,
        selectionStart: el.selectionStart,
      };
    });
  }
  hydrateDom(preValues, stateful) {
    return stateful.map((el, index) => {
      const prev = preValues.find((prev) => el.dataset.domState === prev.id);
      if (prev) {
        el.value = prev.value;
        if (prev.active) {
          el.focus();
          el.selectionStart = prev.selectionStart;
        }
      }
    });
  }

  updateBindings() {
    this._root
      .querySelectorAll("[data-el='div-add-to-cart-1']")
      .forEach((el) => {
        el.className = this.props.className;
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart']")
      .forEach((el) => {
        const whenCondition = this.props.allowIncrDecr !== false;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-add-to-cart-1']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonAddToCart1Click);
        el.addEventListener("click", this.onButtonAddToCart1Click);
        el.setAttribute(
          "disabled",
          this.state.quantity <= 1 || this.state.loading
        );
      });

    this._root
      .querySelectorAll("[data-el='input-add-to-cart-1']")
      .forEach((el) => {
        el.setAttribute("min", 1);
        el.value = this.state.quantity;
        el.removeEventListener("change", this.onInputAddToCart1Change);
        el.addEventListener("change", this.onInputAddToCart1Change);
      });

    this._root
      .querySelectorAll("[data-el='button-add-to-cart-2']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonAddToCart2Click);
        el.addEventListener("click", this.onButtonAddToCart2Click);
        el.setAttribute("disabled", this.state.loading);
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-2']")
      .forEach((el) => {
        const whenCondition = this.props.allowIncrDecr === false;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='input-add-to-cart-2']")
      .forEach((el) => {
        el.setAttribute("min", 1);
        el.value = this.state.quantity;
        el.removeEventListener("change", this.onInputAddToCart2Change);
        el.addEventListener("change", this.onInputAddToCart2Change);
      });

    this._root
      .querySelectorAll("[data-el='button-add-to-cart-3']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonAddToCart3Click);
        el.addEventListener("click", this.onButtonAddToCart3Click);
        el.setAttribute("disabled", this.state.loading);
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-3']")
      .forEach((el) => {
        const whenCondition = this.state.loading;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-2']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("adding", "Adding..."));
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-4']")
      .forEach((el) => {
        const whenCondition = !this.state.loading;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-3']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("add", "Add"));
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-5']")
      .forEach((el) => {
        const whenCondition = this.state.toastVisible;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-4']")
      .forEach((el) => {
        el.className = `fixed top-4 right-4 z-50 flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 ${
          this.state.toastType === "success"
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`;
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-5']")
      .forEach((el) => {
        el.className = `flex-shrink-0 w-5 h-5 mt-0.5 ${
          this.state.toastType === "success" ? "text-green-500" : "text-red-500"
        }`;
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-6']")
      .forEach((el) => {
        const whenCondition = this.state.toastType === "success";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='svg-add-to-cart-1']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 2);
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-7']")
      .forEach((el) => {
        const whenCondition = this.state.toastType === "error";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='svg-add-to-cart-2']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 2);
      });

    this._root.querySelectorAll("[data-el='p-add-to-cart-1']").forEach((el) => {
      el.className = `flex-1 text-sm font-medium ${
        this.state.toastType === "success" ? "text-green-800" : "text-red-800"
      }`;
    });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-6']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.toastMessage);
      });

    this._root
      .querySelectorAll("[data-el='button-add-to-cart-4']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonAddToCart4Click);
        el.addEventListener("click", this.onButtonAddToCart4Click);
        el.className = `flex-shrink-0 rounded focus:outline-none ${
          this.state.toastType === "success"
            ? "text-green-400 hover:text-green-600"
            : "text-red-400 hover:text-red-600"
        }`;
      });

    this._root
      .querySelectorAll("[data-el='svg-add-to-cart-3']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 2);
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-8']")
      .forEach((el) => {
        const whenCondition = this.state.modalVisible;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-7']")
      .forEach((el) => {
        el.removeEventListener("click", this.onDivAddToCart7Click);
        el.addEventListener("click", this.onDivAddToCart7Click);
      });

    this._root
      .querySelectorAll("[data-el='svg-add-to-cart-4']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 2);
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-8']")
      .forEach((el) => {
        this.renderTextNode(
          el,
          this.state.getLabel("modalTitle", "Added to cart")
        );
      });

    this._root
      .querySelectorAll("[data-el='button-add-to-cart-5']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonAddToCart5Click);
        el.addEventListener("click", this.onButtonAddToCart5Click);
      });

    this._root
      .querySelectorAll("[data-el='svg-add-to-cart-5']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 2);
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-9']")
      .forEach((el) => {
        const whenCondition = !!this.state.getProductImageUrl();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='img-add-to-cart-1']")
      .forEach((el) => {
        el.setAttribute("src", this.state.getProductImageUrl());
        el.setAttribute("alt", this.state.getProductName());
      });

    this._root.querySelectorAll("[data-el='a-add-to-cart-1']").forEach((el) => {
      el.setAttribute("href", this.state.getProductUrl());
    });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-9']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductName());
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-10']")
      .forEach((el) => {
        const whenCondition = !!this.state.getProductSku();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-10']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductSku());
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-11']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("quantity", "Quantity"));
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-12']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.quantity);
      });

    this._root
      .querySelectorAll("[data-el='show-add-to-cart-11']")
      .forEach((el) => {
        const whenCondition = !!this.state.getProductPrice();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-13']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductPrice());
      });

    this._root
      .querySelectorAll("[data-el='button-add-to-cart-6']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonAddToCart6Click);
        el.addEventListener("click", this.onButtonAddToCart6Click);
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-14']")
      .forEach((el) => {
        this.renderTextNode(
          el,
          this.state.getLabel("continueShopping", "Continue shopping")
        );
      });

    this._root
      .querySelectorAll("[data-el='button-add-to-cart-7']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonAddToCart7Click);
        el.addEventListener("click", this.onButtonAddToCart7Click);
      });

    this._root
      .querySelectorAll("[data-el='div-add-to-cart-15']")
      .forEach((el) => {
        this.renderTextNode(
          el,
          this.state.getLabel("proceedToCheckout", "Proceed to checkout")
        );
      });
  }

  // Helper to render content
  renderTextNode(el, text) {
    const textNode = document.createTextNode(text);
    if (el?.scope) {
      textNode.scope = el.scope;
    }
    if (el?.context) {
      textNode.context = el.context;
    }
    el.after(textNode);
    this.nodesToDestroy.push(el.nextSibling);
  }
}

customElements.define("add-to-cart", AddToCart);
