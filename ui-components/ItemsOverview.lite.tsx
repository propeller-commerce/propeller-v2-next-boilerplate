import { useStore, Show, For } from '@builder.io/mitosis';
import { Cart, CartMainItem, CartBaseItem, BundleItem, Enums } from 'propeller-sdk-v2';

export interface ItemsOverviewProps {
    /** Shopping cart object from which the cart items overview will be displayed */
    cart: Cart;

    /** The CSS class for the cart items overview container */
    itemsOverviewContainerClass?: string;

    /** Title of the cart items overview */
    title?: string;

    /** The cart items names are clickable links */
    itemNameClickable?: boolean;

    /** Action when a cart item's name is clicked */
    onCartItemNameClick?: (item: CartMainItem) => void;

    /** Show the quantity of the cart item */
    showQuantity?: boolean;

    /** Show the availability of the cart item */
    showAvailability?: boolean;

    /** Show the SKU of the cart item */
    showSku?: boolean;

    /** Show a small image of the cart item */
    showImage?: boolean;

    /** Show the price of the cart item */
    showPrice?: boolean;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;

    /** Labels for the component */
    labels?: Record<string, string>;
}

interface ItemsOverviewState {
    containerClass: string;
    itemNameClickable: boolean;
    showQuantity: boolean;
    showAvailability: boolean;
    showSku: boolean;
    showImage: boolean;
    showPrice: boolean;
    getLabel: (key: string, fallback: string) => string;
    formatItemPrice: (price: number) => string;
    items: any[];
    getItemName: (item: any) => string;
    getItemSku: (item: any) => string;
    getItemImageUrl: (item: any) => string;
    getItemTotalPrice: (item: any) => number;
    getItemAvailability: (item: any) => string;
    isInStock: (item: any) => boolean;
    handleItemNameClick: (item: any) => void;
    getItemChildItems: (item: any) => any[];
    isBundleItem: (item: any) => boolean;
    getBundleName: (item: any) => string;
    getBundlePrice: (item: any) => string;
    getBundleLeaderName: (item: any) => string;
    getBundleLeaderPrice: (item: any) => string;
    getBundleNonLeaders: (item: any) => any[];
    getBundleItemName: (bundleItem: any) => string;
    getBundleItemPrice: (bundleItem: any) => string;
}

