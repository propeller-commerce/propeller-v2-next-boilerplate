export interface GridFiltersProps {
  /**
   * Attribute filter definitions from the ProductGrid API response.
   * Each entry describes one filterable attribute (e.g. colour, brand, size).
   */
  filters: AttributeFilter[];

  /**
   * Price bounds { min, max } from the current product set.
   * When absent the price section is hidden.
   */
  priceMin?: number;
  priceMax?: number;

  /** Language code. Defaults to 'NL'. */
  language?: string;

  /** Notification called after every filter change. */
  getSelectedFilters?: () => void;

  /**
   * Called on every checkbox toggle.
   * `filter` is the AttributeFilter; `value` is the toggled option string.
   */
  onFilterChange: (filter: AttributeFilter, value: string | number) => void;

  /**
   * Called when the price range changes (on blur / slider release).
   */
  onPriceChange?: (minPrice: number, maxPrice: number) => void;

  /** Called when "Clear all" is clicked. */
  onClearFilters?: () => void;

  /** Enable mobile-specific behaviour (drops sticky positioning). */
  isMobile?: boolean;

  /**
   * 'open' — show price filter for all users.
   * 'semi-closed' — hide price filter for unauthenticated users.
   */
  portalMode?: string;

  /** Authenticated user — price filter visibility depends on this in semi-closed mode. */
  user?: Contact | Customer | null;

  /**
   * Whether filter accordions start collapsed.
   * Defaults to true.
   */
  collapsed?: boolean;

  /** Increment this counter to reset all selected filters and price inputs externally. */
  clearSignal?: number;

  /** Extra CSS class on the root element. */
  className?: string;
}
interface GridFiltersState {
  selectedFilters: Record<string, string[]>;
  currentMin: number;
  currentMax: number;
  expandedFilters: Record<string, boolean>;
  showPriceFilter: () => boolean;
  getFilterName: (filter: AttributeFilter) => string;
  getFilterTitle: (filter: AttributeFilter) => string;
  getFilteredFilters: () => AttributeFilter[];
  getValidOptions: (filter: AttributeFilter) => any[];
  getSelectedCount: () => number;
  hasActiveFilters: () => boolean;
  isSelected: (filterName: string, value: string) => boolean;
  isExpanded: (filterName: string) => boolean;
  toggleAccordion: (filterName: string) => void;
  handleCheckbox: (
    filter: AttributeFilter,
    value: string,
    checked: boolean
  ) => void;
  handleMinChange: (value: number) => void;
  handleMaxChange: (value: number) => void;
  applyPrice: () => void;
  clearAll: () => void;
  getCount: (option: any) => number;
  getMinBound: () => number;
  getMaxBound: () => number;
}

import { Contact, Customer, AttributeFilter } from "propeller-sdk-v2";

/**
 * Usage:
 *
 *  <grid-filters></grid-filters>
 *
 */
