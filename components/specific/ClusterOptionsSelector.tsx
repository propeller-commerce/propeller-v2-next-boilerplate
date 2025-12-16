'use client';

import { ClusterOption, Enums, Product } from 'propeller-sdk-v2';
import './ClusterOptionsSelector.css';

interface ClusterOptionsSelectorProps {
  options: ClusterOption[];
  selectedOptions: Record<string, string>;
  onOptionChange: (optionId: string, productId: string) => void;
}

const ClusterOptionsSelector: React.FC<ClusterOptionsSelectorProps> = ({
  options,
  selectedOptions,
  onOptionChange
}) => {
  // Filter out hidden options
  const visibleOptions = options.filter(option => option.hidden !== Enums.YesNo.Y);

  if (visibleOptions.length === 0) {
    return null;
  }

  // Get product display name
  const getProductDisplayName = (product: Product): string => {
    return product.names?.[0]?.value || `Product ${product.productId}`;
  };

  // Get product image URL
  const getProductImageUrl = (product: Product): string => {
    // Try to get image from product media
    const productMedia = product.media;
    if (productMedia?.images?.items && Array.isArray(productMedia.images.items) && productMedia.images.items.length > 0) {
      const firstImage = productMedia.images.items[0];
      // Try imageVariants first (new SDK), then variants (old SDK)
      if (firstImage?.imageVariants?.[0]?.url) {
        return firstImage.imageVariants[0].url;
      } else if ((firstImage as any)?.variants?.[0]?.url) {
        return (firstImage as any).variants[0].url;
      }
    }

    // Fallback to no-image placeholder
    return '/no-image.webp';
  };

  // Format price
  const formatPrice = (price: number): string => {
    return `€${price.toFixed(2)}`;
  };

  return (
    <div className="cluster-options-selector">
      <h3 className="options-title">Additional Options</h3>
      <div className="options-content">
        {visibleOptions.map((option) => {
          const isRequired = option.isRequired === Enums.YesNo.Y;
          const selectedProductId = selectedOptions[option.id.toString()] || '';

          return (
            <div key={option.id} className="option-group">
              <div className="option-header">
                <h4 className="option-name">
                  {option.names?.[0]?.value || `Option ${option.id}`}
                  {isRequired && <span className="required-indicator">*</span>}
                </h4>
                {isRequired && (
                  <span className="required-label">Required</span>
                )}
              </div>

              <select
                value={selectedProductId}
                onChange={(e) => onOptionChange(option.id.toString(), e.target.value)}
                className={`option-dropdown ${isRequired ? 'required' : ''}`}
                required={isRequired}
              >
                <option value="">
                  {isRequired ? 'Please select an option' : 'None (Optional)'}
                </option>
                {option.products?.map((product) => (
                  <option key={product.productId} value={product.productId.toString()}>
                    {getProductDisplayName(product)} - {formatPrice(product.price?.gross || 0)}
                  </option>
                ))}
              </select>

              {/* Product preview for selected option */}
              {selectedProductId && (
                <div className="selected-product-preview">
                  {(() => {
                    const selectedProduct = option.products?.find(
                      p => p.productId.toString() === selectedProductId
                    );
                    if (!selectedProduct) return null;

                    return (
                      <div className="product-preview">
                        <img
                          src={getProductImageUrl(selectedProduct)}
                          alt={getProductDisplayName(selectedProduct)}
                          className="product-preview-image"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            // Only try to load fallback once
                            if (!target.dataset.errorHandled) {
                              target.dataset.errorHandled = 'true';
                              target.src = '/no-image.webp';
                            }
                          }}
                        />
                        <div className="product-preview-info">
                          <span className="product-preview-name">
                            {getProductDisplayName(selectedProduct)}
                          </span>
                          <span className="product-preview-price">
                            {formatPrice(selectedProduct.price?.gross || 0)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClusterOptionsSelector;