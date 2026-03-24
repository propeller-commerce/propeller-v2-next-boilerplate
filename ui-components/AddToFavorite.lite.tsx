import {
    useStore,
    Show,
    For,
    onUpdate,
} from '@builder.io/mitosis';
import {
    FavoriteListService,
    FavoriteList,
    GraphQLClient,
    Contact,
    Customer,
    FavoriteListsSearchInput,
} from 'propeller-sdk-v2';

export interface AddToFavoriteProps {
    /** The initialized GraphQL Client instance */
    graphqlClient: GraphQLClient;

    /** The authenticated user */
    user: Contact | Customer | null;

    /** Product ID to add/remove from favorites (for products) */
    productId?: number;

    /** Cluster ID to add/remove from favorites (for clusters) */
    clusterId?: number;

    /** Extra CSS class applied to the root button */
    className?: string;

    /** UI string overrides */
    labels?: Record<string, string>;
}

interface AddToFavoriteState {
    lists: FavoriteList[];
    /** IDs of lists that contain this product/cluster */
    memberListIds: Set<number | string>;
    loading: boolean;
    showModal: boolean;
    selectedListId: string;
    addLoading: boolean;
    removeLoading: boolean;
    _isMounted: boolean;

    isFavorited: boolean;
    isProduct: boolean;
    itemId: number;

    checkMembership: () => Promise<void>;
    fetchLists: () => Promise<void>;
    toggleModal: () => void;
    closeModal: () => void;
    handleAddToList: () => Promise<void>;
    handleRemoveFromList: (listId: string) => Promise<void>;
    getLabel: (key: string, fallback: string) => string;
    getMemberLists: () => FavoriteList[];
    getNonMemberLists: () => FavoriteList[];
}

