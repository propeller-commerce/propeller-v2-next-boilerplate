'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { Cart, CartMainItem, CartBaseItem, BundleItem, Enums } from 'propeller-sdk-v2';

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
  isMounted: boolean;
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
  getItemChildItems: (item: CartMainItem) => CartBaseItem[];
  isBundleItem: (item: CartMainItem) => boolean;
  getBundleName: (item: CartMainItem) => string;
  getBundlePrice: (item: CartMainItem) => string;
  getBundleLeaderName: (item: CartMainItem) => string;
  getBundleLeaderPrice: (item: CartMainItem) => string;
  getBundleNonLeaders: (item: CartMainItem) => BundleItem[];
  getBundleItemName: (bundleItem: BundleItem) => string;
  getBundleItemPrice: (bundleItem: BundleItem) => string;
}

function CartIconAndSidebar(props: CartIconAndSidebarProps) {
  const [isMounted, setIsMounted] = useState<CartIconAndSidebarState['isMounted']>(() => false);

  const [sidebarOpen, setSidebarOpen] = useState<CartIconAndSidebarState['sidebarOpen']>(
    () => false
  );

  const [isHovered, setIsHovered] = useState<CartIconAndSidebarState['isHovered']>(() => false);

  function getTotalItems(): ReturnType<CartIconAndSidebarState['getTotalItems']> {
    const items = props.cart?.items;
    if (!items) return 0;
    return items.length;
  }

  function getTotalPrice(): ReturnType<CartIconAndSidebarState['getTotalPrice']> {
    const total = props.cart?.total?.totalNet;
    if (total === undefined || total === null) return '\u20AC0.00';
    return `\u20AC${Number(total).toFixed(2)}`;
  }

  function getItems(): ReturnType<CartIconAndSidebarState['getItems']> {
    const items = props.cart?.items;
    if (!items) return [];
    return items.filter((item: CartMainItem) => item && item.product);
  }

  function getItemName(item: CartMainItem): ReturnType<CartIconAndSidebarState['getItemName']> {
    return item.product?.names?.[0]?.value || 'Unnamed Product';
  }

  function getItemImageUrl(
    item: CartMainItem
  ): ReturnType<CartIconAndSidebarState['getItemImageUrl']> {
    const url = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
    return url && url.startsWith('http') ? url : '';
  }

  function getItemProductUrl(
    item: CartMainItem
  ): ReturnType<CartIconAndSidebarState['getItemProductUrl']> {
    const product = item.product;
    if (!product) return '#';
    if (product.class === Enums.ProductClass.PRODUCT) {
      const slug = product.slugs?.[0]?.value || '';
      return `/product/${product.productId}/${slug}`;
    } else if (product.class === Enums.ProductClass.CLUSTER) {
      const slug = product.slugs?.[0]?.value || '';
      return `/cluster/${product.clusterId || product.productId}/${slug}`;
    }
    return '#';
  }

  function handleIconClick(): ReturnType<CartIconAndSidebarState['handleIconClick']> {
    if (props.showCartSidebarOnClick !== false) {
      setSidebarOpen(true);
    } else {
      if (props.onCartIconClick) props.onCartIconClick(props.cart);
    }
  }

  function openSidebar(): ReturnType<CartIconAndSidebarState['openSidebar']> {
    setSidebarOpen(true);
  }

  function closeSidebar(): ReturnType<CartIconAndSidebarState['closeSidebar']> {
    setSidebarOpen(false);
  }

  function handleCheckoutClick(): ReturnType<CartIconAndSidebarState['handleCheckoutClick']> {
    setSidebarOpen(false);
    if (props.onCheckoutButtonClick) props.onCheckoutButtonClick(props.cart);
  }

  function handleCartPageClick(): ReturnType<CartIconAndSidebarState['handleCartPageClick']> {
    setSidebarOpen(false);
    if (props.onCartPageButtonClick) props.onCartPageButtonClick(props.cart);
  }

  function getLabel(
    key: string,
    fallback: string
  ): ReturnType<CartIconAndSidebarState['getLabel']> {
    return props.labels?.[key] || fallback;
  }

  function getSidebarTitle(): ReturnType<CartIconAndSidebarState['getSidebarTitle']> {
    return props.cartSidebarTitle || props.labels?.['cartSidebarTitle'] || 'Shopping cart';
  }

  function getItemChildItems(
    item: CartMainItem
  ): ReturnType<CartIconAndSidebarState['getItemChildItems']> {
    const children = item.childItems;
    if (!children || !Array.isArray(children)) return [];
    return children;
  }

  function isBundleItem(item: CartMainItem): ReturnType<CartIconAndSidebarState['isBundleItem']> {
    return !!item.bundle;
  }

  function getBundleName(item: CartMainItem): ReturnType<CartIconAndSidebarState['getBundleName']> {
    return item.bundle?.name || 'Bundle';
  }

  function getBundlePrice(
    item: CartMainItem
  ): ReturnType<CartIconAndSidebarState['getBundlePrice']> {
    const price = item.bundle?.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function getBundleLeaderName(
    item: CartMainItem
  ): ReturnType<CartIconAndSidebarState['getBundleLeaderName']> {
    const items = item.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
    if (!leader) return '';
    return leader.product.names?.[0]?.value || 'Product';
  }

  function getBundleLeaderPrice(
    item: CartMainItem
  ): ReturnType<CartIconAndSidebarState['getBundleLeaderPrice']> {
    const items = item.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
    if (!leader) return '';
    const price = leader.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function getBundleNonLeaders(
    item: CartMainItem
  ): ReturnType<CartIconAndSidebarState['getBundleNonLeaders']> {
    const items = item.bundle?.items;
    if (!items) return [];
    return items.filter((bi: BundleItem) => bi.isLeader !== Enums.YesNo.Y);
  }

  function getBundleItemName(
    bundleItem: BundleItem
  ): ReturnType<CartIconAndSidebarState['getBundleItemName']> {
    return bundleItem.product.names?.[0]?.value || 'Product';
  }

  function getBundleItemPrice(
    bundleItem: BundleItem
  ): ReturnType<CartIconAndSidebarState['getBundleItemPrice']> {
    const price = bundleItem.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="relative">
      <div
        className="relative"
        onMouseEnter={(event) => {
          setIsHovered(true);
        }}
        onMouseLeave={(event) => {
          setIsHovered(false);
        }}
      >
        <button
          type="button"
          onClick={(event) => handleIconClick()}
          aria-label={getLabel('cartIconLabel', 'Shopping cart')}
          className={`relative inline-flex items-center justify-center p-2 rounded-md transition-colors text-gray-900${props.iconClassName ? ' ' + props.iconClassName : ''}`}
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            className="w-6 h-6"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
            />
          </svg>
          {isMounted && props.showBadge !== false && getTotalItems() > 0 ? (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold pointer-events-none">
              {getTotalItems()}
            </span>
          ) : null}
        </button>
        {props.showTotals && isHovered ? (
          <div className="absolute top-full right-0 mt-1 z-40 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 min-w-[140px] text-sm whitespace-nowrap">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">{getLabel('totalLabel', 'Total')}</span>
              <span className="font-semibold text-gray-900">{getTotalPrice()}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {getTotalItems()}
              {getLabel('itemsLabel', 'item(s)')}
            </div>
          </div>
        ) : null}
      </div>
      {sidebarOpen ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70]"
          onClick={(event) => closeSidebar()}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={getSidebarTitle()}
        className={`fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-gray-200${sidebarOpen ? ' translate-x-0' : ' translate-x-full'}${props.sidebarClassName ? ' ' + props.sidebarClassName : ''}`}
      >
        <div className="flex flex-col h-full">
          {isMounted ? (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-gray-700"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
                    />
                  </svg>
                  <h2 className="text-base font-semibold text-gray-900">{getSidebarTitle()}</h2>
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
                    {getTotalItems()}
                  </span>
                </div>
                <button
                  type="button"
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  onClick={(event) => closeSidebar()}
                  aria-label={getLabel('closeLabel', 'Close')}
                >
                  <svg
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {getItems().length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-16">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      className="w-12 h-12 text-gray-200"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500">
                      {getLabel('emptyCart', 'Your cart is empty.')}
                    </p>
                    <button
                      type="button"
                      className="text-sm text-secondary hover:underline"
                      onClick={(event) => closeSidebar()}
                    >
                      {getLabel('continueShopping', 'Continue Shopping')}
                    </button>
                  </div>
                ) : null}
                {getItems().length > 0 ? (
                  <>
                    {getItems()?.map((item) => (
                      <div className="flex gap-3" key={item.itemId}>
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-100 flex items-center justify-center">
                          {!!getItemImageUrl(item) ? (
                            <img
                              className="w-full h-full object-contain p-2"
                              src={getItemImageUrl(item)}
                              alt={getItemName(item)}
                            />
                          ) : null}
                          {!getItemImageUrl(item) ? (
                            <svg
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              className="w-8 h-8 text-gray-300"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                              />
                            </svg>
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          {isBundleItem(item) ? (
                            <>
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-sm font-medium leading-tight text-gray-900 line-clamp-2">
                                    {getBundleName(item)}
                                  </span>
                                  {!!getBundlePrice(item) ? (
                                    <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
                                      {getBundlePrice(item)}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1.5 space-y-1 border-l-2 border-secondary/10 pl-2">
                                  {!!getBundleLeaderName(item) ? (
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-medium text-gray-800">
                                        {getBundleLeaderName(item)}
                                      </span>
                                      {!!getBundleLeaderPrice(item) ? (
                                        <span className="text-gray-500 whitespace-nowrap ml-2">
                                          {getBundleLeaderPrice(item)}
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {getBundleNonLeaders(item)?.map((bundleItem, idx) => (
                                    <div
                                      className="flex justify-between items-center text-xs text-gray-600"
                                      key={idx}
                                    >
                                      <span className="line-clamp-1">
                                        {getBundleItemName(bundleItem)}
                                      </span>
                                      {!!getBundleItemPrice(bundleItem) ? (
                                        <span className="text-gray-400 whitespace-nowrap ml-2">
                                          {getBundleItemPrice(bundleItem)}
                                        </span>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex items-center text-xs text-gray-400 mt-1">
                                <span>
                                  {getLabel('qty', 'Qty')}: {item.quantity}
                                </span>
                              </div>
                            </>
                          ) : null}
                          {!isBundleItem(item) ? (
                            <>
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <a
                                    className="text-sm font-medium leading-tight text-gray-900 hover:text-secondary transition-colors line-clamp-2"
                                    href={getItemProductUrl(item)}
                                    onClick={(event) => closeSidebar()}
                                  >
                                    {getItemName(item)}
                                  </a>
                                  <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
                                    &euro;{item.totalSumNet.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  SKU: {item.product?.sku || 'N/A'}
                                </p>
                                {getItemChildItems(item).length > 0 ? (
                                  <div className="mt-1.5 space-y-1 border-l-2 border-gray-100 pl-2">
                                    {getItemChildItems(item)?.map((child, idx) => (
                                      <div
                                        className="flex justify-between items-center text-xs text-gray-600"
                                        key={idx}
                                      >
                                        <span className="line-clamp-1">
                                          {child.product.names?.[0]?.value || 'Option'}
                                        </span>
                                        <span className="text-gray-400 whitespace-nowrap ml-2">
                                          &euro;{child.totalSum.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex items-center text-xs text-gray-400">
                                <span>
                                  {getLabel('qty', 'Qty')}: {item.quantity}
                                </span>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
              {getItems().length > 0 ? (
                <div className="px-5 py-4 border-t border-gray-200 space-y-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {getLabel('total', 'Total')}
                    </span>
                    <span className="text-base font-bold text-gray-900">{getTotalPrice()}</span>
                  </div>
                  {props.cartCheckoutButton !== false ? (
                    <button
                      type="button"
                      className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-md bg-secondary text-white text-sm font-medium hover:bg-secondary/90 transition-colors"
                      onClick={(event) => handleCheckoutClick()}
                    >
                      {getLabel('checkoutButton', 'Checkout')}
                    </button>
                  ) : null}
                  {props.cartPageButton !== false ? (
                    <button
                      type="button"
                      className="w-full inline-flex justify-center items-center px-4 py-2.5 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                      onClick={(event) => handleCartPageClick()}
                    >
                      {getLabel('cartPageButton', 'View Cart Details')}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default CartIconAndSidebar;