export default function ItemsOverview(props: ItemsOverviewProps) {
    const state = useStore<ItemsOverviewState>({
        get containerClass() {
            return props.itemsOverviewContainerClass || 'cart-items-overview';
        },

        get itemNameClickable() {
            return props.itemNameClickable !== undefined ? props.itemNameClickable : true;
        },

        get showQuantity() {
            return props.showQuantity !== undefined ? props.showQuantity : true;
        },

        get showAvailability() {
            return props.showAvailability !== undefined ? props.showAvailability : true;
        },

        get showSku() {
            return props.showSku !== undefined ? props.showSku : true;
        },

        get showImage() {
            return props.showImage !== undefined ? props.showImage : true;
        },

        get showPrice() {
            return props.showPrice !== undefined ? props.showPrice : true;
        },

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        formatItemPrice(price: number) {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        get items() {
            return (props.cart as any)?.items || [];
        },

        getItemName(item: any) {
            return item.product?.names?.[0]?.value || 'Product';
        },

        getItemSku(item: any) {
            return item.product?.sku || '';
        },

        getItemImageUrl(item: any) {
            const url = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
            if (url && typeof url === 'string' && url.startsWith('http')) {
                return url;
            }
            return '';
        },

        getItemTotalPrice(item: any) {
            return (item.price || 0) * (item.quantity || 1);
        },

        getItemAvailability(item: any) {
            const stock = item.product?.inventory?.totalQuantity;
            if (stock === undefined || stock === null) return '';
            if (stock > 0) return props.labels?.['inStock'] || 'In stock';
            return props.labels?.['outOfStock'] || 'Out of stock';
        },

        isInStock(item: any) {
            const stock = item.product?.inventory?.totalQuantity;
            return stock !== undefined && stock !== null && stock > 0;
        },

        handleItemNameClick(item: any) {
            if ((props.itemNameClickable !== undefined ? props.itemNameClickable : true) && props.onCartItemNameClick) {
                props.onCartItemNameClick(item as CartMainItem);
            }
        },

        getItemChildItems(item: any) {
            const children = item.childItems;
            if (!children || !Array.isArray(children)) return [];
            return children;
        },

        isBundleItem(item: any) {
            return !!item.bundle;
        },

        getBundleName(item: any) {
            return item.bundle?.name || 'Bundle';
        },

        getBundlePrice(item: any) {
            const price = item.bundle?.price?.net;
            if (price === undefined || price === null) return '';
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        getBundleLeaderName(item: any) {
            const items = item.bundle?.items;
            if (!items) return '';
            const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
            if (!leader) return '';
            return leader.product.names?.[0]?.value || 'Product';
        },

        getBundleLeaderPrice(item: any) {
            const items = item.bundle?.items;
            if (!items) return '';
            const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
            if (!leader) return '';
            const price = leader.price?.net;
            if (price === undefined || price === null) return '';
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        getBundleNonLeaders(item: any) {
            const items = item.bundle?.items;
            if (!items) return [];
            return items.filter((bi: BundleItem) => bi.isLeader !== Enums.YesNo.Y);
        },

        getBundleItemName(bundleItem: any) {
            return bundleItem.product?.names?.[0]?.value || 'Product';
        },

        getBundleItemPrice(bundleItem: any) {
            const price = bundleItem.price?.net;
            if (price === undefined || price === null) return '';
            return `\u20AC${Number(price).toFixed(2)}`;
        },
    });

    return (
        <div className={state.containerClass}>
            <Show when={props.title}>
                <h2 className="text-lg font-bold mb-4">{props.title}</h2>
            </Show>

            <div className="space-y-4">
                <For each={state.items}>
                    {(item: any, index: number) => (
                        <div key={item.itemId || index} className="flex gap-3 pb-3 border-b border-gray-200 last:border-b-0 last:pb-0">
                            <Show when={state.showImage}>
                                <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-100 flex items-center justify-center">
                                    <Show when={state.getItemImageUrl(item)}>
                                        <img
                                            src={state.getItemImageUrl(item)}
                                            alt={state.getItemName(item)}
                                            className="w-full h-full object-contain p-1.5"
                                        />
                                    </Show>
                                    <Show when={!state.getItemImageUrl(item)}>
                                        <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                        </svg>
                                    </Show>
                                </div>
                            </Show>

                            <div className="flex-1 min-w-0">
                                {/* Bundle item display */}
                                <Show when={state.isBundleItem(item)}>
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="text-sm font-medium leading-tight text-gray-900 line-clamp-2">
                                                {state.getBundleName(item)}
                                            </span>
                                            <Show when={state.showPrice && !!state.getBundlePrice(item)}>
                                                <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
                                                    {state.getBundlePrice(item)}
                                                </span>
                                            </Show>
                                        </div>
                                        <div className="mt-1.5 space-y-1 border-l-2 border-secondary/10 pl-2">
                                            <Show when={!!state.getBundleLeaderName(item)}>
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-medium text-gray-800">
                                                        {state.getBundleLeaderName(item)}
                                                    </span>
                                                    <Show when={!!state.getBundleLeaderPrice(item)}>
                                                        <span className="text-gray-500 whitespace-nowrap ml-2">{state.getBundleLeaderPrice(item)}</span>
                                                    </Show>
                                                </div>
                                            </Show>
                                            {state.getBundleNonLeaders(item).map((bundleItem: BundleItem, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-xs text-gray-600">
                                                    <span className="line-clamp-1">{state.getBundleItemName(bundleItem)}</span>
                                                    <Show when={!!state.getBundleItemPrice(bundleItem)}>
                                                        <span className="text-gray-400 whitespace-nowrap ml-2">{state.getBundleItemPrice(bundleItem)}</span>
                                                    </Show>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-400 mt-1">
                                        <span>{state.getLabel('quantity', 'Qty:')} {item.quantity}</span>
                                    </div>
                                </Show>

                                {/* Normal / cluster item display */}
                                <Show when={!state.isBundleItem(item)}>
                                    <div>
                                        <div className="flex justify-between items-start gap-2">
                                            <Show when={state.itemNameClickable}>
                                                <p
                                                    onClick={() => state.handleItemNameClick(item)}
                                                    className="font-medium text-sm leading-tight cursor-pointer hover:text-secondary transition-colors line-clamp-2"
                                                >
                                                    {state.getItemName(item)}
                                                </p>
                                            </Show>
                                            <Show when={!state.itemNameClickable}>
                                                <p className="font-medium text-sm leading-tight line-clamp-2">{state.getItemName(item)}</p>
                                            </Show>
                                            <Show when={state.showPrice}>
                                                <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
                                                    {state.formatItemPrice(state.getItemTotalPrice(item))}
                                                </span>
                                            </Show>
                                        </div>

                                        <Show when={state.showSku && state.getItemSku(item)}>
                                            <p className="text-xs text-gray-500 mt-0.5">SKU: {state.getItemSku(item)}</p>
                                        </Show>

                                        {/* Cluster child items */}
                                        <Show when={state.getItemChildItems(item).length > 0}>
                                            <div className="mt-1.5 space-y-1 border-l-2 border-gray-100 pl-2">
                                                {state.getItemChildItems(item).map((child: CartBaseItem, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs text-gray-600">
                                                        <span className="line-clamp-1">{child.product?.names?.[0]?.value || 'Option'}</span>
                                                        <span className="text-gray-400 whitespace-nowrap ml-2">{state.formatItemPrice(child.totalSum || 0)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </Show>
                                    </div>
                                    <div className="flex items-center text-xs text-gray-400 mt-1">
                                        <span>{state.getLabel('quantity', 'Qty:')} {item.quantity}</span>
                                        <Show when={state.showAvailability && state.getItemAvailability(item)}>
                                            <span className={`ml-2 ${state.isInStock(item) ? 'text-green-600' : 'text-red-500'}`}>
                                                {state.getItemAvailability(item)}
                                            </span>
                                        </Show>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    )}
                </For>
            </div>

            <Show when={state.items.length === 0}>
                <p className="text-gray-500 italic text-sm">
                    {state.getLabel('noItems', 'No items in cart.')}
                </p>
            </Show>
        </div>
    );
}
