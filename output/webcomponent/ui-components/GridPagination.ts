// Built-in label defaults (can be overridden via the labels prop).

export interface GridPaginationProps {
  /**
   * A ProductsResponse object for populating the pagination component.
   * Reads `page` (current page), `pages` (total pages) from the response.
   */
  products: ProductsResponse;

  /**
   * Called when the user navigates to a different page.
   * Receives the newly selected page number (1-based).
   */
  onPageChange: (page: number) => void;

  /**
   * Pagination display variant.
   * 'compact' — Previous / "Page X of Y" / Next.
   * 'full'    — numbered page buttons with ellipsis collapsing + Previous / Next.
   * Defaults to 'compact'.
   */
  variant?: string;

  /**
   * Number of visible page buttons rendered around the current page in 'full' style.
   * Defaults to 5.
   */
  siblingCount?: number;

  /**
   * Label overrides for the text inside the component.
   * Supported keys: previous, next, page, of
   */
  labels?: Record<string, string>;

  /** Extra CSS class applied to the root element. */
  className?: string;
}

/** Single item in the computed full-style page list. */
// Built-in label defaults (can be overridden via the labels prop).

/** Single item in the computed full-style page list. */
interface PageItem {
  /** 'page' renders a numbered button; 'dots' renders an ellipsis spacer. */
  type: string;
  /** Page number for 'page' items; negative unique sentinel for 'dots' items. */
  value: number;
}
// Built-in label defaults (can be overridden via the labels prop).

/** Single item in the computed full-style page list. */

interface GridPaginationState {
  getLabel: (key: string) => string;
  getTotalPages: () => number;
  getCurrentPage: () => number;
  showPagination: () => boolean;
  getFullPages: () => PageItem[];
  handlePageChange: (page: number) => void;
}

import { ProductsResponse } from "propeller-sdk-v2";
// Built-in label defaults (can be overridden via the labels prop).
const DEFAULT_LABELS: Record<string, string> = {
  previous: "Previous",
  next: "Next",
  page: "Page",
  of: "of",
};

/**
 * Usage:
 *
 *  <grid-pagination></grid-pagination>
 *
 */