class GridFilters extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      selectedFilters: {},
      currentMin: 0,
      currentMax: 9999,
      expandedFilters: {},
      showPriceFilter() {
        const mode = (self.props.portalMode as string) || "open";
        if (mode === "open") return true;
        return !!self.props.user;
      },
      getFilterName(filter: AttributeFilter) {
        return (filter as AttributeFilter)?.attributeDescription?.name || "";
      },
      getFilterTitle(filter: AttributeFilter) {
        return (
          (filter as AttributeFilter)?.attributeDescription?.descriptions?.[0]
            ?.value ||
          (filter as AttributeFilter)?.attributeDescription?.name ||
          ""
        );
      },
      getFilteredFilters() {
        const list = (self.props.filters as AttributeFilter[]) || [];
        return list.filter((f: AttributeFilter) => {
          const opts = (f?.textFilters as any[]) || [];
          return opts.some(
            (o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0
          );
        });
      },
      getValidOptions(filter: AttributeFilter) {
        return (
          ((filter as AttributeFilter)?.textFilters as any[]) || []
        ).filter((o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0);
      },
      getSelectedCount() {
        let n = 0;
        const sel = self.state.selectedFilters as Record<string, string[]>;
        Object.keys(sel).forEach((k: string) => {
          n += (sel[k] || []).length;
        });
        return n;
      },
      hasActiveFilters() {
        const sel = self.state.selectedFilters as Record<string, string[]>;
        return Object.keys(sel).some((k: string) => (sel[k] || []).length > 0);
      },
      isSelected(filterName: string, value: string) {
        return (
          (self.state.selectedFilters as Record<string, string[]>)[
            filterName
          ] || []
        ).includes(value);
      },
      isExpanded(filterName: string) {
        const stored = (self.state.expandedFilters as Record<string, boolean>)[
          filterName
        ];
        if (stored === undefined) return self.props.collapsed === false;
        return !!stored;
      },
      toggleAccordion(filterName: string) {
        const cur = !!(self.state.expandedFilters as Record<string, boolean>)[
          filterName
        ];
        self.state.expandedFilters = {
          ...self.state.expandedFilters,
          [filterName]: !cur,
        };
        self.update();
      },
      handleCheckbox(filter: AttributeFilter, value: string, checked: boolean) {
        const name =
          (filter as AttributeFilter)?.attributeDescription?.name || "";
        const cur =
          (self.state.selectedFilters as Record<string, string[]>)[name] || [];
        const next = checked
          ? [...cur, value]
          : cur.filter((v: string) => v !== value);
        self.state.selectedFilters = {
          ...self.state.selectedFilters,
          [name]: next,
        };
        self.update();
        if (next.length === 0) {
          self.state.expandedFilters = {
            ...self.state.expandedFilters,
            [name]: false,
          };
          self.update();
        }
        self.props.onFilterChange(filter, value);
        if (self.props.getSelectedFilters) self.props.getSelectedFilters();
      },
      handleMinChange(value: number) {
        const n = value > self.state.currentMax ? self.state.currentMax : value;
        self.state.currentMin = n;
        self.update();
      },
      handleMaxChange(value: number) {
        const n = value < self.state.currentMin ? self.state.currentMin : value;
        self.state.currentMax = n;
        self.update();
      },
      applyPrice() {
        if (self.props.onPriceChange)
          self.props.onPriceChange(
            self.state.currentMin,
            self.state.currentMax
          );
        if (self.props.getSelectedFilters) self.props.getSelectedFilters();
      },
      clearAll() {
        self.state.selectedFilters = {};
        self.update();
        self.state.currentMin = (self.props.priceMin as number) || 0;
        self.update();
        self.state.currentMax = (self.props.priceMax as number) || 9999;
        self.update();
        if (self.props.onClearFilters) self.props.onClearFilters();
        if (self.props.getSelectedFilters) self.props.getSelectedFilters();
      },
      getCount(option: any) {
        const c = option?.count || 0;
        const ca = option?.countActive || 0;
        return c === 0 && ca > 0 ? ca : c;
      },
      getMinBound() {
        return (self.props.priceMin as number) || 0;
      },
      getMaxBound() {
        return (self.props.priceMax as number) || 9999;
      },
    };
    if (!this.props) {
      this.props = {};
    }

    this.componentProps = [
      "collapsed",
      "filters",
      "priceMin",
      "priceMax",
      "clearSignal",
      "portalMode",
      "user",
      "onFilterChange",
      "getSelectedFilters",
      "onPriceChange",
      "onClearFilters",
      "isMobile",
      "className",
    ];

    this.updateDeps = [
      [this.props.filters],
      [this.props.priceMin, this.props.priceMax],
      [this.props.clearSignal],
    ];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'change' event on input-grid-filters-1
    this.onInputGridFilters1Change = (e) => {
      this.state.handleMinChange(parseFloat(e.target.value) || 0);
    };

    // Event handler for 'blur' event on input-grid-filters-1
    this.onInputGridFilters1Blur = (event) => {
      this.state.applyPrice();
    };

    // Event handler for 'change' event on input-grid-filters-2
    this.onInputGridFilters2Change = (e) => {
      this.state.handleMaxChange(parseFloat(e.target.value) || 0);
    };

    // Event handler for 'blur' event on input-grid-filters-2
    this.onInputGridFilters2Blur = (event) => {
      this.state.applyPrice();
    };

    // Event handler for 'change' event on input-grid-filters-3
    this.onInputGridFilters3Change = (e) => {
      this.state.handleMinChange(parseFloat(e.target.value));
      this.state.applyPrice();
    };

    // Event handler for 'change' event on input-grid-filters-4
    this.onInputGridFilters4Change = (e) => {
      this.state.handleMaxChange(parseFloat(e.target.value));
      this.state.applyPrice();
    };

    // Event handler for 'click' event on button-grid-filters-1
    this.onButtonGridFilters1Click = (event) => {
      const filter = this.getScope(event.currentTarget, "filter");
      this.state.toggleAccordion(this.state.getFilterName(filter));
    };

    // Event handler for 'change' event on input-grid-filters-5
    this.onInputGridFilters5Change = (e) => {
      const filter = this.getScope(event.currentTarget, "filter");
      const option = this.getScope(event.currentTarget, "option");
      this.state.handleCheckbox(filter, option.value, e.target.checked);
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
      <div data-el="div-grid-filters-1">
        <template data-el="show-grid-filters">
          <div class="space-y-3">
            <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Price Range
            </h3>
            <div class="flex items-center gap-2">
              <div class="relative flex-1">
                <span
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
                >
                  €
                </span>
                <input
                  type="number"
                  class="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                  data-el="input-grid-filters-1"
                  data-dom-state="GridFilters-input-grid-filters-1"
                />
              </div>
              <span class="text-gray-400 text-sm select-none">–</span>
              <div class="relative flex-1">
                <span
                  class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
                >
                  €
                </span>
                <input
                  type="number"
                  class="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                  data-el="input-grid-filters-2"
                  data-dom-state="GridFilters-input-grid-filters-2"
                />
              </div>
            </div>
            <div class="relative h-4 pt-1">
              <input
                type="range"
                class="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:cursor-pointer z-20"
                data-el="input-grid-filters-3"
                data-dom-state="GridFilters-input-grid-filters-3"
              />
              <input
                type="range"
                class="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:cursor-pointer z-20"
                data-el="input-grid-filters-4"
                data-dom-state="GridFilters-input-grid-filters-4"
              />
              <div
                class="absolute top-1.5 left-0 right-0 h-1.5 bg-gray-200 rounded z-10"
              ></div>
            </div>
          </div>
          <div class="h-px bg-gray-100"></div>
        </template>
        <template data-el="show-grid-filters-2">
          <p class="text-sm text-gray-400 italic">No filters available</p>
        </template>
      
        <template data-el="for-grid-filters">
          <div class="border-b border-gray-100 pb-3 last:border-b-0">
            <button
              type="button"
              class="w-full flex items-center justify-between gap-2 text-left py-1 hover:text-violet-600 transition-colors"
              data-el="button-grid-filters-1"
            >
              <span class="text-sm font-semibold text-gray-700 truncate">
                <template data-el="div-grid-filters-2">
                  <!-- state.getFilterTitle(filter) -->
                </template>
              </span>
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                data-el="svg-grid-filters-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                  data-el="path-grid-filters-1"
                ></path>
              </svg>
            </button>
            <template data-el="show-grid-filters-3">
              <div class="pt-2 space-y-1.5">
                <template data-el="for-grid-filters-2">
                  <label class="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      class="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer flex-shrink-0"
                      data-el="input-grid-filters-5"
                      data-dom-state="GridFilters-input-grid-filters-5"
                    />
                    <span
                      class="flex-1 text-sm text-gray-600 leading-none select-none group-hover:text-gray-900"
                    >
                      <template data-el="div-grid-filters-3">
                        <!-- option.value -->
                      </template>
                      <span class="ml-1 text-xs text-gray-400">
                        (
                        <template data-el="div-grid-filters-4">
                          <!-- state.getCount(option) -->
                        </template>
                        )
                      </span>
                    </span>
                  </label>
                </template>
              </div>
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
        const currentExp = self.state.expandedFilters as Record<
          string,
          boolean
        >;
        const open = self.props.collapsed === false;
        const nextExp: Record<string, boolean> = {
          ...currentExp,
        };
        let changed = false;
        ((self.props.filters as AttributeFilter[]) || []).forEach(
          (f: AttributeFilter) => {
            const n = f?.attributeDescription?.name;
            if (n && nextExp[n] === undefined) {
              nextExp[n] = open;
              changed = true;
            }
          }
        );
        const sel = self.state.selectedFilters as Record<string, string[]>;
        Object.keys(nextExp).forEach((k: string) => {
          if (nextExp[k] && !(sel[k] || []).length) {
            nextExp[k] = false;
            changed = true;
          }
        });
        if (changed) self.state.expandedFilters = nextExp;
        self.updateDeps[0] = __next;
      }
    })(self.updateDeps[0], [self.props.filters]);

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        self.state.currentMin = (self.props.priceMin as number) || 0;
        self.state.currentMax = (self.props.priceMax as number) || 9999;
        self.updateDeps[1] = __next;
      }
    })(self.updateDeps[1], [self.props.priceMin, self.props.priceMax]);

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        if (self.props.clearSignal === undefined) return;
        self.state.selectedFilters = {};
        self.state.currentMin = (self.props.priceMin as number) || 0;
        self.state.currentMax = (self.props.priceMax as number) || 9999;
        self.state.expandedFilters = {};
        self.updateDeps[2] = __next;
      }
    })(self.updateDeps[2], [self.props.clearSignal]);
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
      .querySelectorAll("[data-el='div-grid-filters-1']")
      .forEach((el) => {
        el.className = `space-y-4 ${
          (this.props.isMobile as boolean) ? "pb-8" : "sticky top-24"
        } ${(this.props.className as string) || ""}`;
      });

    this._root
      .querySelectorAll("[data-el='show-grid-filters']")
      .forEach((el) => {
        const whenCondition =
          this.state.showPriceFilter() &&
          (this.props.priceMin !== undefined ||
            this.props.priceMax !== undefined);
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='input-grid-filters-1']")
      .forEach((el) => {
        el.value = this.state.currentMin;
        el.setAttribute("min", this.state.getMinBound());
        el.setAttribute("max", this.state.getMaxBound());
        el.removeEventListener("change", this.onInputGridFilters1Change);
        el.addEventListener("change", this.onInputGridFilters1Change);
        el.removeEventListener("blur", this.onInputGridFilters1Blur);
        el.addEventListener("blur", this.onInputGridFilters1Blur);
      });

    this._root
      .querySelectorAll("[data-el='input-grid-filters-2']")
      .forEach((el) => {
        el.value = this.state.currentMax;
        el.setAttribute("min", this.state.getMinBound());
        el.setAttribute("max", this.state.getMaxBound());
        el.removeEventListener("change", this.onInputGridFilters2Change);
        el.addEventListener("change", this.onInputGridFilters2Change);
        el.removeEventListener("blur", this.onInputGridFilters2Blur);
        el.addEventListener("blur", this.onInputGridFilters2Blur);
      });

    this._root
      .querySelectorAll("[data-el='input-grid-filters-3']")
      .forEach((el) => {
        el.setAttribute("min", this.state.getMinBound());
        el.setAttribute("max", this.state.getMaxBound());
        el.value = this.state.currentMin;
        el.removeEventListener("change", this.onInputGridFilters3Change);
        el.addEventListener("change", this.onInputGridFilters3Change);
      });

    this._root
      .querySelectorAll("[data-el='input-grid-filters-4']")
      .forEach((el) => {
        el.setAttribute("min", this.state.getMinBound());
        el.setAttribute("max", this.state.getMaxBound());
        el.value = this.state.currentMax;
        el.removeEventListener("change", this.onInputGridFilters4Change);
        el.addEventListener("change", this.onInputGridFilters4Change);
      });

    this._root
      .querySelectorAll("[data-el='show-grid-filters-2']")
      .forEach((el) => {
        const whenCondition =
          (this.props.filters as AttributeFilter[]).length === 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='for-grid-filters']")
      .forEach((el) => {
        let array = this.state.getFilteredFilters();
        this.renderLoop(el, array, "filter");
      });

    this._root
      .querySelectorAll("[data-el='button-grid-filters-1']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonGridFilters1Click);
        el.addEventListener("click", this.onButtonGridFilters1Click);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-filters-2']")
      .forEach((el) => {
        const filter = this.getScope(el, "filter");
        this.renderTextNode(el, this.state.getFilterTitle(filter));
      });

    this._root
      .querySelectorAll("[data-el='svg-grid-filters-1']")
      .forEach((el) => {
        const filter = this.getScope(el, "filter");
        el.className = `h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
          this.state.isExpanded(this.state.getFilterName(filter))
            ? "rotate-180"
            : ""
        }`;
      });

    this._root
      .querySelectorAll("[data-el='path-grid-filters-1']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 2);
      });

    this._root
      .querySelectorAll("[data-el='show-grid-filters-3']")
      .forEach((el) => {
        const filter = this.getScope(el, "filter");
        const whenCondition = this.state.isExpanded(
          this.state.getFilterName(filter)
        );
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='for-grid-filters-2']")
      .forEach((el) => {
        let array = this.state.getValidOptions(filter);
        this.renderLoop(el, array, "option");
      });

    this._root
      .querySelectorAll("[data-el='input-grid-filters-5']")
      .forEach((el) => {
        const filter = this.getScope(el, "filter");
        const option = this.getScope(el, "option");
        el.setAttribute(
          "checked",
          this.state.isSelected(this.state.getFilterName(filter), option.value)
        );
        el.removeEventListener("change", this.onInputGridFilters5Change);
        el.addEventListener("change", this.onInputGridFilters5Change);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-filters-3']")
      .forEach((el) => {
        const option = this.getScope(el, "option");
        this.renderTextNode(el, option.value);
      });

    this._root
      .querySelectorAll("[data-el='div-grid-filters-4']")
      .forEach((el) => {
        const option = this.getScope(el, "option");
        this.renderTextNode(el, this.state.getCount(option));
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

customElements.define("grid-filters", GridFilters);
