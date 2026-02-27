// Default sort field keys shown in the dropdown when sortOptions is not provided.

export interface GridToolbarProps {
  /**
   * Sort field keys to show in the sort dropdown.
   * Accepts keys of the ProductSortField enum (e.g. 'NAME', 'PRICE').
   * Defaults to all available sort fields.
   */
  sortOptions?: string[];

  /**
   * Active sort — first element is used.
   * Defaults to [{ field: 'CATEGORY_ORDER', order: 'ASC' }].
   */
  defaultSort?: {
    field: string;
    order: string;
  }[];

  /**
   * Layout mode: 'grid' or 'list'.
   * Controls which icon the view-toggle button shows.
   * Defaults to 'grid'.
   */
  viewMode?: string;

  /**
   * Available page-size options shown in the per-page dropdown.
   * Defaults to [12, 24, 48].
   */
  offset?: number[];

  /**
   * Initially selected page size.
   * Defaults to 12.
   */
  defaultOffset?: number;

  /**
   * Called when the sort field or sort direction changes.
   * Receives the new field key and direction ('ASC'|'DESC').
   */
  onSortChange?: (field: string, order: string) => void;

  /**
   * Called when the user selects a different per-page value.
   * Receives the new page size number.
   */
  onOffsetChange?: (offset: number) => void;

  /**
   * Called when the user clicks the view-mode toggle button.
   * Receives the new mode: 'grid' or 'list'.
   */
  onViewChange?: (mode: string) => void;

  /**
   * Total products found — displayed as a result count on the left side.
   * Pass 0 or undefined to hide the count.
   */
  itemsFound?: number;

  /**
   * Currently active attribute filter selections.
   * Key = attribute name, value = array of selected values.
   * Used to render removable filter badges.
   */
  activeTextFilters?: Record<string, string[]>;

  /**
   * Currently active price filter lower bound.
   * When defined (together with or without priceFilterMax), renders a price badge.
   */
  priceFilterMin?: number;

  /**
   * Currently active price filter upper bound.
   */
  priceFilterMax?: number;

  /**
   * Called when an attribute filter badge × is clicked.
   * Receives the attribute name and the specific value to remove.
   */
  onFilterRemove?: (filterName: string, value: string) => void;

  /**
   * Called when the price filter badge × is clicked.
   */
  onPriceFilterRemove?: () => void;

  /**
   * Called when "Clear All" is clicked.
   */
  onClearFilters?: () => void;

  /**
   * Label overrides. Supply any subset of DEFAULT_LABELS keys plus
   * any of the ProductSortField key strings to customise display text.
   */
  labels?: Record<string, string>;

  /**
   * Portal visibility mode.
   * 'open'        — price sorting is available for all users.
   * 'semi-closed' — price sorting is disabled for unauthenticated users.
   */
  portalMode?: string;

  /**
   * Authenticated user object.
   * When null/undefined in semi-closed mode the PRICE sort option is disabled.
   */
  user?: Contact | Customer | null;

  /** Extra CSS class applied to the root element. */
  className?: string;
}

/** Flat badge item used when rendering the active-filters bar. */
// Default sort field keys shown in the dropdown when sortOptions is not provided.

/** Flat badge item used when rendering the active-filters bar. */
interface FilterBadge {
  key: string;
  value: string;
}
// Default sort field keys shown in the dropdown when sortOptions is not provided.

/** Flat badge item used when rendering the active-filters bar. */

interface GridToolbarState {
  currentSortField: string;
  currentSortOrder: string;
  currentOffset: number;
  currentViewMode: string;
  getLabel: (key: string) => string;
  getSortOptions: () => string[];
  getOffsetOptions: () => number[];
  hasActiveFilters: () => boolean;
  getActiveFilterBadges: () => FilterBadge[];
  isPriceSortDisabled: () => boolean;
  handleSortFieldChange: (field: string) => void;
  handleSortOrderChange: (order: string) => void;
  handleOffsetChange: (offset: number) => void;
  handleViewChange: () => void;
}

