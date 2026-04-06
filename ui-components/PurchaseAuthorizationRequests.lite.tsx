import {
    useStore,
    Show,
    For,
    onUpdate,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    GraphQLClient,
    Cart,
    CartService,
    CartSearchInput,
    Enums,
} from 'propeller-sdk-v2';

export interface PurchaseAuthorizationRequestsProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** The logged-in user */
    user: Contact | Customer;

    /** The companyId of the current selected company */
    companyId: number;

    /**
     * Override: fires instead of the default CartService.acceptPurchaseAuthorizationRequest() call.
     * Receives the cartId string.
     */
    onAcceptRequest?: (cartId: string) => void;

    /**
     * Fires after a purchase authorization request has been accepted.
     * Receives the full accepted Cart object (or the selectedCart if onAcceptRequest override was used).
     */
    afterAcceptRequest?: (cart: Cart) => void;

    /** Labels for the component */
    labels?: Record<string, string>;

    /** Additional CSS class for the root element */
    className?: string;

    /**
     * App configuration passthrough.
     * Used for imageSearchFiltersGrid, imageVariantFiltersSmall when fetching cart detail.
     */
    configuration?: Record<string, any>;

    /** Called when an SDK operation fails; receives the normalized error */
    onError?: (err: Error) => void;
}

interface PurchaseAuthorizationRequestsState {
    carts: any[];
    loading: boolean;
    selectedCart: any | null;
    modalLoading: boolean;
    acceptLoading: boolean;
    isAuthManager: boolean;
    getLabel: (key: string, fallback: string) => string;
    formatDate: (dateStr: string) => string;
    formatPrice: (price: number) => string;
    getTotalQuantity: (cart: any) => number;
    getContactName: (contact: any) => string;
    getModalItems: () => any[];
    loadCarts: () => Promise<void>;
    handleViewCart: (cart: any) => Promise<void>;
    handleAcceptRequest: () => Promise<void>;
    closeModal: () => void;
}

