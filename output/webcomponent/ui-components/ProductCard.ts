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
  computedImageLabels: () => string[];
  computedTextLabels: () => {
    name: string;
    value: string;
  }[];
}

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
import AddToCart from "./AddToCart";

/**
 * Usage:
 *
 *  <product-card></product-card>
 *
 */
class ProductCard extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      isFavorite: false,
      getProductName() {
        return (self.props.product as Product)?.names?.[0]?.value || "Product";
      },
      getProductSku() {
        return (self.props.product as Product)?.sku || "";
      },
      getProductImageUrl() {
        return (
          (self.props.product as Product)?.media?.images?.items?.[0]
            ?.imageVariants?.[0]?.url || ""
        );
      },
      getProductPrice() {
        const price = (self.props.product as Product)?.price?.gross;
        if (!price && price !== 0) return "";
        return `\u20AC${Number(price).toFixed(2)}`;
      },
      getProductUrl() {
        return self.props.configuration.urls.getProductUrl(self.props.product);
      },
      getProductShortDescription() {
        return (
          (self.props.product as Product)?.shortDescriptions?.[0]?.value || ""
        );
      },
      getProductManufacturer() {
        return (self.props.product as Product)?.manufacturer || "";
      },
      getLabel(key: string, fallback: string) {
        return (self.props.labels as Record<string, string>)?.[key] || fallback;
      },
      getAttributeValue(code: string) {
        const attrs = (self.props.product as Product)?.attributes?.items || [];
        const found = attrs.find(
          (a: AttributeResult) => a.attributeDescription?.name === code
        );
        return found?.value?.value || "";
      },
      handleProductClick(e: any) {
        if (self.props.onProductClick) {
          e.preventDefault();
          self.props.onProductClick(self.props.product);
        }
      },
      handleToggleFavorite(e: any) {
        e.preventDefault();
        e.stopPropagation();
        self.state.isFavorite = !self.state.isFavorite;
        self.update();
        if (self.props.onToggleFavorite) {
          self.props.onToggleFavorite(
            self.props.product,
            self.state.isFavorite
          );
        }
      },
      computedImageLabels() {
        if (
          !self.props.imageLabels ||
          (self.props.imageLabels as string[]).length === 0
        )
          return [];
        const attrs = (self.props.product as Product)?.attributes?.items || [];
        return (self.props.imageLabels as string[])
          .map((code: string) => {
            const found = attrs.find(
              (a: AttributeResult) => a.attributeDescription?.name === code
            );
            return found?.value?.value || "";
          })
          .filter((v: string) => v.length > 0);
      },
      computedTextLabels() {
        if (
          !self.props.textLabels ||
          (self.props.textLabels as string[]).length === 0
        )
          return [];
        const attrs = (self.props.product as Product)?.attributes?.items || [];
        return (self.props.textLabels as string[])
          .map((code: string) => {
            const found = attrs.find(
              (a: AttributeResult) => a.attributeDescription?.name === code
            );
            return {
              name: code,
              value: found?.value?.value || "",
            };
          })
          .filter(
            (item: { name: string; value: string }) => item.value.length > 0
          );
      },
    };
    if (!this.props) {
      this.props = {};
    }

    this.componentProps = [
      "product",
      "configuration",
      "labels",
      "onProductClick",
      "onToggleFavorite",
      "imageLabels",
      "textLabels",
      "className",
      "showImage",
      "enableAddFavorite",
      "showSku",
      "showName",
      "showManufacturer",
      "showShortDescription",
      "graphqlClient",
      "user",
      "cartId",
      "childItems",
      "notes",
      "price",
      "createCart",
      "onCartCreated",
      "onAddToCart",
      "afterAddToCart",
      "showModal",
      "allowIncrDecr",
      "enableStockValidation",
      "language",
      "onProceedToCheckout",
      "addToCartLabels",
    ];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'click' event on a-product-card-1
    this.onAProductCard1Click = (e) => {
      this.state.handleProductClick(e);
    };

    // Event handler for 'click' event on button-product-card-1
    this.onButtonProductCard1Click = (e) => {
      this.state.handleToggleFavorite(e);
    };

    // Event handler for 'click' event on a-product-card-2
    this.onAProductCard2Click = (e) => {
      this.state.handleProductClick(e);
    };

    // Event handler for 'cartcreated' event on add-to-cart-product-card
    this.onAddToCartProductCardCartcreated = (event) => {
      this.props.onCartCreated();
    };

    // Event handler for 'addtocart' event on add-to-cart-product-card
    this.onAddToCartProductCardAddtocart = (event) => {
      this.props.onAddToCart();
    };

    // Event handler for 'proceedtocheckout' event on add-to-cart-product-card
    this.onAddToCartProductCardProceedtocheckout = (event) => {
      this.props.onProceedToCheckout();
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
      <div data-el="div-product-card-1">
        <template data-el="show-product-card">
          <div class="relative aspect-square overflow-hidden bg-gray-50 p-4">
            <a class="block h-full w-full" data-el="a-product-card-1">
              <template data-el="show-product-card-2">
                <img
                  class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  data-el="img-product-card-1"
                />
              </template>
              <template data-el="show-product-card-3">
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
                      data-el="path-product-card-1"
                    ></path>
                  </svg>
                </div>
              </template>
            </a>
            <template data-el="show-product-card-4">
              <div
                class="pointer-events-none absolute left-2 top-2 flex flex-col gap-1"
              >
                <template data-el="for-product-card">
                  <span
                    class="inline-block rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm"
                  >
                    <template data-el="div-product-card-2"><!-- label --></template>
                  </span>
                </template>
              </div>
            </template>
            <template data-el="show-product-card-5">
              <button type="button" data-el="button-product-card-1">
                <svg
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  data-el="svg-product-card-1"
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
        <div class="flex flex-1 flex-col gap-2 p-4">
          <template data-el="show-product-card-6">
            <div class="font-mono text-xs text-gray-400">
              <template data-el="div-product-card-3">
                <!-- state.getProductSku() -->
              </template>
            </div>
          </template>
          <template data-el="show-product-card-7">
            <a
              class="line-clamp-2 text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-violet-600"
              data-el="a-product-card-2"
            >
              <template data-el="div-product-card-4">
                <!-- state.getProductName() -->
              </template>
            </a>
          </template>
          <template data-el="show-product-card-8">
            <div class="flex flex-col gap-0.5">
              <template data-el="for-product-card-2">
                <div class="text-xs text-gray-500">
                  <template data-el="div-product-card-5">
                    <!-- item.value -->
                  </template>
                </div>
              </template>
            </div>
          </template>
          <template data-el="show-product-card-9">
            <div class="text-xs text-gray-500">
              <template data-el="div-product-card-6">
                <!-- state.getProductManufacturer() -->
              </template>
            </div>
          </template>
          <template data-el="show-product-card-10">
            <p class="line-clamp-2 text-xs text-gray-500">
              <template data-el="div-product-card-7">
                <!-- state.getProductShortDescription() -->
              </template>
            </p>
          </template>
          <template data-el="show-product-card-11">
            <div class="mt-auto pt-2">
              <span class="text-lg font-bold text-gray-900">
                <template data-el="div-product-card-8">
                  <!-- state.getProductPrice() -->
                </template>
              </span>
            </div>
          </template>
        </div>
        <div class="px-4 pb-4">
          <add-to-cart
            className="flex w-full items-center gap-2"
            data-el="add-to-cart-product-card"
          ></add-to-cart>
        </div>
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
    // re-rendering needs to ensure that all nodes generated by for/show are refreshed
    this.destroyAnyNodes();
    this.updateBindings();
  }

  updateBindings() {
    this._root
      .querySelectorAll("[data-el='div-product-card-1']")
      .forEach((el) => {
        el.className = `group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 ${
          this.props.className || ""
        }`;
      });

    this._root
      .querySelectorAll("[data-el='show-product-card']")
      .forEach((el) => {
        const whenCondition = this.props.showImage !== false;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='a-product-card-1']")
      .forEach((el) => {
        el.setAttribute("href", this.state.getProductUrl());
        el.removeEventListener("click", this.onAProductCard1Click);
        el.addEventListener("click", this.onAProductCard1Click);
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-2']")
      .forEach((el) => {
        const whenCondition = !!this.state.getProductImageUrl();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='img-product-card-1']")
      .forEach((el) => {
        el.setAttribute("src", this.state.getProductImageUrl());
        el.setAttribute("alt", this.state.getProductName());
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-3']")
      .forEach((el) => {
        const whenCondition = !this.state.getProductImageUrl();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='path-product-card-1']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 1);
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-4']")
      .forEach((el) => {
        const whenCondition =
          !!this.props.imageLabels &&
          this.props.imageLabels.length > 0 &&
          this.state.computedImageLabels().length > 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='for-product-card']")
      .forEach((el) => {
        let array = this.state.computedImageLabels();
        this.renderLoop(el, array, "label");
      });

    this._root
      .querySelectorAll("[data-el='div-product-card-2']")
      .forEach((el) => {
        const label = this.getScope(el, "label");
        this.renderTextNode(el, label);
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-5']")
      .forEach((el) => {
        const whenCondition = this.props.enableAddFavorite;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-product-card-1']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonProductCard1Click);
        el.addEventListener("click", this.onButtonProductCard1Click);
        el.setAttribute(
          "aria-label",
          this.state.isFavorite
            ? this.state.getLabel(
                "removeFromFavorites",
                "Remove from favourites"
              )
            : this.state.getLabel("addToFavorites", "Add to favourites")
        );
        el.className = `absolute right-2 top-2 rounded-full border bg-white p-1.5 shadow-sm transition-colors ${
          this.state.isFavorite
            ? "border-red-200 text-red-500"
            : "border-gray-100 text-gray-300 hover:text-red-400"
        }`;
      });

    this._root
      .querySelectorAll("[data-el='svg-product-card-1']")
      .forEach((el) => {
        el.setAttribute(
          "fill",
          this.state.isFavorite ? "currentColor" : "none"
        );
        el.setAttribute("strokeWidth", 2);
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-6']")
      .forEach((el) => {
        const whenCondition =
          this.props.showSku !== false && !!this.state.getProductSku();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-product-card-3']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductSku());
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-7']")
      .forEach((el) => {
        const whenCondition = this.props.showName !== false;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='a-product-card-2']")
      .forEach((el) => {
        el.setAttribute("href", this.state.getProductUrl());
        el.removeEventListener("click", this.onAProductCard2Click);
        el.addEventListener("click", this.onAProductCard2Click);
      });

    this._root
      .querySelectorAll("[data-el='div-product-card-4']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductName());
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-8']")
      .forEach((el) => {
        const whenCondition =
          !!this.props.textLabels &&
          this.props.textLabels.length > 0 &&
          this.state.computedTextLabels().length > 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='for-product-card-2']")
      .forEach((el) => {
        let array = this.state.computedTextLabels();
        this.renderLoop(el, array, "item");
      });

    this._root
      .querySelectorAll("[data-el='div-product-card-5']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        this.renderTextNode(el, item.value);
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-9']")
      .forEach((el) => {
        const whenCondition =
          this.props.showManufacturer && !!this.state.getProductManufacturer();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-product-card-6']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductManufacturer());
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-10']")
      .forEach((el) => {
        const whenCondition =
          this.props.showShortDescription &&
          !!this.state.getProductShortDescription();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-product-card-7']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductShortDescription());
      });

    this._root
      .querySelectorAll("[data-el='show-product-card-11']")
      .forEach((el) => {
        const whenCondition = !!this.state.getProductPrice();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-product-card-8']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getProductPrice());
      });

    this._root
      .querySelectorAll("[data-el='add-to-cart-product-card']")
      .forEach((el) => {
        el.setAttribute("graphqlClient", this.props.graphqlClient);
        el.graphqlClient = this.props.graphqlClient;
        if (el.props) {
          el.props.graphqlClient = this.props.graphqlClient;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.graphqlClient = this.props.graphqlClient;
        }
        el.setAttribute("user", this.props.user);
        el.user = this.props.user;
        if (el.props) {
          el.props.user = this.props.user;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.user = this.props.user;
        }
        el.setAttribute("product", this.props.product);
        el.product = this.props.product;
        if (el.props) {
          el.props.product = this.props.product;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.product = this.props.product;
        }
        el.setAttribute("cartId", this.props.cartId);
        el.cartId = this.props.cartId;
        if (el.props) {
          el.props.cartId = this.props.cartId;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.cartId = this.props.cartId;
        }
        el.setAttribute("configuration", this.props.configuration);
        el.configuration = this.props.configuration;
        if (el.props) {
          el.props.configuration = this.props.configuration;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.configuration = this.props.configuration;
        }
        el.setAttribute("childItems", this.props.childItems);
        el.childItems = this.props.childItems;
        if (el.props) {
          el.props.childItems = this.props.childItems;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.childItems = this.props.childItems;
        }
        el.setAttribute("notes", this.props.notes);
        el.notes = this.props.notes;
        if (el.props) {
          el.props.notes = this.props.notes;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.notes = this.props.notes;
        }
        el.setAttribute("price", this.props.price);
        el.price = this.props.price;
        if (el.props) {
          el.props.price = this.props.price;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.price = this.props.price;
        }
        el.setAttribute("createCart", this.props.createCart);
        el.createCart = this.props.createCart;
        if (el.props) {
          el.props.createCart = this.props.createCart;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.createCart = this.props.createCart;
        }
        el.removeEventListener(
          "cartcreated",
          this.onAddToCartProductCardCartcreated
        );
        el.addEventListener(
          "cartcreated",
          this.onAddToCartProductCardCartcreated
        );
        el.removeEventListener(
          "addtocart",
          this.onAddToCartProductCardAddtocart
        );
        el.addEventListener("addtocart", this.onAddToCartProductCardAddtocart);
        el.setAttribute("afterAddToCart", this.props.afterAddToCart);
        el.afterAddToCart = this.props.afterAddToCart;
        if (el.props) {
          el.props.afterAddToCart = this.props.afterAddToCart;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.afterAddToCart = this.props.afterAddToCart;
        }
        el.setAttribute("showModal", this.props.showModal);
        el.showModal = this.props.showModal;
        if (el.props) {
          el.props.showModal = this.props.showModal;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.showModal = this.props.showModal;
        }
        el.setAttribute("allowIncrDecr", this.props.allowIncrDecr);
        el.allowIncrDecr = this.props.allowIncrDecr;
        if (el.props) {
          el.props.allowIncrDecr = this.props.allowIncrDecr;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.allowIncrDecr = this.props.allowIncrDecr;
        }
        el.setAttribute(
          "enableStockValidation",
          this.props.enableStockValidation
        );
        el.enableStockValidation = this.props.enableStockValidation;
        if (el.props) {
          el.props.enableStockValidation = this.props.enableStockValidation;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.enableStockValidation = this.props.enableStockValidation;
        }
        el.setAttribute("language", this.props.language);
        el.language = this.props.language;
        if (el.props) {
          el.props.language = this.props.language;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.language = this.props.language;
        }
        el.removeEventListener(
          "proceedtocheckout",
          this.onAddToCartProductCardProceedtocheckout
        );
        el.addEventListener(
          "proceedtocheckout",
          this.onAddToCartProductCardProceedtocheckout
        );
        el.setAttribute("labels", this.props.addToCartLabels);
        el.labels = this.props.addToCartLabels;
        if (el.props) {
          el.props.labels = this.props.addToCartLabels;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.labels = this.props.addToCartLabels;
        }
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

  // scope helper
  getScope(el, name) {
    do {
      let value = el?.scope?.[name];
      if (value !== undefined) {
        return value;
      }
    } while ((el = el.parentNode));
  }

  // Helper to render loops
  renderLoop(template, array, itemName, itemIndex, collectionName) {
    const collection = [];
    for (let [index, value] of array.entries()) {
      const elementFragment = template.content.cloneNode(true);
      const children = Array.from(elementFragment.childNodes);
      const localScope = {};
      let scope = localScope;
      if (template?.scope) {
        const getParent = {
          get(target, prop, receiver) {
            if (prop in target) {
              return target[prop];
            }
            if (prop in template.scope) {
              return template.scope[prop];
            }
            return target[prop];
          },
        };
        scope = new Proxy(localScope, getParent);
      }
      children.forEach((child) => {
        if (itemName !== undefined) {
          scope[itemName] = value;
        }
        if (itemIndex !== undefined) {
          scope[itemIndex] = index;
        }
        if (collectionName !== undefined) {
          scope[collectionName] = array;
        }
        child.scope = scope;
        if (template.context) {
          child.context = context;
        }
        this.nodesToDestroy.push(child);
        collection.unshift(child);
      });
    }
    collection.forEach((child) => template.after(child));
  }
}

customElements.define("product-card", ProductCard);
