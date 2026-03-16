import {
    useStore,
    Show,
    For,
    onMount,
} from '@builder.io/mitosis';
import {
    Cart,
    CartMainItem,
} from 'propeller-sdk-v2';

export interface CartIconAndSidebarProps {
    /**
     * Shopping cart that this component will operate with.
     * Should be passed from a cart state.
     */
    cart: Cart;

    /**
     * Icon for the cart icon in header.
     * @default 'default-cart-icon'
     */
    icon?: string;

    /**
     * Shows item count badge on the cart icon.
     * @default true
     */
    showBadge?: boolean;

    /**
     * Shows the totals of the shopping cart beneath the icon when hovered.
     * @default false
     */
    showTotals?: boolean;

    /**
     * Show cart sidebar at the right side of the screen when cart icon is clicked.
     * If false it will fire onCartIconClick() instead.
     * @default true
     */
    showCartSidebarOnClick?: boolean;

    /**
     * Fires a click event when showCartSidebarOnClick is set to false.
     */
    onCartIconClick?: (cart: Cart) => void;

    /**
     * Title for the shopping cart sidebar.
     * @default 'Shopping cart'
     */
    cartSidebarTitle?: string;

    /**
     * Show checkout button in cart sidebar for immediate checkout.
     * @default true
     */
    cartCheckoutButton?: boolean;

    /**
     * Fires a click event when the checkout button in the sidebar is clicked.
     */
    onCheckoutButtonClick?: (cart: Cart) => void;

    /**
     * Show shopping cart page button in cart sidebar.
     * @default true
     */
    cartPageButton?: boolean;

    /**
     * Fires a click event when the shopping cart button in the sidebar is clicked.
     */
    onCartPageButtonClick?: (cart: Cart) => void;

    /**
     * Labels for the component.
     * Available keys: cartIconLabel, totalLabel, itemsLabel, emptyCart,
     * continueShopping, qty, total, checkoutButton, cartPageButton, closeLabel
     */
    labels?: Record<string, string>;

    /**
     * Additional class name for the shopping cart icon.
     */
    iconClassName?: string;

    /**
     * Additional class name for the shopping cart sidebar.
     */
    sidebarClassName?: string;
}

interface CartIconAndSidebarState {
    _isMounted: boolean;
    sidebarOpen: boolean;
    isHovered: boolean;
    getTotalItems: () => number;
    getTotalPrice: () => string;
    getItems: () => CartMainItem[];
    getItemName: (item: CartMainItem) => string;
    getItemImageUrl: (item: CartMainItem) => string;
    getItemProductUrl: (item: CartMainItem) => string;
    handleIconClick: () => void;
    openSidebar: () => void;
    closeSidebar: () => void;
    handleCheckoutClick: () => void;
    handleCartPageClick: () => void;
    getLabel: (key: string, fallback: string) => string;
    getSidebarTitle: () => string;
}

