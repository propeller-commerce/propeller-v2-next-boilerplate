import {
    useStore,
    onMount,
    onUpdate,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    FavoriteListService,
    FavoriteList,
    GraphQLClient,
    Contact,
    Customer,
} from 'propeller-sdk-v2';

export interface FavoriteListFormData {
    name: string;
    isDefault: boolean;
}

export interface FavoriteListsProps {
    /** The authenticated user (Contact or Customer) */
    user: Contact | Customer | null;

    /** The initialized GraphQL Client instance */
    graphqlClient: GraphQLClient;

    /** Callback when a list is clicked (navigate to detail) */
    onListClick?: (listId: string | number) => void;

    /** Limit the number of lists shown (e.g. 3 = last 3 modified). undefined = show all */
    limit?: number;

    /** Displays the "Default" badge on the favorite list (default: true) */
    showDefaultIndicator?: boolean;

    /** Displays the last modified date on the favorite list (default: true) */
    showLastModified?: boolean;

    /** Displays number of products and clusters contained in the favorite list (default: true) */
    showItemsCount?: boolean;

    /** Displays edit/delete action buttons on each list (default: true) */
    showActions?: boolean;

    /** Displays create new favorite list button (default: true) */
    allowFavoriteListCreate?: boolean;

    /** Custom class name */
    className?: string;

    /** Format date function override. If not provided, dates are formatted as dd/mm/YYYY */
    formatDate?: (dateString: string) => string;

    /** Localization labels */
    labels?: {
        lastModified?: string;
        items?: string;
        products?: string;
        clusters?: string;
        defaultBadge?: string;
        editSave?: string;
        editCancel?: string;
        makeDefault?: string;
        deleteTitle?: string;
        deleteConfirm?: string;
        deleteWarning?: string;
        deleteButton?: string;
        cancelButton?: string;
        createTitle?: string;
        createButton?: string;
        createPlaceholder?: string;
        setAsDefault?: string;
        saveButton?: string;
        noLists?: string;
        noListsDescription?: string;
        createFirstList?: string;
        loading?: string;
    };

    /** Action function triggered when creating a new favorite list. If not provided, the default action is executed */
    onCreate?: (favoriteListData: FavoriteListFormData) => void;

    /** Action function triggered when editing a favorite list. If not provided, the default action is executed */
    onEdit?: (favoriteListId: string, favoriteListData: FavoriteListFormData) => void;

    /** Action function triggered when deleting a favorite list. If not provided, the default action is executed */
    onDelete?: (favoriteListId: string) => void;

    /** Called after any list mutation (create, edit, delete) succeeds */
    onListChanged?: () => void;
}

interface FavoriteListsState {
    lists: FavoriteList[];
    loading: boolean;
    editingListId: string | null;
    editListName: string;
    editSetAsDefault: boolean;
    showDeleteModal: boolean;
    listToDelete: FavoriteList | null;
    showCreateModal: boolean;
    newListName: string;
    newSetAsDefault: boolean;
    isMounted: boolean;
    saving: boolean;
    fetchLists: () => void;
    handleEditList: (list: FavoriteList) => void;
    handleCancelEdit: () => void;
    handleUpdateList: (listId: string) => Promise<void>;
    handleDeleteList: (list: FavoriteList) => void;
    handleConfirmDelete: () => Promise<void>;
    handleCancelDelete: () => void;
    closeCreateModal: () => void;
    handleCreateList: () => Promise<void>;
    formatDate: (dateString: string) => string;
    getTotalCount: (list: FavoriteList) => number;
    getProductCount: (list: FavoriteList) => number;
    getClusterCount: (list: FavoriteList) => number;
    getLabel: (key: string, fallback: string) => string;
    displayedLists: FavoriteList[];
}