import { Contact, Customer, Enums } from "propeller-sdk-v2";
// Default sort field keys shown in the dropdown when sortOptions is not provided.
const ALL_SORT_FIELDS: string[] = [
  Enums.ProductSortField.CATEGORY_ORDER,
  Enums.ProductSortField.NAME,
  Enums.ProductSortField.PRICE,
  Enums.ProductSortField.SKU,
  Enums.ProductSortField.SUPPLIER_CODE,
  Enums.ProductSortField.CREATED_AT,
  Enums.ProductSortField.LAST_MODIFIED_AT,
  Enums.ProductSortField.RELEVANCE,
  Enums.ProductSortField.PRIORITY,
];

// Built-in label defaults (can be overridden via the labels prop).
// Built-in label defaults (can be overridden via the labels prop).
const DEFAULT_LABELS: Record<string, string> = {
  [Enums.ProductSortField.CATEGORY_ORDER]: "Default Sorting",
  [Enums.ProductSortField.NAME]: "Name",
  [Enums.ProductSortField.PRICE]: "Price",
  [Enums.ProductSortField.SKU]: "SKU",
  [Enums.ProductSortField.SUPPLIER_CODE]: "Supplier Code",
  [Enums.ProductSortField.CREATED_AT]: "Created Date",
  [Enums.ProductSortField.LAST_MODIFIED_AT]: "Last Modified Date",
  [Enums.ProductSortField.RELEVANCE]: "Relevance",
  [Enums.ProductSortField.PRIORITY]: "Priority",
  [Enums.SortOrder.ASC]: "Low to High",
  [Enums.SortOrder.DESC]: "High to Low",
  clearAll: "Clear All",
  products: " Products",
  perPage: " per page",
  price: "Price",
  switchToList: "Switch to list view",
  switchToGrid: "Switch to grid view",
};

/**
 * Usage:
 *
 *  <grid-toolbar></grid-toolbar>
 *
 */