export default function PurchaseAuthorizationRequests(props: PurchaseAuthorizationRequestsProps) {
    const state = useStore<PurchaseAuthorizationRequestsState>({
        carts: [],
        loading: true,
        selectedCart: null,
        modalLoading: false,
        acceptLoading: false,

        get isAuthManager(): boolean {
            if (!props.user || !('contactId' in props.user)) return false;
            const pacData = (props.user as any).purchaseAuthorizationConfigs;
            const items: any[] = pacData?.items ?? pacData?._items ?? [];
            return items.some((pac: any) => {
                const role = pac.purchaseRole ?? pac._purchaseRole;
                const pacCompanyId =
                    pac.company?.companyId ??
                    pac.company?._companyId ??
                    pac._company?.companyId ??
                    pac._company?._companyId;
                return role === Enums.PurchaseRole.AUTHORIZATION_MANAGER && pacCompanyId === props.companyId;
            });
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as any)?.[key] || fallback;
        },

        formatDate(dateStr: string): string {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
        },

        formatPrice(price: number): string {
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        getTotalQuantity(cart: any): number {
            const items = cart?.items || [];
            return items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        },

        getContactName(contact: any): string {
            if (!contact) return '';
            const firstName = contact.firstName ?? contact._firstName ?? '';
            const middleName = contact.middleName ?? contact._middleName ?? '';
            const lastName = contact.lastName ?? contact._lastName ?? '';
            return [firstName, middleName, lastName].filter(Boolean).join(' ');
        },

        getModalItems(): any[] {
            if (!state.selectedCart) return [];
            return (state.selectedCart as any).items || [];
        },

        async loadCarts(): Promise<void> {
            if (!props.graphqlClient || !props.companyId) return;
            state.loading = true;
            try {
                const cartService = new CartService(props.graphqlClient);
                const searchInput: CartSearchInput = {
                    statuses: [Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION as any],
                    companyIds: [props.companyId],
                };
                const response = await cartService.getCarts(searchInput);
                state.carts = response?.items || [];
            } catch (err: any) {
                if (props.onError) {
                    props.onError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                state.loading = false;
            }
        },

        async handleViewCart(cart: any): Promise<void> {
            state.selectedCart = cart;
            state.modalLoading = true;
            try {
                const cartService = new CartService(props.graphqlClient);
                const fullCart = await cartService.getCart({
                    cartId: cart.cartId ?? cart._cartId,
                    language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
                    imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                    imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
                });
                state.selectedCart = fullCart;
            } catch (err: any) {
                if (props.onError) {
                    props.onError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                state.modalLoading = false;
            }
        },

        async handleAcceptRequest(): Promise<void> {
            if (!state.selectedCart) return;
            state.acceptLoading = true;
            const cartId = (state.selectedCart as any).cartId ?? (state.selectedCart as any)._cartId;
            try {
                let cartForCallback: any = state.selectedCart;
                if (props.onAcceptRequest) {
                    props.onAcceptRequest(cartId);
                } else {
                    const cartService = new CartService(props.graphqlClient);
                    cartForCallback = await cartService.acceptPurchaseAuthorizationRequest({ id: cartId });
                }
                if (props.afterAcceptRequest) {
                    props.afterAcceptRequest(cartForCallback as Cart);
                }
                state.selectedCart = null;
                await state.loadCarts();
            } catch (err: any) {
                if (props.onError) {
                    props.onError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                state.acceptLoading = false;
            }
        },

        closeModal(): void {
            state.selectedCart = null;
        },
    });

    onUpdate(() => {
        if (props.graphqlClient && props.companyId) {
            state.loadCarts();
        }
    }, [props.companyId]);

    return (
        <div className={`purchase-authorization-requests ${props.className || ''}`}>
            <Show when={state.isAuthManager}>
                <div className="space-y-4">
                    {/* Title */}
                    <h2 className="text-xl font-semibold">
                        {state.getLabel('title', 'Authorization Requests')}
                    </h2>

                    {/* Loading spinner */}
                    <Show when={state.loading}>
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    </Show>

                    {/* Content */}
                    <Show when={!state.loading}>
                        {/* Empty state */}
                        <Show when={state.carts.length === 0}>
                            <div className="text-center py-12 text-muted-foreground">
                                {state.getLabel('empty', 'No pending authorization requests')}
                            </div>
                        </Show>

                        {/* Requests table */}
                        <Show when={state.carts.length > 0}>
                            <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 border-b border-border">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                {state.getLabel('colId', '#')}
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                {state.getLabel('colDate', 'Date')}
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                {state.getLabel('colQuantity', 'Quantity')}
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                {state.getLabel('colTotal', 'Total')}
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                {state.getLabel('colRequestedBy', 'Requested by')}
                                            </th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                                {state.getLabel('colActions', 'Actions')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        <For each={state.carts}>
                                            {(cart: any, index: number) => (
                                                <tr key={index} className="hover:bg-muted/30 transition-colors">
                                                    {/* # column — empty cells */}
                                                    <td className="px-4 py-3 text-muted-foreground" />

                                                    {/* Date */}
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {state.formatDate(cart.lastModifiedAt ?? cart._lastModifiedAt ?? '')}
                                                    </td>

                                                    {/* Quantity — sum of all item quantities */}
                                                    <td className="px-4 py-3">
                                                        {state.getTotalQuantity(cart)}
                                                    </td>

                                                    {/* Total — cart.total.totalNet */}
                                                    <td className="px-4 py-3 font-medium">
                                                        {state.formatPrice(
                                                            cart.total?.totalNet ??
                                                            cart._total?.totalNet ??
                                                            cart._total?._totalNet ??
                                                            0
                                                        )}
                                                    </td>

                                                    {/* Requested by — contact name + email */}
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium">
                                                            {state.getContactName(cart.contact ?? cart._contact)}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            {cart.contact?.email ??
                                                                cart.contact?._email ??
                                                                cart._contact?.email ??
                                                                cart._contact?._email ??
                                                                ''}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => state.handleViewCart(cart)}
                                                            className="px-3 py-1.5 text-sm border border-input rounded-md bg-background hover:bg-muted/50 transition-colors"
                                                        >
                                                            {state.getLabel('view', 'View')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )}
                                        </For>
                                    </tbody>
                                </table>
                            </div>
                        </Show>
                    </Show>

                    {/* Cart preview modal */}
                    <Show when={!!state.selectedCart}>
                        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                            {/* Backdrop */}
                            <div className="fixed inset-0 bg-gray-500/20" onClick={() => state.closeModal()} />

                            {/* Panel */}
                            <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

                                {/* Modal header */}
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        {state.getLabel('modalTitle', 'Authorization Request')}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => state.closeModal()}
                                        className="text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Modal loading */}
                                <Show when={state.modalLoading}>
                                    <div className="flex items-center justify-center py-16">
                                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                </Show>

                                {/* Modal body */}
                                <Show when={!state.modalLoading}>
                                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                                        {/* Requester info */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                                {state.getLabel('requesterInfo', 'Requester')}
                                            </h4>
                                            <p className="text-sm font-medium">
                                                {state.getContactName(
                                                    (state.selectedCart as any)?.deliveryAddress ??
                                                    (state.selectedCart as any)?._deliveryAddress
                                                )}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {(state.selectedCart as any)?.deliveryAddress?.email ??
                                                    (state.selectedCart as any)?._deliveryAddress?.email ??
                                                    (state.selectedCart as any)?._deliveryAddress?._email ??
                                                    ''}
                                            </p>
                                        </div>

                                        {/* Items list */}
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                                {state.getLabel('itemsTitle', 'Items')}
                                            </h4>
                                            <div className="overflow-x-auto rounded border border-border">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-muted/50 border-b border-border">
                                                        <tr>
                                                            <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                                                {state.getLabel('itemProduct', 'Product')}
                                                            </th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                                                {state.getLabel('itemQty', 'Qty')}
                                                            </th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                                                {state.getLabel('itemUnitPrice', 'Unit price')}
                                                            </th>
                                                            <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                                                {state.getLabel('itemTotal', 'Total')}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border">
                                                        <For each={state.getModalItems()}>
                                                            {(item: any, idx: number) => (
                                                                <tr key={idx}>
                                                                    <td className="px-3 py-2">
                                                                        {item.product?.names?.[0]?.value ??
                                                                            item._product?.names?.[0]?.value ??
                                                                            ''}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        {item.quantity ?? item._quantity ?? 0}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right">
                                                                        {state.formatPrice(
                                                                            (item.quantity ?? item._quantity ?? 0) > 0
                                                                                ? (item.totalSum ?? item._totalSum ?? 0) / (item.quantity ?? item._quantity ?? 1)
                                                                                : 0
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right font-medium">
                                                                        {state.formatPrice(item.totalSumNet ?? item._totalSumNet ?? 0)}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </For>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Totals */}
                                        <div className="border-t border-border pt-4 space-y-2 text-sm">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{state.getLabel('totalExclVat', 'Total excl. VAT:')}</span>
                                                <span>{state.formatPrice(
                                                    (state.selectedCart as any)?.total?.totalGross ??
                                                    (state.selectedCart as any)?._total?.totalGross ??
                                                    (state.selectedCart as any)?._total?._totalGross ??
                                                    0
                                                )}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>{state.getLabel('totalVat', 'VAT:')}</span>
                                                <span>{state.formatPrice(
                                                    ((state.selectedCart as any)?.total?.totalNet ??
                                                        (state.selectedCart as any)?._total?.totalNet ??
                                                        (state.selectedCart as any)?._total?._totalNet ??
                                                        0) -
                                                    ((state.selectedCart as any)?.total?.totalGross ??
                                                        (state.selectedCart as any)?._total?.totalGross ??
                                                        (state.selectedCart as any)?._total?._totalGross ??
                                                        0)
                                                )}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                                                <span>{state.getLabel('total', 'Total:')}</span>
                                                <span>{state.formatPrice(
                                                    (state.selectedCart as any)?.total?.totalNet ??
                                                    (state.selectedCart as any)?._total?.totalNet ??
                                                    (state.selectedCart as any)?._total?._totalNet ??
                                                    0
                                                )}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Modal footer */}
                                    <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => state.closeModal()}
                                            className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                        >
                                            {state.getLabel('cancel', 'Cancel')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => state.handleAcceptRequest()}
                                            disabled={state.acceptLoading}
                                            className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Show when={state.acceptLoading}>
                                                {state.getLabel('accepting', 'Accepting...')}
                                            </Show>
                                            <Show when={!state.acceptLoading}>
                                                {state.getLabel('acceptRequest', 'Accept request')}
                                            </Show>
                                        </button>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