export default function FavoriteLists(props: FavoriteListsProps) {
    const state = useStore<FavoriteListsState>({
        lists: [] as FavoriteList[],
        loading: false,
        editingListId: null,
        editListName: '',
        editSetAsDefault: false,
        showDeleteModal: false,
        listToDelete: null as FavoriteList | null,
        showCreateModal: false,
        newListName: '',
        newSetAsDefault: false,
        isMounted: false,
        saving: false,

        fetchLists() {
            state.lists = (props.user as any)?.favoriteLists?.items || [];
        },

        handleEditList(list: FavoriteList) {
            state.editingListId = String(list.id);
            state.editListName = list.name;
            state.editSetAsDefault = list.isDefault || false;
        },

        handleCancelEdit() {
            state.editingListId = null;
            state.editListName = '';
            state.editSetAsDefault = false;
        },

        async handleUpdateList(listId: string) {
            if (!state.editListName.trim() || state.saving) return;

            const formData = { name: state.editListName, isDefault: state.editSetAsDefault };

            // If onEdit callback is provided, delegate to parent
            if (props.onEdit) {
                props.onEdit(listId, formData);
                state.handleCancelEdit();
                return;
            }

            if (!props.graphqlClient || state.saving) return;
            state.saving = true;

            try {
                const service = new FavoriteListService(props.graphqlClient);

                // If setting as default, first unset the current default
                if (formData.isDefault) {
                    const currentDefault = state.lists.find((l: FavoriteList) => l.isDefault && String(l.id) !== listId);
                    if (currentDefault) {
                        await service.updateFavoriteList(String(currentDefault.id), {
                            name: currentDefault.name,
                            isDefault: false,
                        });
                    }
                }

                await service.updateFavoriteList(listId, {
                    name: formData.name,
                    isDefault: formData.isDefault,
                });

                // Optimistic update — clear default from others when setting a new default
                state.lists = state.lists.map((l: FavoriteList) => {
                    if (String(l.id) === listId) {
                        return { ...l, name: formData.name, isDefault: formData.isDefault } as FavoriteList;
                    }
                    if (formData.isDefault && l.isDefault) {
                        return { ...l, isDefault: false } as FavoriteList;
                    }
                    return l;
                });

                state.handleCancelEdit();
                if (props.onListChanged) props.onListChanged();
            } catch (error) {
                console.error('Error updating favorite list:', error);
                state.fetchLists();
            } finally {
                state.saving = false;
            }
        },

        handleDeleteList(list: FavoriteList) {
            state.listToDelete = list;
            state.showDeleteModal = true;
        },

        async handleConfirmDelete() {
            if (!state.listToDelete) return;

            const deletedId = String(state.listToDelete.id);

            // If onDelete callback is provided, delegate to parent
            if (props.onDelete) {
                props.onDelete(deletedId);
                state.showDeleteModal = false;
                state.listToDelete = null;
                return;
            }

            if (!props.graphqlClient) return;

            try {
                const service = new FavoriteListService(props.graphqlClient);
                await service.deleteFavoriteList(deletedId);

                // Optimistic update
                state.lists = state.lists.filter(
                    (l: FavoriteList) => String(l.id) !== deletedId
                );

                state.showDeleteModal = false;
                state.listToDelete = null;
                if (props.onListChanged) props.onListChanged();
            } catch (error) {
                console.error('Error deleting favorite list:', error);
                state.fetchLists();
            }
        },

        handleCancelDelete() {
            state.showDeleteModal = false;
            state.listToDelete = null;
        },

        closeCreateModal() {
            state.showCreateModal = false;
        },

        async handleCreateList() {
            if (!state.newListName.trim() || state.saving) return;
            state.saving = true;

            const formData = { name: state.newListName, isDefault: state.newSetAsDefault };

            // If onCreate callback is provided, delegate to parent
            if (props.onCreate) {
                props.onCreate(formData);
                state.newListName = '';
                state.newSetAsDefault = false;
                state.closeCreateModal();
                return;
            }

            if (!props.graphqlClient || !props.user) return;

            try {
                const service = new FavoriteListService(props.graphqlClient);

                // If setting as default, first unset the current default
                if (formData.isDefault) {
                    const currentDefault = state.lists.find((l: FavoriteList) => l.isDefault);
                    if (currentDefault) {
                        await service.updateFavoriteList(String(currentDefault.id), {
                            name: currentDefault.name,
                            isDefault: false,
                        });
                    }
                }

                const isContact = 'contactId' in props.user;
                const contactId = isContact ? (props.user as Contact).contactId : undefined;
                const customerId = !isContact ? (props.user as Customer).customerId : undefined;
                await service.createFavoriteList({
                    name: formData.name,
                    isDefault: formData.isDefault,
                    contactId: contactId,
                    customerId: customerId,
                } as Parameters<FavoriteListService['createFavoriteList']>[0]);

                state.newListName = '';
                state.newSetAsDefault = false;
                state.closeCreateModal();

                // Refetch to get the complete list
                state.fetchLists();
                if (props.onListChanged) props.onListChanged();
            } catch (error) {
                console.error('Error creating favorite list:', error);
            } finally {
                state.saving = false;
            }
        },

        formatDate(dateString: string): string {
            if (props.formatDate) return props.formatDate(dateString);
            if (!dateString) return '-';
            const d = new Date(dateString);
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}/${month}/${year}`;
        },

        getProductCount(list: FavoriteList): number {
            const products = list.products;
            if (!products) return 0;
            if (products.itemsFound !== undefined) return products.itemsFound;
            if (products.items) return products.items.length;
            return 0;
        },

        getClusterCount(list: FavoriteList): number {
            const clusters = list.clusters;
            if (!clusters) return 0;
            if (clusters.itemsFound !== undefined) return clusters.itemsFound;
            if (clusters.items) return clusters.items.length;
            return 0;
        },

        getTotalCount(list: FavoriteList): number {
            return state.getProductCount(list) + state.getClusterCount(list);
        },

        getLabel(key: string, fallback: string): string {
            const labels = props.labels as Record<string, string> | undefined;
            return labels?.[key] || fallback;
        },

        get displayedLists(): FavoriteList[] {
            if (props.limit && props.limit > 0) {
                // Sort by updatedAt descending, then take the first N
                const sorted = [...state.lists].sort((a: FavoriteList, b: FavoriteList) => {
                    const dateA = new Date(a.updatedAt || '').getTime();
                    const dateB = new Date(b.updatedAt || '').getTime();
                    return dateB - dateA;
                });
                return sorted.slice(0, props.limit);
            }
            return state.lists;
        },
    });

    onMount(() => {
        state.isMounted = true;
    });

    // Fires on mount + when user changes — single fetch point, no double-fetch
    onUpdate(() => {
        if (props.user) {
            state.fetchLists();
        }
    }, [props.user]);

    return (
        <div className={props.className}>
            <Show when={props.allowFavoriteListCreate !== false && !state.loading && state.isMounted && state.displayedLists.length > 0}>
                <div className="flex justify-end mb-4">
                    <button
                        onClick={() => { state.showCreateModal = true; }}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                        {state.getLabel('createButton', 'Create New List')}
                    </button>
                </div>
            </Show>

            <Show when={state.loading}>
                <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                                <div className="h-6 w-1/3 bg-gray-200 rounded"></div>
                                <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2 flex-1">
                                <div className="h-6 w-1/3 bg-gray-200 rounded"></div>
                                <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
                                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            <Show when={!state.loading && state.isMounted}>
                <Show when={state.displayedLists.length > 0}>
                    <div className="space-y-4">
                        <For each={state.displayedLists}>
                            {(list: FavoriteList) => (
                                <div
                                    key={list.id}
                                    className={'border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors' + (state.editingListId !== String(list.id) && props.onListClick ? ' cursor-pointer' : '')}
                                    onClick={() => {
                                        if (state.editingListId !== String(list.id) && props.onListClick) {
                                            props.onListClick(list.id);
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <Show when={state.editingListId === String(list.id)}>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <input
                                                            type="text"
                                                            value={state.editListName}
                                                            onChange={(e) => { state.editListName = e.target.value; }}
                                                            placeholder="Enter list name"
                                                            className="max-w-md block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
                                                        />
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`default-edit-${list.id}`}
                                                            checked={state.editSetAsDefault}
                                                            onChange={(e) => { state.editSetAsDefault = e.target.checked; }}
                                                            className="rounded border-gray-300"
                                                        />
                                                        <label htmlFor={`default-edit-${list.id}`} className="text-sm text-gray-500">
                                                            {state.getLabel('makeDefault', 'Make default')}
                                                        </label>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => state.handleUpdateList(String(list.id))}
                                                            disabled={!state.editListName.trim()}
                                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 disabled:opacity-50"
                                                        >
                                                            {state.getLabel('editSave', 'Save')}
                                                        </button>
                                                        <button
                                                            onClick={() => state.handleCancelEdit()}
                                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                                        >
                                                            {state.getLabel('editCancel', 'Cancel')}
                                                        </button>
                                                    </div>
                                                </div>
                                            </Show>

                                            <Show when={state.editingListId !== String(list.id)}>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-semibold">
                                                            {list.name}
                                                        </span>
                                                        <Show when={props.showDefaultIndicator !== false && list.isDefault}>
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                                {state.getLabel('defaultBadge', 'Default')}
                                                            </span>
                                                        </Show>
                                                    </div>

                                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                                        <Show when={props.showLastModified !== false}>
                                                            <div className="flex items-center gap-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                                                                {state.getLabel('lastModified', 'Last modified')}: {state.formatDate(list.updatedAt)}
                                                            </div>
                                                        </Show>
                                                        <Show when={props.showItemsCount !== false}>
                                                            <div className="flex items-center gap-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><line x1="12" x2="12" y1="22" y2="12"></line></svg>
                                                                {state.getTotalCount(list)}&nbsp;{state.getLabel('items', 'items')}
                                                            </div>
                                                        </Show>
                                                    </div>
                                                </div>
                                            </Show>
                                        </div>

                                        <Show when={(props.showActions !== false) && state.editingListId !== String(list.id)}>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={(e: any) => { e.stopPropagation(); state.handleEditList(list); }}
                                                    className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                                    title="Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                                                </button>
                                                <button
                                                    onClick={(e: any) => { e.stopPropagation(); state.handleDeleteList(list); }}
                                                    className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                                </button>
                                            </div>
                                        </Show>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                <Show when={state.displayedLists.length === 0}>
                    <div className="border border-gray-200 rounded-lg p-12 text-center space-y-4">
                        <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
                        </div>
                        <div>
                            <p className="text-lg font-medium">{state.getLabel('noLists', 'No favorite lists')}</p>
                            <p className="text-gray-500">{state.getLabel('noListsDescription', 'Start by creating a new list to save your items.')}</p>
                        </div>
                        <Show when={props.allowFavoriteListCreate !== false}>
                            <button
                                onClick={() => { state.showCreateModal = true; }}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80"
                            >
                                {state.getLabel('createFirstList', 'Create your first list')}
                            </button>
                        </Show>
                    </div>
                </Show>
            </Show>

            {/* Create Modal */}
            <Show when={state.showCreateModal}>
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">{state.getLabel('createTitle', 'Create New List')}</h3>
                            <button
                                onClick={() => { state.closeCreateModal(); }}
                                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <input
                                    type="text"
                                    value={state.newListName}
                                    onChange={(e) => { state.newListName = e.target.value; }}
                                    placeholder={state.getLabel('createPlaceholder', 'Enter list name')}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="create-set-default"
                                    checked={state.newSetAsDefault}
                                    onChange={(e) => { state.newSetAsDefault = e.target.checked; }}
                                    className="rounded border-gray-300"
                                />
                                <label htmlFor="create-set-default" className="text-sm text-gray-500">
                                    {state.getLabel('setAsDefault', 'Set as default favorite list')}
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => { state.closeCreateModal(); }}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    {state.getLabel('cancelButton', 'Cancel')}
                                </button>
                                <button
                                    onClick={() => state.handleCreateList()}
                                    disabled={!state.newListName.trim()}
                                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 disabled:opacity-50"
                                >
                                    {state.getLabel('saveButton', 'Save')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Delete Confirmation Modal */}
            <Show when={state.showDeleteModal && state.listToDelete}>
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg border">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">{state.getLabel('deleteTitle', 'Delete Favorite List')}</h3>
                            <button
                                onClick={() => state.handleCancelDelete()}
                                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            >
                                ×
                            </button>
                        </div>
                        <div className="space-y-4">
                            <p>{state.getLabel('deleteConfirm', 'Are you sure you want to delete')} <strong>&quot;{state.listToDelete?.name}&quot;</strong>?</p>
                            <p className="text-sm text-red-600">{state.getLabel('deleteWarning', 'This action cannot be undone.')}</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-6">
                            <button
                                onClick={() => state.handleCancelDelete()}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                            >
                                {state.getLabel('cancelButton', 'Cancel')}
                            </button>
                            <button
                                onClick={() => state.handleConfirmDelete()}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                            >
                                {state.getLabel('deleteButton', 'Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