class GridToolbar extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      currentSortField: Enums.ProductSortField.CATEGORY_ORDER,
      currentSortOrder: Enums.SortOrder.ASC,
      currentOffset: 12,
      currentViewMode: "grid",
      getLabel(key: string) {
        const labels = (self.props.labels as Record<string, string>) || {};
        return labels[key] !== undefined
          ? labels[key]
          : DEFAULT_LABELS[key] || key;
      },
      getSortOptions() {
        const opts = (self.props.sortOptions as string[]) || [];
        return opts.length > 0 ? opts : ALL_SORT_FIELDS;
      },
      getOffsetOptions() {
        const opts = (self.props.offset as number[]) || [];
        return opts.length > 0 ? opts : [12, 24, 48];
      },
      hasActiveFilters() {
        const text =
          (self.props.activeTextFilters as Record<string, string[]>) || {};
        const hasText = Object.keys(text).some(
          (k) => (text[k] || []).length > 0
        );
        const hasPrice =
          self.props.priceFilterMin !== undefined ||
          self.props.priceFilterMax !== undefined;
        return hasText || hasPrice;
      },
      getActiveFilterBadges() {
        const text =
          (self.props.activeTextFilters as Record<string, string[]>) || {};
        const badges: FilterBadge[] = [];
        Object.entries(text)
          .filter(([, values]) => (values || []).length > 0)
          .forEach(([key, values]) => {
            (values || []).forEach((value: string) => {
              badges.push({
                key,
                value,
              });
            });
          });
        return badges;
      },
      isPriceSortDisabled() {
        return (
          (self.props.portalMode as string) === "semi-closed" &&
          !self.props.user
        );
      },
      handleSortFieldChange(field: string) {
        self.state.currentSortField = field;
        self.update();
        if (self.props.onSortChange)
          self.props.onSortChange(field, self.state.currentSortOrder);
      },
      handleSortOrderChange(order: string) {
        self.state.currentSortOrder = order;
        self.update();
        if (self.props.onSortChange)
          self.props.onSortChange(self.state.currentSortField, order);
      },
      handleOffsetChange(offset: number) {
        self.state.currentOffset = offset;
        self.update();
        if (self.props.onOffsetChange) self.props.onOffsetChange(offset);
      },
      handleViewChange() {
        const next = self.state.currentViewMode === "grid" ? "list" : "grid";
        self.state.currentViewMode = next;
        self.update();
        if (self.props.onViewChange) self.props.onViewChange(next);
      },
    };
    if (!this.props) {
      this.props = {};
    }

    this.componentProps = [
      "defaultSort",
      "defaultOffset",
      "viewMode",
      "labels",
      "sortOptions",
      "offset",
      "activeTextFilters",
      "priceFilterMin",
      "priceFilterMax",
      "portalMode",
      "user",
      "onSortChange",
      "onOffsetChange",
      "onViewChange",
      "className",
      "itemsFound",
      "onClearFilters",
      "onPriceFilterRemove",
      "onFilterRemove",
    ];

    this.updateDeps = [
      [this.props.defaultSort],
      [this.props.defaultOffset],
      [this.props.viewMode],
    ];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'change' event on select-grid-toolbar-1
    this.onSelectGridToolbar1Change = (e) => {
      this.state.handleOffsetChange(
        parseInt((e.target as HTMLSelectElement).value)
      );
    };

    // Event handler for 'change' event on select-grid-toolbar-2
    this.onSelectGridToolbar2Change = (e) => {
      this.state.handleSortFieldChange((e.target as HTMLSelectElement).value);
    };

    // Event handler for 'change' event on select-grid-toolbar-3
    this.onSelectGridToolbar3Change = (e) => {
      this.state.handleSortOrderChange((e.target as HTMLSelectElement).value);
    };

    // Event handler for 'click' event on button-grid-toolbar-1
    this.onButtonGridToolbar1Click = (event) => {
      this.state.handleViewChange();
    };

    // Event handler for 'click' event on button-grid-toolbar-2
    this.onButtonGridToolbar2Click = (event) => {
      if (this.props.onClearFilters) this.props.onClearFilters();
    };

    // Event handler for 'click' event on span-grid-toolbar-1
    this.onSpanGridToolbar1Click = (event) => {
      if (this.props.onPriceFilterRemove) this.props.onPriceFilterRemove();
    };

    // Event handler for 'click' event on span-grid-toolbar-2
    this.onSpanGridToolbar2Click = (event) => {
      const badge = this.getScope(event.currentTarget, "badge");

      if (this.props.onFilterRemove)
        this.props.onFilterRemove(badge.key, badge.value);
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
      <div data-el="div-grid-toolbar-1">
        <div
          class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4"
        >
          <div class="text-sm text-muted-foreground font-medium">
            <template data-el="show-grid-toolbar">
              <span>
                <template data-el="div-grid-toolbar-2">
                  <!-- props.itemsFound as number -->
                </template>
                <template data-el="div-grid-toolbar-3">
                  <!-- state.getLabel('products') -->
                </template>
              </span>
            </template>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <select
              class="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-el="select-grid-toolbar-1"
              data-dom-state="GridToolbar-select-grid-toolbar-1"
            >
              <template data-el="for-grid-toolbar">
                <option data-el="option-grid-toolbar-1">
                  <template data-el="div-grid-toolbar-4"><!-- n --></template>
                  <template data-el="div-grid-toolbar-5">
                    <!-- state.getLabel('perPage') -->
                  </template>
                </option>
              </template>
            </select>
            <div class="h-4 w-px bg-border hidden sm:block"></div>
            <select
              class="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-el="select-grid-toolbar-2"
              data-dom-state="GridToolbar-select-grid-toolbar-2"
            >
              <template data-el="for-grid-toolbar-2">
                <option data-el="option-grid-toolbar-2">
                  <template data-el="div-grid-toolbar-6">
                    <!-- state.getLabel(field) -->
                  </template>
                </option>
              </template>
            </select>
            <select
              class="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-el="select-grid-toolbar-3"
              data-dom-state="GridToolbar-select-grid-toolbar-3"
            >
              <option data-el="option-grid-toolbar-3">
                <template data-el="div-grid-toolbar-7">
                  <!-- state.getLabel('ASC') -->
                </template>
              </option>
              <option data-el="option-grid-toolbar-4">
                <template data-el="div-grid-toolbar-8">
                  <!-- state.getLabel('DESC') -->
                </template>
              </option>
            </select>
            <button
              type="button"
              class="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors"
              data-el="button-grid-toolbar-1"
            >
              <template data-el="show-grid-toolbar-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              </template>
              <template data-el="show-grid-toolbar-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </template>
            </button>
          </div>
        </div>
        <template data-el="show-grid-toolbar-4">
          <div class="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              class="h-7 px-2 text-xs rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              data-el="button-grid-toolbar-2"
            >
              <template data-el="div-grid-toolbar-9">
                <!-- state.getLabel('clearAll') -->
              </template>
            </button>
            <template data-el="show-grid-toolbar-5">
              <span
                class="inline-flex items-center gap-1 cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                data-el="span-grid-toolbar-1"
              >
                <template data-el="div-grid-toolbar-10">
                  <!-- state.getLabel('price') -->
                </template>
                : €
      
                <template data-el="div-grid-toolbar-11">
                  <!-- props.priceFilterMin as number ?? 0 -->
                </template>
                – €
                <template data-el="div-grid-toolbar-12">
                  <!-- props.priceFilterMax as number ?? '∞' -->
                </template>
                <span>×</span>
              </span>
            </template>
      
            <template data-el="for-grid-toolbar-3">
              <span
                class="inline-flex items-center gap-1 cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-semibold border border-input bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                data-el="span-grid-toolbar-2"
              >
                <template data-el="div-grid-toolbar-13">
                  <!-- badge.value -->
                </template>
                <span>×</span>
              </span>
            </template>
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

  onUpdate() {
    const self = this;

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        const sort =
          (self.props.defaultSort as {
            field: string;
            order: string;
          }[]) || [];
        self.state.currentSortField =
          sort.length > 0
            ? sort[0].field || Enums.ProductSortField.CATEGORY_ORDER
            : Enums.ProductSortField.CATEGORY_ORDER;
        self.state.currentSortOrder =
          sort.length > 0
            ? sort[0].order || Enums.SortOrder.ASC
            : Enums.SortOrder.ASC;
        self.updateDeps[0] = __next;
      }
    })(self.updateDeps[0], [self.props.defaultSort]);

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        self.state.currentOffset = (self.props.defaultOffset as number) || 12;
        self.updateDeps[1] = __next;
      }
    })(self.updateDeps[1], [self.props.defaultOffset]);

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        if (self.props.viewMode) {
          self.state.currentViewMode = self.props.viewMode as string;
        }
        self.updateDeps[2] = __next;
      }
    })(self.updateDeps[2], [self.props.viewMode]);
  }

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
      .querySelectorAll("[data-el='div-grid-toolbar-1']")
      .forEach((el) => {
        el.className = `${(this.props.className as string) || ""}`;
      });

    this._root
      .querySelectorAll("[data-el='show-grid-toolbar']")
      .forEach((el) => {
        const whenCondition = (this.props.itemsFound as number) > 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-2']")
      .forEach((el) => {
        this.renderTextNode(el, this.props.itemsFound as number);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-3']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("products"));
      });

    this._root
      .querySelectorAll("[data-el='select-grid-toolbar-1']")
      .forEach((el) => {
        el.value = this.state.currentOffset;
        el.removeEventListener("change", this.onSelectGridToolbar1Change);
        el.addEventListener("change", this.onSelectGridToolbar1Change);
      });

    this._root
      .querySelectorAll("[data-el='for-grid-toolbar']")
      .forEach((el) => {
        let array = this.state.getOffsetOptions();
        this.renderLoop(el, array, "n");
      });

    this._root
      .querySelectorAll("[data-el='option-grid-toolbar-1']")
      .forEach((el) => {
        const n = this.getScope(el, "n");
        el.value = n;
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-4']")
      .forEach((el) => {
        const n = this.getScope(el, "n");
        this.renderTextNode(el, n);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-5']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("perPage"));
      });

    this._root
      .querySelectorAll("[data-el='select-grid-toolbar-2']")
      .forEach((el) => {
        el.value = this.state.currentSortField;
        el.removeEventListener("change", this.onSelectGridToolbar2Change);
        el.addEventListener("change", this.onSelectGridToolbar2Change);
      });

    this._root
      .querySelectorAll("[data-el='for-grid-toolbar-2']")
      .forEach((el) => {
        let array = this.state.getSortOptions();
        this.renderLoop(el, array, "field");
      });

    this._root
      .querySelectorAll("[data-el='option-grid-toolbar-2']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        el.value = field;
        el.setAttribute(
          "disabled",
          field === "PRICE" && this.state.isPriceSortDisabled()
        );
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-6']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        this.renderTextNode(el, this.state.getLabel(field));
      });

    this._root
      .querySelectorAll("[data-el='select-grid-toolbar-3']")
      .forEach((el) => {
        el.value = this.state.currentSortOrder;
        el.removeEventListener("change", this.onSelectGridToolbar3Change);
        el.addEventListener("change", this.onSelectGridToolbar3Change);
      });

    this._root
      .querySelectorAll("[data-el='option-grid-toolbar-3']")
      .forEach((el) => {
        el.value = Enums.SortOrder.ASC;
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-7']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("ASC"));
      });

    this._root
      .querySelectorAll("[data-el='option-grid-toolbar-4']")
      .forEach((el) => {
        el.value = Enums.SortOrder.DESC;
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-8']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("DESC"));
      });

    this._root
      .querySelectorAll("[data-el='button-grid-toolbar-1']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonGridToolbar1Click);
        el.addEventListener("click", this.onButtonGridToolbar1Click);
        el.setAttribute(
          "title",
          this.state.currentViewMode === "grid"
            ? this.state.getLabel("switchToList")
            : this.state.getLabel("switchToGrid")
        );
      });

    this._root
      .querySelectorAll("[data-el='show-grid-toolbar-2']")
      .forEach((el) => {
        const whenCondition = this.state.currentViewMode === "grid";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-grid-toolbar-3']")
      .forEach((el) => {
        const whenCondition = this.state.currentViewMode === "list";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-grid-toolbar-4']")
      .forEach((el) => {
        const whenCondition = this.state.hasActiveFilters();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-grid-toolbar-2']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonGridToolbar2Click);
        el.addEventListener("click", this.onButtonGridToolbar2Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-9']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("clearAll"));
      });

    this._root
      .querySelectorAll("[data-el='show-grid-toolbar-5']")
      .forEach((el) => {
        const whenCondition =
          this.props.priceFilterMin !== undefined ||
          this.props.priceFilterMax !== undefined;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='span-grid-toolbar-1']")
      .forEach((el) => {
        el.removeEventListener("click", this.onSpanGridToolbar1Click);
        el.addEventListener("click", this.onSpanGridToolbar1Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-10']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("price"));
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-11']")
      .forEach((el) => {
        this.renderTextNode(el, (this.props.priceFilterMin as number) ?? 0);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-12']")
      .forEach((el) => {
        this.renderTextNode(el, (this.props.priceFilterMax as number) ?? "∞");
      });

    this._root
      .querySelectorAll("[data-el='for-grid-toolbar-3']")
      .forEach((el) => {
        let array = this.state.getActiveFilterBadges();
        this.renderLoop(el, array, "badge");
      });

    this._root
      .querySelectorAll("[data-el='span-grid-toolbar-2']")
      .forEach((el) => {
        el.removeEventListener("click", this.onSpanGridToolbar2Click);
        el.addEventListener("click", this.onSpanGridToolbar2Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-toolbar-13']")
      .forEach((el) => {
        const badge = this.getScope(el, "badge");
        this.renderTextNode(el, badge.value);
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

customElements.define("grid-toolbar", GridToolbar);
