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

  /** Extra CSS class applied to the root element. */
  className?: string;

  /** Configuration object passed to the component */
  configuration?: any;
}
interface ClusterCardState {
  isFavorite: boolean;
  getClusterName: () => string;
  getClusterSku: () => string;
  getClusterImageUrl: () => string;
  getClusterPrice: () => string;
  getClusterUrl: () => string;
  getClusterShortDescription: () => string;
  getClusterManufacturer: () => string;
  getStockQuantity: () => number;
  getStockStatusLabel: () => string;
  getStockStatusClass: () => string;
  getLabel: (key: string, fallback: string) => string;
  handleClusterClick: (e: any) => void;
  handleToggleFavorite: (e: any) => void;
  computedImageLabels: () => string[];
  computedTextLabels: () => {
    name: string;
    value: string;
  }[];
}

import { Cluster, AttributeResult } from "propeller-sdk-v2";

/**
 * Usage:
 *
 *  <cluster-card></cluster-card>
 *
 */
class ClusterCard extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      isFavorite: false,
      getClusterName() {
        return (
          (self.props.cluster as Cluster)?.names?.[0]?.value ||
          (self.props.cluster as Cluster)?.defaultProduct?.names?.[0]?.value ||
          "Cluster"
        );
      },
      getClusterSku() {
        return (
          (self.props.cluster as Cluster)?.sku ||
          (self.props.cluster as Cluster)?.defaultProduct?.sku ||
          ""
        );
      },
      getClusterImageUrl() {
        return (
          (self.props.cluster as Cluster)?.defaultProduct?.media?.images
            ?.items?.[0]?.imageVariants?.[0]?.url || ""
        );
      },
      getClusterPrice() {
        const price = (self.props.cluster as Cluster)?.defaultProduct?.price
          ?.gross;
        if (!price && price !== 0) return "";
        return `\u20AC${Number(price).toFixed(2)}`;
      },
      getClusterUrl() {
        return self.props.configuration.urls.getClusterUrl(self.props.cluster);
      },
      getClusterShortDescription() {
        return (
          (self.props.cluster as Cluster)?.shortDescriptions?.[0]?.value ||
          (self.props.cluster as Cluster)?.defaultProduct
            ?.shortDescriptions?.[0]?.value ||
          ""
        );
      },
      getClusterManufacturer() {
        return (
          (self.props.cluster as Cluster)?.defaultProduct?.manufacturer || ""
        );
      },
      getStockQuantity() {
        const qty = (self.props.cluster as Cluster)?.defaultProduct?.inventory
          ?.totalQuantity;
        return qty !== undefined && qty !== null ? qty : -1;
      },
      getStockStatusLabel() {
        const qty = self.state.getStockQuantity();
        if (qty < 0) return "";
        if (qty === 0) return self.state.getLabel("outOfStock", "Out of stock");
        if (qty <= 5) return self.state.getLabel("lowStock", "Low stock");
        return self.state.getLabel("inStock", "In stock");
      },
      getStockStatusClass() {
        const qty = self.state.getStockQuantity();
        if (qty <= 0) return "text-red-600 bg-red-50";
        if (qty <= 5) return "text-amber-600 bg-amber-50";
        return "text-green-600 bg-green-50";
      },
      getLabel(key: string, fallback: string) {
        return (self.props.labels as Record<string, string>)?.[key] || fallback;
      },
      handleClusterClick(e: any) {
        if (self.props.onClusterClick) {
          e.preventDefault();
          self.props.onClusterClick(self.props.cluster);
        }
      },
      handleToggleFavorite(e: any) {
        e.preventDefault();
        e.stopPropagation();
        self.state.isFavorite = !self.state.isFavorite;
        self.update();
        if (self.props.onToggleFavorite) {
          self.props.onToggleFavorite(
            self.props.cluster,
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
        const attrs =
          (self.props.cluster as Cluster)?.defaultProduct?.attributes?.items ||
          [];
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
        const attrs =
          (self.props.cluster as Cluster)?.defaultProduct?.attributes?.items ||
          [];
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
      "cluster",
      "configuration",
      "labels",
      "onClusterClick",
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
      "showStock",
    ];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'click' event on a-cluster-card-1
    this.onAClusterCard1Click = (e) => {
      this.state.handleClusterClick(e);
    };

    // Event handler for 'click' event on button-cluster-card-1
    this.onButtonClusterCard1Click = (e) => {
      this.state.handleToggleFavorite(e);
    };

    // Event handler for 'click' event on a-cluster-card-2
    this.onAClusterCard2Click = (e) => {
      this.state.handleClusterClick(e);
    };

    // Event handler for 'click' event on a-cluster-card-3
    this.onAClusterCard3Click = (e) => {
      this.state.handleClusterClick(e);
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
      <div data-el="div-cluster-card-1">
        <template data-el="show-cluster-card">
          <div class="relative aspect-square overflow-hidden bg-gray-50 p-4">
            <a class="block h-full w-full" data-el="a-cluster-card-1">
              <template data-el="show-cluster-card-2">
                <img
                  class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  data-el="img-cluster-card-1"
                />
              </template>
              <template data-el="show-cluster-card-3">
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
                      data-el="path-cluster-card-1"
                    ></path>
                  </svg>
                </div>
              </template>
            </a>
            <template data-el="show-cluster-card-4">
              <div
                class="pointer-events-none absolute left-2 top-2 flex flex-col gap-1"
              >
                <template data-el="for-cluster-card">
                  <span
                    class="inline-block rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm"
                  >
                    <template data-el="div-cluster-card-2"><!-- label --></template>
                  </span>
                </template>
              </div>
            </template>
            <template data-el="show-cluster-card-5">
              <button type="button" data-el="button-cluster-card-1">
                <svg
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  class="h-4 w-4"
                  data-el="svg-cluster-card-1"
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
          <template data-el="show-cluster-card-6">
            <div class="font-mono text-xs text-gray-400">
              <template data-el="div-cluster-card-3">
                <!-- state.getClusterSku() -->
              </template>
            </div>
          </template>
          <template data-el="show-cluster-card-7">
            <a
              class="line-clamp-2 text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-violet-600"
              data-el="a-cluster-card-2"
            >
              <template data-el="div-cluster-card-4">
                <!-- state.getClusterName() -->
              </template>
            </a>
          </template>
          <template data-el="show-cluster-card-8">
            <div class="flex flex-col gap-0.5">
              <template data-el="for-cluster-card-2">
                <div class="text-xs text-gray-500">
                  <template data-el="div-cluster-card-5">
                    <!-- item.value -->
                  </template>
                </div>
              </template>
            </div>
          </template>
          <template data-el="show-cluster-card-9">
            <div class="text-xs text-gray-500">
              <template data-el="div-cluster-card-6">
                <!-- state.getClusterManufacturer() -->
              </template>
            </div>
          </template>
          <template data-el="show-cluster-card-10">
            <p class="line-clamp-2 text-xs text-gray-500">
              <template data-el="div-cluster-card-7">
                <!-- state.getClusterShortDescription() -->
              </template>
            </p>
          </template>
          <template data-el="show-cluster-card-11">
            <div class="mt-auto pt-2">
              <span class="text-lg font-bold text-gray-900">
                <template data-el="div-cluster-card-8">
                  <!-- state.getClusterPrice() -->
                </template>
              </span>
            </div>
          </template>
          <template data-el="show-cluster-card-12">
            <div class="flex items-center gap-1.5">
              <span data-el="span-cluster-card-1">
                <template data-el="div-cluster-card-9">
                  <!-- state.getStockStatusLabel() -->
                </template>
              </span>
              <template data-el="show-cluster-card-13">
                <span class="text-xs text-gray-400">
                  (
                  <template data-el="div-cluster-card-10">
                    <!-- state.getStockQuantity() -->
                  </template>
                  )
                </span>
              </template>
            </div>
          </template>
        </div>
        <div class="px-4 pb-4">
          <a
            class="flex w-full items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            data-el="a-cluster-card-3"
          >
            <template data-el="div-cluster-card-11">
              <!-- state.getLabel('viewCluster', 'View cluster') -->
            </template>
          </a>
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
      .querySelectorAll("[data-el='div-cluster-card-1']")
      .forEach((el) => {
        el.className = `group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 ${
          this.props.className || ""
        }`;
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card']")
      .forEach((el) => {
        const whenCondition = this.props.showImage !== false;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='a-cluster-card-1']")
      .forEach((el) => {
        el.setAttribute("href", this.state.getClusterUrl());
        el.removeEventListener("click", this.onAClusterCard1Click);
        el.addEventListener("click", this.onAClusterCard1Click);
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-2']")
      .forEach((el) => {
        const whenCondition = !!this.state.getClusterImageUrl();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='img-cluster-card-1']")
      .forEach((el) => {
        el.setAttribute("src", this.state.getClusterImageUrl());
        el.setAttribute("alt", this.state.getClusterName());
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-3']")
      .forEach((el) => {
        const whenCondition = !this.state.getClusterImageUrl();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='path-cluster-card-1']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 1);
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-4']")
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
      .querySelectorAll("[data-el='for-cluster-card']")
      .forEach((el) => {
        let array = this.state.computedImageLabels();
        this.renderLoop(el, array, "label");
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-2']")
      .forEach((el) => {
        const label = this.getScope(el, "label");
        this.renderTextNode(el, label);
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-5']")
      .forEach((el) => {
        const whenCondition = this.props.enableAddFavorite;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-cluster-card-1']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonClusterCard1Click);
        el.addEventListener("click", this.onButtonClusterCard1Click);
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
      .querySelectorAll("[data-el='svg-cluster-card-1']")
      .forEach((el) => {
        el.setAttribute(
          "fill",
          this.state.isFavorite ? "currentColor" : "none"
        );
        el.setAttribute("strokeWidth", 2);
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-6']")
      .forEach((el) => {
        const whenCondition =
          this.props.showSku !== false && !!this.state.getClusterSku();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-3']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getClusterSku());
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-7']")
      .forEach((el) => {
        const whenCondition = this.props.showName !== false;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='a-cluster-card-2']")
      .forEach((el) => {
        el.setAttribute("href", this.state.getClusterUrl());
        el.removeEventListener("click", this.onAClusterCard2Click);
        el.addEventListener("click", this.onAClusterCard2Click);
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-4']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getClusterName());
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-8']")
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
      .querySelectorAll("[data-el='for-cluster-card-2']")
      .forEach((el) => {
        let array = this.state.computedTextLabels();
        this.renderLoop(el, array, "item");
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-5']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        this.renderTextNode(el, item.value);
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-9']")
      .forEach((el) => {
        const whenCondition =
          this.props.showManufacturer && !!this.state.getClusterManufacturer();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-6']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getClusterManufacturer());
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-10']")
      .forEach((el) => {
        const whenCondition =
          this.props.showShortDescription &&
          !!this.state.getClusterShortDescription();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-7']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getClusterShortDescription());
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-11']")
      .forEach((el) => {
        const whenCondition = !!this.state.getClusterPrice();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-8']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getClusterPrice());
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-12']")
      .forEach((el) => {
        const whenCondition =
          this.props.showStock !== false && this.state.getStockQuantity() >= 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='span-cluster-card-1']")
      .forEach((el) => {
        el.className = `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${this.state.getStockStatusClass()}`;
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-9']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getStockStatusLabel());
      });

    this._root
      .querySelectorAll("[data-el='show-cluster-card-13']")
      .forEach((el) => {
        const whenCondition = this.state.getStockQuantity() > 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-10']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getStockQuantity());
      });

    this._root
      .querySelectorAll("[data-el='a-cluster-card-3']")
      .forEach((el) => {
        el.setAttribute("href", this.state.getClusterUrl());
        el.removeEventListener("click", this.onAClusterCard3Click);
        el.addEventListener("click", this.onAClusterCard3Click);
      });

    this._root
      .querySelectorAll("[data-el='div-cluster-card-11']")
      .forEach((el) => {
        this.renderTextNode(
          el,
          this.state.getLabel("viewCluster", "View cluster")
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

customElements.define("cluster-card", ClusterCard);
