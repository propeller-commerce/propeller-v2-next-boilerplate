import {
    useStore,
    Show,
    For,
    onMount,
    onUpdate,
} from '@builder.io/mitosis';
import {
    FavoriteListService,
    FavoriteList,
    GraphQLClient,
    Contact,
    Customer,
    UserService,
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
    /** IDs of lists that contain this product/cluster (optimistic local tracking) */
    memberListIds: Set<string>;
    showModal: boolean;
    selectedListId: string;
    addLoading: boolean;
    removeLoading: boolean;
    _isMounted: boolean;

    isFavorited: boolean;
    isProduct: boolean;
    itemId: number;

    refreshUserData: () => Promise<void>;
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
        memberListIds: new Set<string>(),
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

        async refreshUserData() {
            if (!props.graphqlClient) return;
            try {
                const userService = new UserService(props.graphqlClient);
                const viewerData = await userService.getViewer({});
                if (viewerData) {
                    const plain = JSON.parse(JSON.stringify(viewerData, (_k, v) => v));
                    // Strip underscore prefixes from SDK objects
                    const strip = (obj: any): any => {
                        if (obj === null || obj === undefined) return obj;
                        if (Array.isArray(obj)) return obj.map(strip);
                        if (typeof obj === 'object') {
                            const r: any = {};
                            for (const [k, val] of Object.entries(obj)) {
                                r[k.startsWith('_') ? k.slice(1) : k] = strip(val);
                            }
                            return r;
                        }
                        return obj;
                    };
                    localStorage.setItem('user', JSON.stringify(strip(plain)));
                    window.dispatchEvent(new CustomEvent('userLoggedIn'));
                }
            } catch (error) {
                console.error('Error refreshing user data:', error);
            }
        },

        toggleModal() {
            if (!props.user) return;
            if (!state.showModal) {
                const nonMember = state.getNonMemberLists();
                if (nonMember.length > 0 && !state.selectedListId) {
                    state.selectedListId = String(nonMember[0].id);
                }
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
                const input = state.isProduct
                    ? { productIds: [state.itemId] }
                    : { clusterIds: [state.itemId] };
                await service.addFavoriteListItems(state.selectedListId, input);

                const newMemberIds = new Set(state.memberListIds);
                newMemberIds.add(String(state.selectedListId));
                state.memberListIds = newMemberIds;
                state.selectedListId = '';
                state.showModal = false;
                state.refreshUserData();
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
                const input = state.isProduct
                    ? { productIds: [state.itemId] }
                    : { clusterIds: [state.itemId] };
                await service.removeFavoriteListItems(listId, input);

                const newMemberIds = new Set(state.memberListIds);
                newMemberIds.delete(String(listId));
                state.memberListIds = newMemberIds;
                state.selectedListId = '';
                state.showModal = false;
                state.refreshUserData();
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
            const userLists = (props.user as any)?.favoriteLists?.items as FavoriteList[] | undefined;
            return (userLists || []).filter((list: FavoriteList) => state.memberListIds.has(String(list.id)));
        },

        getNonMemberLists(): FavoriteList[] {
            const userLists = (props.user as any)?.favoriteLists?.items as FavoriteList[] | undefined;
            return (userLists || []).filter((list: FavoriteList) => !state.memberListIds.has(String(list.id)));
        },
    });

    onUpdate(() => {
        state._isMounted = true;
    }, []);

    // Derive membership from props.user.favoriteLists.items — no service call needed
    onUpdate(() => {
        if (!props.user || !state.itemId) return;
        const userLists = (props.user as any)?.favoriteLists?.items as FavoriteList[] | undefined;
        const memberIds = new Set<string>();
        (userLists || []).forEach((list: FavoriteList) => {
            const productsRef = list?.products as { items?: { productId?: number; clusterId?: number }[] } | undefined;
            const clustersRef = list?.clusters as { items?: { clusterId?: number }[] } | undefined;
            if (state.isProduct) {
                if (productsRef?.items?.some((item) => item.productId === state.itemId)) {
                    memberIds.add(String(list.id));
                }
            } else {
                const inProducts = productsRef?.items?.some((item) => item.clusterId === state.itemId);
                const inClusters = clustersRef?.items?.some((item) => item.clusterId === state.itemId);
                if (inProducts || inClusters) {
                    memberIds.add(String(list.id));
                }
            }
        });
        state.memberListIds = memberIds;
    }, [props.user, props.productId, props.clusterId]);

    // Listen for user data changes (e.g. after favorite list modifications on other pages)
    onMount(() => {
        const handler = () => {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const freshUser = JSON.parse(storedUser);
                    const userLists = freshUser?.favoriteLists?.items as FavoriteList[] | undefined;
                    const memberIds = new Set<string>();
                    const myItemId = (props.productId || props.clusterId || 0) as number;
                    const myIsProduct = !!props.productId;
                    (userLists || []).forEach((list: FavoriteList) => {
                        const productsRef = list?.products as any;
                        const clustersRef = list?.clusters as any;
                        if (myIsProduct) {
                            if (productsRef?.items?.some((item: any) => item.productId === myItemId)) {
                                memberIds.add(String(list.id));
                            }
                        } else {
                            const inProducts = productsRef?.items?.some((item: any) => item.clusterId === myItemId);
                            const inClusters = clustersRef?.items?.some((item: any) => item.clusterId === myItemId);
                            if (inProducts || inClusters) {
                                memberIds.add(String(list.id));
                            }
                        }
                    });
                    state.memberListIds = memberIds;
                } catch (e) {
                    // ignore parse errors
                }
            }
        };
        window.addEventListener('userLoggedIn', handler);
        return () => {
            window.removeEventListener('userLoggedIn', handler);
        };
    });

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
                            <Show when={state.getMemberLists().length === 0 && state.getNonMemberLists().length === 0}>
                                <div className="py-4 text-center text-gray-500 text-sm">
                                    {state.getLabel('noLists', 'You have no favorite lists. Create one in your account first.')}
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
        </Show>
    );
}
