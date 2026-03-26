'use client';
import * as React from 'react';

import { useState } from 'react';
import { Product, ClusterOption, Enums } from 'propeller-sdk-v2';

/**
 * Flattened render model for one product inside an option dropdown.
 */
interface RenderedOptionProduct {
  productId: number;
  productIdStr: string;
  /** Combined display label, e.g. "Product Name — €10.00" */
  label: string;
}

/**
 * Flattened render model for one cluster option group, precomputed
 * to avoid calling state methods with arguments inside JSX.
 */
/**
 * Flattened render model for one product inside an option dropdown.
 */

/**
 * Flattened render model for one cluster option group, precomputed
 * to avoid calling state methods with arguments inside JSX.
 */
interface RenderedOption {
  id: number;
  idStr: string;
  name: string;
  isRequired: boolean;
  selectedProductId: string;
  hasSelection: boolean;
  hasError: boolean;
  /** Image URL of the currently selected product (empty string if none). */
  previewImageUrl: string;
  previewName: string;
  previewPrice: string;
  products: RenderedOptionProduct[];
}
/**
 * Flattened render model for one product inside an option dropdown.
 */

/**
 * Flattened render model for one cluster option group, precomputed
 * to avoid calling state methods with arguments inside JSX.
 */

export interface ClusterOptionsProps {
  /**
   * The cluster ID this options selector belongs to.
   * @required
   */
  clusterId: number;

  /**
   * An array of options that belong to the cluster.
   * Hidden options (option.hidden === 'Y') are automatically filtered out.
   * @required
   */
  options: ClusterOption[];

  /**
   * Fired whenever the user selects a product within any option group.
   * Receives the full Product object of the chosen option product.
   * Usually used to trigger a price update on the parent page.
   */
  onOptionSelect?: (optionProduct: Product) => void;

  /** Override any UI string. Available keys: required, selectRequired, selectOptional, requiredError */
  labels?: Record<string, string>;