export default function AddToFavorite(props: AddToFavoriteProps) {
    const state = useStore<AddToFavoriteState>({
        lists: [] as FavoriteList[],
        memberListIds: new Set() as Set<number | string>,
        loading: false,
        showModal: false,
        selectedListId: '',
        addLoading: false,
        removeLoading: false,
        _isMounted: false,

        get isFavorited(): boolean {
            return state.memberListIds.size > 0;
        },

        get isProduct(): boolean {
            return !!props.productId;
        },

        get itemId(): number {
            return (props.productId || props.clusterId || 0) as number;
        },

        // Lightweight check — only queries lists containing this item
        async checkMembership() {
            if (!props.user || !props.graphqlClient || !state.itemId) return;
            try {
                const service = new FavoriteListService(props.graphqlClient);
                const isContact = 'contactId' in props.user;
                const memberSearch: FavoriteListsSearchInput = {};
                if (isContact) {
                    memberSearch.contactId = (props.user as Contact).contactId;
                } else {
                    memberSearch.customerId = (props.user as Customer).customerId;
                }
                if (state.isProduct) {
                    memberSearch.productIds = [state.itemId];
                } else {
                    memberSearch.clusterIds = [state.itemId];
                }
                const memberResponse = await service.getFavoriteLists(memberSearch);
                const memberIds = new Set<number | string>();
                (memberResponse.items || []).forEach((list: FavoriteList) => {
                    memberIds.add(list.id);
                });
                state.memberListIds = memberIds;
            } catch (error) {
                console.error('Error checking favorite membership:', error);
            }
        },

        // Full fetch — gets all lists + membership (used when modal opens)
        async fetchLists() {
            if (!props.user || !props.graphqlClient) return;

            state.loading = true;
            try {
                const service = new FavoriteListService(props.graphqlClient);
                const isContact = 'contactId' in props.user;
                const searchInput: FavoriteListsSearchInput = {};

                if (isContact) {
                    searchInput.contactId = (props.user as Contact).contactId;
                } else {
                    searchInput.customerId = (props.user as Customer).customerId;
                }

                const response = await service.getFavoriteLists(searchInput);
                state.lists = response.items || [];

                const memberSearch: FavoriteListsSearchInput = { ...searchInput };
                if (state.isProduct) {
                    memberSearch.productIds = [state.itemId];
                } else {
                    memberSearch.clusterIds = [state.itemId];
                }

                const memberResponse = await service.getFavoriteLists(memberSearch);
                const memberIds = new Set<number | string>();
                (memberResponse.items || []).forEach((list: FavoriteList) => {
                    memberIds.add(list.id);
                });
                state.memberListIds = memberIds;
            } catch (error) {
                console.error('Error fetching favorite lists:', error);
            } finally {
                state.loading = false;
            }
        },

        toggleModal() {
            if (!props.user) return;
            if (!state.showModal) {
                state.fetchLists();
            }
            state.showModal = !state.showModal;
        },

        closeModal() {
            state.showModal = false;
        },

        async handleAddToList() {
            if (!state.selectedListId || !props.graphqlClient || state.addLoading) return;

            state.addLoading = true;
            try {
                const service = new FavoriteListService(props.graphqlClient);
                const fetchParams = {
                    imageSearchFilters: { page: 1, offset: 100 },
                    imageVariantFilters: { transformations: [{ name: 'thumb', transformation: { format: 'WEBP', height: 100, width: 100, fit: 'BOUNDS' } }] },
                };
                const list = await service.getFavoriteList({ id: state.selectedListId, ...fetchParams });

                const productIds: number[] = [];
                const clusterIds: number[] = [];
                const productsRef = list?.products as { items?: { productId?: number }[] } | undefined;
                if (productsRef?.items) {
                    productsRef.items.forEach((item) => { if (item.productId) productIds.push(item.productId); });
                }
                const clustersRef = list?.clusters as { items?: { clusterId?: number }[] } | undefined;
                if (clustersRef?.items) {
                    clustersRef.items.forEach((item) => { if (item.clusterId) clusterIds.push(item.clusterId); });
                }

                if (state.isProduct && !productIds.includes(state.itemId)) {
                    productIds.push(state.itemId);
                } else if (!state.isProduct && !clusterIds.includes(state.itemId)) {
                    clusterIds.push(state.itemId);
                }

                await service.updateFavoriteList(state.selectedListId, {
                    name: list.name, isDefault: list.isDefault, productIds, clusterIds,
                });

                const newMemberIds = new Set(state.memberListIds);
                newMemberIds.add(Number(state.selectedListId) || state.selectedListId);
                state.memberListIds = newMemberIds;
                state.selectedListId = '';
                state.showModal = false;
            } catch (error) {
                console.error('Error adding to favorite list:', error);
            } finally {
                state.addLoading = false;
            }
        },

        async handleRemoveFromList(listId: string) {
            if (!props.graphqlClient || state.removeLoading) return;

            state.removeLoading = true;
            try {
                const service = new FavoriteListService(props.graphqlClient);
                const fetchParams = {
                    imageSearchFilters: { page: 1, offset: 100 },
                    imageVariantFilters: { transformations: [{ name: 'thumb', transformation: { format: 'WEBP', height: 100, width: 100, fit: 'BOUNDS' } }] },
                };
                const list = await service.getFavoriteList({ id: listId, ...fetchParams });

                const productIds: number[] = [];
                const clusterIds: number[] = [];
                const productsRef = list?.products as { items?: { productId?: number }[] } | undefined;
                if (productsRef?.items) {
                    productsRef.items.forEach((item) => { if (item.productId) productIds.push(item.productId); });
                }
                const clustersRef = list?.clusters as { items?: { clusterId?: number }[] } | undefined;
                if (clustersRef?.items) {
                    clustersRef.items.forEach((item) => { if (item.clusterId) clusterIds.push(item.clusterId); });
                }

                await service.updateFavoriteList(listId, {
                    name: list.name,
                    isDefault: list.isDefault,
                    productIds: state.isProduct ? productIds.filter((id: number) => id !== state.itemId) : productIds,
                    clusterIds: !state.isProduct ? clusterIds.filter((id: number) => id !== state.itemId) : clusterIds,
                });

                const newMemberIds = new Set(state.memberListIds);
                newMemberIds.delete(Number(listId) || listId);
                state.memberListIds = newMemberIds;
                state.showModal = false;
            } catch (error) {
                console.error('Error removing from favorite list:', error);
            } finally {
                state.removeLoading = false;
            }
        },

        getLabel(key: string, fallback: string): string {
            const labels = props.labels as Record<string, string> | undefined;
            return labels?.[key] || fallback;
        },

        getMemberLists(): FavoriteList[] {
            return state.lists.filter((list: FavoriteList) => state.memberListIds.has(list.id));
        },

        getNonMemberLists(): FavoriteList[] {
            return state.lists.filter((list: FavoriteList) => !state.memberListIds.has(list.id));
        },
    });

    onUpdate(() => {
        state._isMounted = true;
    }, []);

    // Check membership on page load so heart is filled if item is already favorited
    onUpdate(() => {
        if (props.user) {
            state.checkMembership();
        }
    }, [props.user]);

    return (
        <Show when={props.user}>
        <div className="relative inline-block">
            {/* Heart button */}
            <button
                type="button"
                onClick={() => state.toggleModal()}
                className={`inline-flex items-center justify-center rounded-md border p-2.5 transition-colors ${
                    state.isFavorited
                        ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                        : 'border-gray-200 bg-white text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5'
                } ${props.className || ''}`}
                title={state.isFavorited ? state.getLabel('removeFromFavorites', 'Remove from favorites') : state.getLabel('addToFavorites', 'Add to favorites')}
            >
                <Show when={state.isFavorited}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                </Show>
                <Show when={!state.isFavorited}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                </Show>
            </button>

            {/* Modal */}
            <Show when={state.showModal && state._isMounted}>
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full shadow-lg border">
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 pb-4">
                            <h3 className="text-xl font-bold">
                                {state.getLabel('modalTitle', 'Favorite product?')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => state.closeModal()}
                                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="px-6 pb-6 space-y-4">
                            {/* Loading state */}
                            <Show when={state.loading}>
                                <div className="py-4 text-center text-gray-500">
                                    {state.getLabel('loading', 'Loading lists...')}
                                </div>
                            </Show>

                            <Show when={!state.loading}>
                                {/* Lists where item IS a member — clickable to remove */}
                                <Show when={state.getMemberLists().length > 0}>
                                    <div className="space-y-2">
                                        <For each={state.getMemberLists()}>
                                            {(list: FavoriteList) => (
                                                <button
                                                    key={list.id}
                                                    type="button"
                                                    onClick={() => state.handleRemoveFromList(String(list.id))}
                                                    disabled={state.removeLoading}
                                                    className="flex items-center gap-2 py-2 w-full text-left hover:bg-gray-50 rounded-md px-1 transition-colors disabled:opacity-50"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
                                                        <rect width="18" height="18" x="3" y="3" rx="2" />
                                                        <path d="m9 12 2 2 4-4" />
                                                    </svg>
                                                    <span className="text-sm font-medium">{list.name}</span>
                                                </button>
                                            )}
                                        </For>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const memberLists = state.getMemberLists();
                                                if (memberLists.length > 0) {
                                                    state.handleRemoveFromList(String(memberLists[0].id));
                                                }
                                            }}
                                            disabled={state.removeLoading}
                                            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {state.removeLoading
                                                ? state.getLabel('removing', 'Removing...')
                                                : state.getLabel('removeFromFavorites', 'Remove from favorites')}
                                        </button>
                                    </div>
                                    <div className="border-t border-gray-200" />
                                </Show>

                                {/* Dropdown to select a list + add button */}
                                <Show when={state.getNonMemberLists().length > 0}>
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">
                                                {state.getLabel('chooseList', 'Choose a favorites list*')}
                                            </label>
                                            <select
                                                value={state.selectedListId}
                                                onChange={(e) => { state.selectedListId = e.target.value; }}
                                                className="block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-primary"
                                            >
                                                <For each={state.getNonMemberLists()}>
                                                    {(list: FavoriteList) => (
                                                        <option key={list.id} value={String(list.id)}>
                                                            {list.name}
                                                        </option>
                                                    )}
                                                </For>
                                            </select>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => state.handleAddToList()}
                                            disabled={!state.selectedListId || state.addLoading}
                                            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-md transition-colors disabled:opacity-50"
                                        >
                                            {state.addLoading
                                                ? state.getLabel('adding', 'Adding...')
                                                : state.getLabel('addToFavorites', 'Add to favorites')}
                                        </button>
                                    </div>
                                </Show>

                                {/* No lists at all */}
                                <Show when={state.lists.length === 0}>
                                    <div className="py-4 text-center text-gray-500 text-sm">
                                        {state.getLabel('noLists', 'You have no favorite lists. Create one in your account first.')}
                                    </div>
                                </Show>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
        </Show>
    );
}