export default function CartIconAndSidebar(props: CartIconAndSidebarProps) {
    const state = useStore<CartIconAndSidebarState>({
        _isMounted: false,
        sidebarOpen: false,
        isHovered: false,

        getTotalItems() {
            const items = (props.cart as any)?.items;
            if (!items || !Array.isArray(items)) return 0;
            return items.length;
        },

        getTotalPrice() {
            const total = (props.cart as any)?.total?.totalNet;
            if (total === undefined || total === null) return '\u20AC0.00';
            return `\u20AC${Number(total).toFixed(2)}`;
        },

        getItems() {
            const items = (props.cart as any)?.items;
            if (!items || !Array.isArray(items)) return [];
            return (items as CartMainItem[]).filter((item: CartMainItem) => item && item.product);
        },

        getItemName(item: CartMainItem) {
            return (item.product as any)?.names?.[0]?.value || 'Unnamed Product';
        },

        getItemImageUrl(item: CartMainItem) {
            const url = (item.product as any)?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
            return url && url.startsWith('http') ? url : '';
        },

        getItemProductUrl(item: CartMainItem) {
            const product = item.product as any;
            if (!product) return '#';
            if (product.class === 'PRODUCT') {
                const slug = product.slugs?.[0]?.value || '';
                return `/product/${product.productId}/${slug}`;
            } else if (product.class === 'CLUSTER') {
                const slug = product.slugs?.[0]?.value || '';
                return `/cluster/${product.clusterId || product.productId}/${slug}`;
            }
            return '#';
        },

        handleIconClick() {
            if (props.showCartSidebarOnClick !== false) {
                state.sidebarOpen = true;
            } else {
                if (props.onCartIconClick) props.onCartIconClick(props.cart);
            }
        },

        openSidebar() {
            state.sidebarOpen = true;
        },

        closeSidebar() {
            state.sidebarOpen = false;
        },

        handleCheckoutClick() {
            state.sidebarOpen = false;
            if (props.onCheckoutButtonClick) props.onCheckoutButtonClick(props.cart);
        },

        handleCartPageClick() {
            state.sidebarOpen = false;
            if (props.onCartPageButtonClick) props.onCartPageButtonClick(props.cart);
        },

        getLabel(key: string, fallback: string) {
            return (props.labels as any)?.[key] || fallback;
        },

        getSidebarTitle() {
            return props.cartSidebarTitle || (props.labels as any)?.['cartSidebarTitle'] || 'Shopping cart';
        },
    });

    onMount(() => {
        state._isMounted = true;
    });

    return (
        <div className="relative">
            {/* Cart Icon + hover totals */}
            <div
                className="relative"
                onMouseEnter={() => { state.isHovered = true; }}
                onMouseLeave={() => { state.isHovered = false; }}
            >
                <button
                    type="button"
                    onClick={() => state.handleIconClick()}
                    className={`relative inline-flex items-center justify-center p-2 rounded-md transition-colors text-gray-900${props.iconClassName ? ' ' + props.iconClassName : ''}`}
                    aria-label={state.getLabel('cartIconLabel', 'Shopping cart')}
                >
                    {/* Shopping bag icon */}
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
                        />
                    </svg>

                    {/* Item count badge */}
                    <Show when={state._isMounted && props.showBadge !== false && state.getTotalItems() > 0}>
                        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold pointer-events-none">
                            {state.getTotalItems()}
                        </span>
                    </Show>
                </button>

                {/* Hover totals tooltip */}
                <Show when={props.showTotals && state.isHovered}>
                    <div className="absolute top-full right-0 mt-1 z-40 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 min-w-[140px] text-sm whitespace-nowrap">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-500">{state.getLabel('totalLabel', 'Total')}</span>
                            <span className="font-semibold text-gray-900">{state.getTotalPrice()}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            {state.getTotalItems()} {state.getLabel('itemsLabel', 'item(s)')}
                        </div>
                    </div>
                </Show>
            </div>

            {/* Sidebar overlay */}
            <Show when={state.sidebarOpen}>
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    onClick={() => state.closeSidebar()}
                    aria-hidden="true"
                />
            </Show>

            {/* Cart sidebar */}
            <div
                className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200${state.sidebarOpen ? ' translate-x-0' : ' translate-x-full'}${props.sidebarClassName ? ' ' + props.sidebarClassName : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={state.getSidebarTitle()}
            >
                <div className="flex flex-col h-full">
                  <Show when={state._isMounted}>
                    {/* Sidebar header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <svg
                                className="w-5 h-5 text-gray-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
                                />
                            </svg>
                            <h2 className="text-base font-semibold text-gray-900">{state.getSidebarTitle()}</h2>
                            <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                                {state.getTotalItems()}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => state.closeSidebar()}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            aria-label={state.getLabel('closeLabel', 'Close')}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Items list */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        <Show when={state.getItems().length === 0}>
                            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16">
                                <svg
                                    className="w-12 h-12 text-gray-200"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
                                    />
                                </svg>
                                <p className="text-sm text-gray-500">{state.getLabel('emptyCart', 'Your cart is empty.')}</p>
                                <button
                                    type="button"
                                    onClick={() => state.closeSidebar()}
                                    className="text-sm text-violet-600 hover:underline"
                                >
                                    {state.getLabel('continueShopping', 'Continue Shopping')}
                                </button>
                            </div>
                        </Show>

                        <Show when={state.getItems().length > 0}>
                            <For each={state.getItems()}>
                                {(item: CartMainItem) => (
                                    <div key={item.itemId} className="flex gap-3">
                                        {/* Product image */}
                                        <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-100 flex items-center justify-center">
                                            <Show when={state.getItemImageUrl(item)}>
                                                <img
                                                    src={state.getItemImageUrl(item)}
                                                    alt={state.getItemName(item)}
                                                    className="w-full h-full object-contain p-2"
                                                />
                                            </Show>
                                            <Show when={!state.getItemImageUrl(item)}>
                                                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                                </svg>
                                            </Show>
                                        </div>

                                        {/* Product info */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                            <div>
                                                <div className="flex justify-between items-start gap-2">
                                                    <a
                                                        href={state.getItemProductUrl(item)}
                                                        onClick={() => state.closeSidebar()}
                                                        className="text-sm font-medium leading-tight text-gray-900 hover:text-violet-600 transition-colors line-clamp-2"
                                                    >
                                                        {state.getItemName(item)}
                                                    </a>
                                                    <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
                                                        &euro;{((item as any).totalSumNet || 0).toFixed(2)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    SKU: {(item.product as any)?.sku || 'N/A'}
                                                </p>
                                            </div>
                                            <div className="flex items-center text-xs text-gray-400">
                                                <span>{state.getLabel('qty', 'Qty')}: {item.quantity}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </For>
                        </Show>
                    </div>

                    {/* Sidebar footer */}
                    <Show when={state.getItems().length > 0}>
                        <div className="px-5 py-4 border-t border-gray-200 space-y-3 bg-gray-50">
                            {/* Cart total */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">{state.getLabel('total', 'Total')}</span>
                                <span className="text-base font-bold text-gray-900">{state.getTotalPrice()}</span>
                            </div>

                            {/* Checkout button */}
                            <Show when={props.cartCheckoutButton !== false}>
                                <button
                                    type="button"
                                    onClick={() => state.handleCheckoutClick()}
                                    className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                                >
                                    {state.getLabel('checkoutButton', 'Checkout')}
                                </button>
                            </Show>

                            {/* Cart page button */}
                            <Show when={props.cartPageButton !== false}>
                                <button
                                    type="button"
                                    onClick={() => state.handleCartPageClick()}
                                    className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                                >
                                    {state.getLabel('cartPageButton', 'View Cart Details')}
                                </button>
                            </Show>
                        </div>
                    </Show>
                  </Show>
                </div>
            </div>
        </div>
    );
}