  /** When true, required options with no selection are highlighted with a validation error. */
  showErrors?: boolean;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
/**
 * Flattened render model for one product inside an option dropdown.
 */

/**
 * Flattened render model for one cluster option group, precomputed
 * to avoid calling state methods with arguments inside JSX.
 */

interface ClusterOptionsState {
  selectedProductIds: Record<string, string>;
  getLabel: (key: string, fallback: string) => string;
  formatPrice: (price: number) => string;
  getProductName: (product: Product) => string;
  getProductImageUrl: (product: Product) => string;
  getOptionsForRender: () => RenderedOption[];
  handleOptionChange: (optionIdStr: string, productIdStr: string) => void;
}

function ClusterOptions(props: ClusterOptionsProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<
    ClusterOptionsState['selectedProductIds']
  >(() => ({}));
  function getLabel(key: string, fallback: string): ReturnType<ClusterOptionsState['getLabel']> {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  function formatPrice(price: number): ReturnType<ClusterOptionsState['formatPrice']> {
    return `\u20AC${Number(price).toFixed(2)}`;
  }

  function getProductName(product: Product): ReturnType<ClusterOptionsState['getProductName']> {
    return (product as Product).names?.[0]?.value || `Product ${(product as Product).productId}`;
  }

  function getProductImageUrl(
    product: Product
  ): ReturnType<ClusterOptionsState['getProductImageUrl']> {
    const media = (product as Product).media;
    if (
      media?.images?.items &&
      Array.isArray(media.images.items) &&
      media.images.items.length > 0
    ) {
      const firstImage = media.images.items[0];
      if (firstImage?.imageVariants?.[0]?.url) {
        return firstImage.imageVariants[0].url;
      }
      if ((firstImage as any)?.variants?.[0]?.url) {
        return (firstImage as any).variants[0].url;
      }
    }
    return '';
  }

  function getOptionsForRender(): ReturnType<ClusterOptionsState['getOptionsForRender']> {
    const options = (props.options as ClusterOption[]) || [];
    const sel = selectedProductIds as Record<string, string>;
    return options
      .filter((option: ClusterOption) => option.hidden !== Enums.YesNo.Y)
      .map((option: ClusterOption) => {
        const idStr = option.id.toString();
        const selectedProductId = sel[idStr] || '';
        const products = (option.products || []).map((p: Product) => ({
          productId: p.productId,
          productIdStr: p.productId.toString(),
          label: `${getProductName(p)} \u2014 ${formatPrice(p.price?.gross || 0)}`,
        }));
        let previewImageUrl = '';
        let previewName = '';
        let previewPrice = '';
        if (selectedProductId) {
          const selectedProduct = (option.products || []).find(
            (p: Product) => p.productId.toString() === selectedProductId
          );
          if (selectedProduct) {
            previewImageUrl = getProductImageUrl(selectedProduct);
            previewName = getProductName(selectedProduct);
            previewPrice = formatPrice(selectedProduct.price?.gross || 0);
          }
        }
        const isRequired = option.isRequired === Enums.YesNo.Y;
        return {
          id: option.id,
          idStr,
          name: option.names?.[0]?.value || `Option ${option.id}`,
          isRequired,
          selectedProductId,
          hasSelection: !!selectedProductId,
          hasError: isRequired && !selectedProductId && !!(props.showErrors as boolean),
          previewImageUrl,
          previewName,
          previewPrice,
          products,
        };
      });
  }

  function handleOptionChange(
    optionIdStr: string,
    productIdStr: string
  ): ReturnType<ClusterOptionsState['handleOptionChange']> {
    const newIds: Record<string, string> = {
      ...(selectedProductIds as Record<string, string>),
    };
    if (productIdStr) {
      newIds[optionIdStr] = productIdStr;
    } else {
      delete newIds[optionIdStr];
    }
    setSelectedProductIds(newIds);
    if (productIdStr && props.onOptionSelect) {
      const options = (props.options as ClusterOption[]) || [];
      const option = options.find((o: ClusterOption) => o.id.toString() === optionIdStr);
      const product = (option?.products || []).find(
        (p: Product) => p.productId.toString() === productIdStr
      );
      if (product) {
        props.onOptionSelect(product);
      }
    }
  }

  return (
    <div className={`cluster-options ${props.className || ''}`}>
      {getOptionsForRender().length > 0 ? (
        <div className="cluster-options-content flex flex-col gap-6">
          {getOptionsForRender()?.map((option) => (
            <div className="option-group" key={option.id}>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold text-sm text-gray-700">{option.name}</h4>
                {option.isRequired ? (
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-500/10">
                    {getLabel('required', 'Required')}
                  </span>
                ) : null}
              </div>
              <select
                value={option.selectedProductId}
                onChange={(e) => handleOptionChange(option.idStr, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 cursor-pointer ${option.hasError ? 'border-red-400 focus:ring-red-500' : option.isRequired ? 'border-gray-300 focus:ring-secondary' : 'border-gray-200 focus:ring-secondary'}`}
              >
                <option value="">
                  {option.isRequired ? (
                    <>{getLabel('selectRequired', '— Select an option —')}</>
                  ) : (
                    <>{getLabel('selectOptional', '— None (Optional) —')}</>
                  )}
                </option>
                {option.products?.map((product) => (
                  <option key={product.productId} value={product.productIdStr}>
                    {product.label}
                  </option>
                ))}
              </select>
              {option.hasError ? (
                <p className="mt-1 text-xs text-red-500">
                  {getLabel('requiredError', 'This option is required')}
                </p>
              ) : null}
              {option.hasSelection ? (
                <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  {!!option.previewImageUrl ? (
                    <img
                      className="h-12 w-12 flex-shrink-0 rounded border border-gray-100 bg-white object-contain"
                      src={option.previewImageUrl}
                      alt={option.previewName}
                    />
                  ) : null}
                  {!option.previewImageUrl ? (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100">
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        className="h-5 w-5 text-gray-300"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          strokeWidth={1.5}
                        />
                      </svg>
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {option.previewName}
                    </p>
                    <p className="text-sm font-semibold text-secondary">{option.previewPrice}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ClusterOptions;