class GridPagination extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      getLabel(key: string) {
        const labels = (self.props.labels as Record<string, string>) || {};
        return labels[key] !== undefined
          ? labels[key]
          : DEFAULT_LABELS[key] || key;
      },
      getTotalPages() {
        return (self.props.products as ProductsResponse)?.pages || 1;
      },
      getCurrentPage() {
        return (self.props.products as ProductsResponse)?.page || 1;
      },
      showPagination() {
        return self.state.getTotalPages() > 1;
      },
      getFullPages() {
        const total = self.state.getTotalPages();
        const current = self.state.getCurrentPage();
        const sibling = (self.props.siblingCount as number) || 5;

        // All pages fit without collapsing — show them all.
        if (total <= sibling + 4) {
          const items: PageItem[] = [];
          for (let i = 1; i <= total; i++)
            items.push({
              type: "page",
              value: i,
            });
          return items;
        }

        // Compute sibling window, always staying inside [2, total-1].
        const halfSib = Math.floor(sibling / 2);
        let rangeStart = Math.max(2, current - halfSib);
        let rangeEnd = Math.min(total - 1, current + halfSib);

        // Stretch the range to ensure exactly siblingCount slots when near an edge.
        if (rangeEnd - rangeStart + 1 < sibling) {
          if (rangeStart === 2) {
            rangeEnd = Math.min(total - 1, rangeStart + sibling - 1);
          } else {
            rangeStart = Math.max(2, rangeEnd - sibling + 1);
          }
        }
        const items: PageItem[] = [];

        // First page
        items.push({
          type: "page",
          value: 1,
        });

        // Left ellipsis (value -1 is a unique sentinel)
        if (rangeStart > 2)
          items.push({
            type: "dots",
            value: -1,
          });

        // Sibling window
        for (let i = rangeStart; i <= rangeEnd; i++) {
          items.push({
            type: "page",
            value: i,
          });
        }

        // Right ellipsis (value -2 is a unique sentinel)
        if (rangeEnd < total - 1)
          items.push({
            type: "dots",
            value: -2,
          });

        // Last page
        items.push({
          type: "page",
          value: total,
        });
        return items;
      },
      handlePageChange(page: number) {
        if (self.props.onPageChange) self.props.onPageChange(page);
      },
    };
    if (!this.props) {
      this.props = {};
    }

    this.componentProps = [
      "labels",
      "products",
      "siblingCount",
      "onPageChange",
      "className",
      "variant",
    ];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'click' event on button-grid-pagination-1
    this.onButtonGridPagination1Click = (event) => {
      this.state.handlePageChange(this.state.getCurrentPage() - 1);
    };

    // Event handler for 'click' event on button-grid-pagination-2
    this.onButtonGridPagination2Click = (event) => {
      this.state.handlePageChange(this.state.getCurrentPage() + 1);
    };

    // Event handler for 'click' event on button-grid-pagination-3
    this.onButtonGridPagination3Click = (event) => {
      this.state.handlePageChange(this.state.getCurrentPage() - 1);
    };

    // Event handler for 'click' event on button-grid-pagination-4
    this.onButtonGridPagination4Click = (event) => {
      const item = this.getScope(event.currentTarget, "item");
      this.state.handlePageChange(item.value);
    };

    // Event handler for 'click' event on button-grid-pagination-5
    this.onButtonGridPagination5Click = (event) => {
      this.state.handlePageChange(this.state.getCurrentPage() + 1);
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
      <div data-el="div-grid-pagination-1">
        <template data-el="show-grid-pagination">
          <template data-el="show-grid-pagination-2">
            <div class="flex justify-center items-center gap-2">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                data-el="button-grid-pagination-1"
              >
                <template data-el="div-grid-pagination-2">
                  <!-- state.getLabel('previous') -->
                </template>
              </button>
              <span class="px-2 text-sm font-medium text-gray-700">
                <template data-el="div-grid-pagination-3">
                  <!-- state.getLabel('page') -->
                </template>
                &nbsp;
                <template data-el="div-grid-pagination-4">
                  <!-- state.getCurrentPage() -->
                </template>
                &nbsp;
                <template data-el="div-grid-pagination-5">
                  <!-- state.getLabel('of') -->
                </template>
                &nbsp;
                <template data-el="div-grid-pagination-6">
                  <!-- state.getTotalPages() -->
                </template>
              </span>
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                data-el="button-grid-pagination-2"
              >
                <template data-el="div-grid-pagination-7">
                  <!-- state.getLabel('next') -->
                </template>
              </button>
            </div>
          </template>
          <template data-el="show-grid-pagination-3">
            <div class="flex justify-center items-center gap-1 flex-wrap">
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                data-el="button-grid-pagination-3"
              >
                <template data-el="div-grid-pagination-8">
                  <!-- state.getLabel('previous') -->
                </template>
              </button>
      
              <template data-el="for-grid-pagination">
                <div class="inline-flex">
                  <template data-el="show-grid-pagination-4">
                    <span
                      class="inline-flex items-center justify-center min-w-[2rem] px-1 py-2 text-sm text-gray-500 select-none"
                    >
                      ...
                    </span>
                  </template>
                  <template data-el="show-grid-pagination-5">
                    <button type="button" data-el="button-grid-pagination-4">
                      <template data-el="div-grid-pagination-9">
                        <!-- item.value -->
                      </template>
                    </button>
                  </template>
                </div>
              </template>
              <button
                type="button"
                class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                data-el="button-grid-pagination-5"
              >
                <template data-el="div-grid-pagination-10">
                  <!-- state.getLabel('next') -->
                </template>
              </button>
            </div>
          </template>
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
    // re-rendering needs to ensure that all nodes generated by for/show are refreshed
    this.destroyAnyNodes();
    this.updateBindings();
  }

  updateBindings() {
    this._root
      .querySelectorAll("[data-el='div-grid-pagination-1']")
      .forEach((el) => {
        el.className = `${(this.props.className as string) || ""}`;
      });

    this._root
      .querySelectorAll("[data-el='show-grid-pagination']")
      .forEach((el) => {
        const whenCondition = this.state.showPagination();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-grid-pagination-2']")
      .forEach((el) => {
        const whenCondition =
          ((this.props.variant as string) || "compact") === "compact";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-grid-pagination-1']")
      .forEach((el) => {
        el.setAttribute("disabled", this.state.getCurrentPage() === 1);
        el.removeEventListener("click", this.onButtonGridPagination1Click);
        el.addEventListener("click", this.onButtonGridPagination1Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-2']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("previous"));
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-3']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("page"));
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-4']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getCurrentPage());
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-5']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("of"));
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-6']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getTotalPages());
      });

    this._root
      .querySelectorAll("[data-el='button-grid-pagination-2']")
      .forEach((el) => {
        el.setAttribute(
          "disabled",
          this.state.getCurrentPage() === this.state.getTotalPages()
        );
        el.removeEventListener("click", this.onButtonGridPagination2Click);
        el.addEventListener("click", this.onButtonGridPagination2Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-7']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("next"));
      });

    this._root
      .querySelectorAll("[data-el='show-grid-pagination-3']")
      .forEach((el) => {
        const whenCondition =
          ((this.props.variant as string) || "compact") === "full";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-grid-pagination-3']")
      .forEach((el) => {
        el.setAttribute("disabled", this.state.getCurrentPage() === 1);
        el.removeEventListener("click", this.onButtonGridPagination3Click);
        el.addEventListener("click", this.onButtonGridPagination3Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-8']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("previous"));
      });

    this._root
      .querySelectorAll("[data-el='for-grid-pagination']")
      .forEach((el) => {
        let array = this.state.getFullPages();
        this.renderLoop(el, array, "item");
      });

    this._root
      .querySelectorAll("[data-el='show-grid-pagination-4']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        const whenCondition = item.type === "dots";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-grid-pagination-5']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        const whenCondition = item.type === "page";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-grid-pagination-4']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonGridPagination4Click);
        el.addEventListener("click", this.onButtonGridPagination4Click);
        const item = this.getScope(el, "item");
        el.className =
          item.value === this.state.getCurrentPage()
            ? "inline-flex items-center justify-center min-w-[2.25rem] rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
            : "inline-flex items-center justify-center min-w-[2.25rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50";
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-9']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        this.renderTextNode(el, item.value);
      });

    this._root
      .querySelectorAll("[data-el='button-grid-pagination-5']")
      .forEach((el) => {
        el.setAttribute(
          "disabled",
          this.state.getCurrentPage() === this.state.getTotalPages()
        );
        el.removeEventListener("click", this.onButtonGridPagination5Click);
        el.addEventListener("click", this.onButtonGridPagination5Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-pagination-10']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("next"));
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

customElements.define("grid-pagination", GridPagination);
