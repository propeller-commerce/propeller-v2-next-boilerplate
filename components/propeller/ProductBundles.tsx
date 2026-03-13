'use client';
import { useState, useEffect } from 'react';
import { GraphQLClient, BundleService, Contact, Customer } from 'propeller-sdk-v2';

export interface ProductBundlesProps {
  graphqlClient: GraphQLClient;
  productId: number;
  language: string;
  taxZone: string;
  includeTax?: boolean;
  portalMode?: string;
  user?: Contact | Customer | null;
  stockValidation?: boolean;
  showIndividualItems?: boolean;
  layout?: 'vertical' | 'horizontal' | 'compact';
  labels?: Record<string, string>;
  onAddBundleToCart: (bundleId: string, quantity: number) => void;
  className?: string;
}

function ProductBundles(props: ProductBundlesProps) {
  const [_bundles, set_bundles] = useState<any[]>([]);
  const [_isLoading, set_isLoading] = useState(false);
  const [_includeTax, set_includeTax] = useState(true);
  const [_isMounted, set_isMounted] = useState(false);
  const [_addingBundleId, set_addingBundleId] = useState<string | null>(null);

  const includeTax = props.includeTax !== undefined ? props.includeTax : _includeTax;
  const showItems = props.showIndividualItems !== undefined ? props.showIndividualItems : true;
  const layout = props.layout || 'horizontal';
  const isAnonymous = !props.user;
  const hidePrices = props.portalMode === 'semi-closed' && isAnonymous;

  function getLabel(key: string, fallback: string) {
    return props.labels?.[key] || fallback;
  }

  function formatPrice(value: number) {
    return '\u20AC' + value.toFixed(2);
  }

  function getBundlePrice(bundle: any) {
    return includeTax ? bundle.price?.net || 0 : bundle.price?.gross || 0;
  }

  function getOriginalPrice(bundle: any) {
    return includeTax ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;
  }

  function getItemPrice(item: any) {
    return includeTax ? item.price?.net || 0 : item.price?.gross || 0;
  }

  function hasDiscount(bundle: any) {
    const current = getBundlePrice(bundle);
    const original = getOriginalPrice(bundle);
    return original > 0 && current < original;
  }

  function getDiscountPercentage(bundle: any) {
    const original = getOriginalPrice(bundle);
    if (original <= 0) return 0;
    return Math.round(((original - getBundlePrice(bundle)) / original) * 100);
  }

  function getProductImage(product: any) {
    return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }

  function getProductName(product: any) {
    return product?.names?.[0]?.value || '';
  }

  async function fetchBundles() {
    if (!props.graphqlClient || !props.productId) return;
    set_isLoading(true);
    try {
      const bundleService = new BundleService(props.graphqlClient);
      // SDK bug workaround: getBundles() doesn't pass language/image variables
      // Will work with proper SDK method once query declarations are fixed
      const result = await (bundleService as any).executeQuery('bundles', {
        input: {
          productIds: [props.productId],
          taxZone: props.taxZone || 'NL',
          page: 1,
          offset: 20,
        },
        language: props.language || 'NL',
        imageSearchFilters: { page: 1, offset: 1 },
        imageVariantFilters: {
          transformations: [{
            name: 'bundle',
            transformation: { format: 'WEBP', height: 200, width: 200, fit: 'BOUNDS' },
          }],
        },
      });
      set_bundles(result?.data?.bundles?.items || []);
    } catch (e) {
      set_bundles([]);
    } finally {
      set_isLoading(false);
    }
  }

  function handleAddToCart(bundleId: string) {
    if (_addingBundleId) return;
    set_addingBundleId(bundleId);
    props.onAddBundleToCart(bundleId, 1);
    setTimeout(() => set_addingBundleId(null), 1500);
  }

  // Mount + price toggle listener
  useEffect(() => {
    set_isMounted(true);
    const stored = localStorage.getItem('price_include_tax');
    set_includeTax(stored === null ? true : stored === 'true');
    const listener = () => {
      const val = localStorage.getItem('price_include_tax');
      set_includeTax(val === null ? true : val === 'true');
    };
    window.addEventListener('priceToggleChanged', listener);
    return () => window.removeEventListener('priceToggleChanged', listener);
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchBundles();
  }, []);

  // Re-fetch when productId changes
  useEffect(() => {
    fetchBundles();
  }, [props.productId]);

  if (!_isMounted || (!_isLoading && _bundles.length === 0)) {
    return null;
  }

  if (_isLoading) {
    return (
      <div className={props.className || 'mb-12'}>
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className={props.className || 'mb-12'}>
      {_bundles.map((bundle) => (
        <div key={bundle.id} className="border rounded-lg overflow-hidden mb-6">
          {/* Bundle header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold">
                {bundle.name || getLabel('title', 'Combo deal')}
              </h3>
              {!hidePrices && hasDiscount(bundle) && (
                <span className="bg-red-100 text-red-700 text-sm font-semibold px-2 py-0.5 rounded">
                  -{getDiscountPercentage(bundle)}%
                </span>
              )}
            </div>
            {bundle.condition && (
              <span className="text-xs text-gray-500">
                {bundle.condition === 'ALL'
                  ? getLabel('condition_ALL', 'Discount on all items')
                  : getLabel('condition_EP', 'Discount on extra items')}
              </span>
            )}
          </div>

          {/* Bundle items */}
          {showItems && layout !== 'compact' && bundle.items && bundle.items.length > 0 && (
            <div className={`p-4 ${layout === 'horizontal' ? 'flex gap-4 overflow-x-auto' : 'space-y-3'}`}>
              {bundle.items.map((item: any, idx: number) => (
                <div
                  key={item.productId + '-' + idx}
                  className={`flex items-center gap-3 ${
                    layout === 'horizontal' ? 'flex-shrink-0 w-48 flex-col text-center' : ''
                  }`}
                >
                  {/* Product image */}
                  <div className={`bg-gray-50 rounded overflow-hidden flex-shrink-0 ${
                    layout === 'horizontal' ? 'w-24 h-24' : 'w-16 h-16'
                  }`}>
                    {getProductImage(item.product) ? (
                      <img
                        src={getProductImage(item.product)}
                        alt={getProductName(item.product)}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product info */}
                  <div className={layout === 'horizontal' ? '' : 'flex-1 min-w-0'}>
                    <div className="text-sm font-medium truncate">
                      {getProductName(item.product) || `Product ${item.productId}`}
                    </div>
                    {item.product?.sku && (
                      <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                    )}
                    {!hidePrices && item.price && (
                      <div className="text-sm text-gray-700 mt-0.5">
                        {formatPrice(getItemPrice(item))}
                      </div>
                    )}
                    {item.isLeader === 'Y' && (
                      <span className="text-xs text-blue-600 font-medium">
                        {getLabel('leaderItem', 'Main product')}
                      </span>
                    )}
                  </div>

                  {/* Plus sign between items (horizontal layout) */}
                  {layout === 'horizontal' && idx < bundle.items.length - 1 && (
                    <div className="flex-shrink-0 text-2xl text-gray-300 font-light mx-2">+</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Bundle pricing + add to cart */}
          {!hidePrices && (
            <div className="flex items-center justify-between p-4 border-t bg-white">
              <div className="flex items-center gap-4">
                {hasDiscount(bundle) && (
                  <span className="text-gray-400 line-through text-sm">
                    {formatPrice(getOriginalPrice(bundle))}
                  </span>
                )}
                <span className="text-xl font-bold text-blue-600">
                  {formatPrice(getBundlePrice(bundle))}
                </span>
                {hasDiscount(bundle) && (
                  <span className="text-sm text-green-600 font-medium">
                    {getLabel('youSave', 'You save')} {formatPrice(getOriginalPrice(bundle) - getBundlePrice(bundle))}
                  </span>
                )}
              </div>

              <button
                onClick={() => handleAddToCart(bundle.id)}
                disabled={_addingBundleId === bundle.id}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {_addingBundleId === bundle.id
                  ? getLabel('adding', 'Adding...')
                  : getLabel('addToCart', 'Add bundle to cart')}
              </button>
            </div>
          )}

          {/* Semi-closed mode: login prompt */}
          {hidePrices && (
            <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">
              {getLabel('loginToSeePrices', 'Log in to see prices and add to cart')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProductBundles;
