import { ComposableStore } from '../core/ComposableStore';
import { fetchProducts } from './productGridLogic';
import type {
  ProductGridComposableConfig,
  ProductGridState,
  ProductGridQuery,
  ProductGridComposable,
} from './types';

const INITIAL_STATE: ProductGridState = {
  items: [],
  currentPage: 1,
  totalPages: 1,
  itemsFound: 0,
  currentSortField: '',
  currentSortOrder: 'ASC',
  filters: [],
  priceBounds: null,
  category: null,
  productsResponse: null,
  loading: false,
  error: null,
};

/**
 * Creates a product grid composable -- framework-agnostic state + actions for
 * product listing, search, filtering, sorting, and pagination.
 */
export function createProductGridComposable(
  config: ProductGridComposableConfig,
): ProductGridComposable {
  const store = new ComposableStore<ProductGridState>({ ...INITIAL_STATE });
  let fetchId = 0;

  async function doFetch(query: ProductGridQuery) {
    const myFetchId = ++fetchId;
    store.setState({ loading: true, error: null });

    try {
      const state = store.getState();
      const result = await fetchProducts(
        config,
        query,
        state.currentSortField,
        state.currentSortOrder,
      );

      // Discard stale results
      if (myFetchId !== fetchId) return;

      store.setState({
        items: result.items,
        itemsFound: result.itemsFound,
        totalPages: result.totalPages,
        filters: result.filters,
        priceBounds: result.priceBounds,
        category: result.category,
        productsResponse: result.productsResponse,
        currentPage: query.page || 1,
        loading: false,
      });
    } catch (error) {
      if (myFetchId !== fetchId) return;

      const message = error instanceof Error ? error.message : 'Failed to fetch products';
      store.setState({
        items: [],
        loading: false,
        error: message,
      });
    }
  }

  function goToPage(page: number) {
    store.setState({ currentPage: page });
  }

  function setSort(field: string, order: string) {
    store.setState({
      currentSortField: field,
      currentSortOrder: order,
    });
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    fetch: doFetch,
    goToPage,
    setSort,
  };
}
