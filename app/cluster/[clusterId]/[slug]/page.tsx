'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ClusterConfigurator from '@/components/specific/ClusterConfigurator';
import ClusterOptionsSelector from '@/components/specific/ClusterOptionsSelector';
import { AttributeResult, Cluster, ClusterConfigSetting, Product } from 'propeller-sdk-v2';
import { ClusterQueryVariables } from 'propeller-sdk-v2/dist/service/ClusterService';
import { imageSearchFiltersGrid, imageVariantFiltersMedium } from '@/data/defaults';
import { graphqlClient } from '@/lib/api';
import { ClusterService } from 'propeller-sdk-v2';
import { useCart } from '@/context/CartContext';

const clusterService = new ClusterService(graphqlClient);

export default function ClusterPage() {
  const params = useParams();
  const clusterId = parseInt(params.clusterId as string);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();

  // Helper function to check if attribute names match
  const attributeNameMatches = (attr: AttributeResult, targetName: string): boolean => {
    const attrName = attr.attributeDescription?.descriptions?.[0]?.value ||
      attr.attributeDescription?.name;

    return attrName === targetName ||
      attr.attributeDescription?.name === targetName ||
      (attr.attributeDescription?.descriptions?.some((desc: any) => desc.value === targetName) ?? false);
  };

  // Helper function to extract values from attribute
  const extractAttributeValues = (attr: AttributeResult): string[] => {
    let extractedValues: string[] = [];

    // Try old SDK format first (legacy support)
    if ((attr.value as any)?.colorValue) {
      extractedValues.push((attr.value as any).colorValue);
    } else if ((attr.value as any)?.textValues?.[0]?.values) {
      extractedValues = (attr.value as any).textValues[0].values;
    } else if ((attr.value as any)?.textValue) {
      extractedValues.push((attr.value as any).textValue);
    } else if ((attr.value as any)?.numericValue !== undefined) {
      extractedValues.push((attr.value as any).numericValue.toString());
    } else if ((attr.value as any)?.booleanValue !== undefined) {
      extractedValues.push((attr.value as any).booleanValue ? 'Yes' : 'No');
    }
    // New SDK format (type-based)
    else if (typeof attr.value === 'string') {
      extractedValues.push(attr.value);
    } else if (attr.value && typeof attr.value === 'object') {
      if ((attr.value as any).values && Array.isArray((attr.value as any).values)) {
        extractedValues = (attr.value as any).values.filter((v: unknown) => typeof v === 'string');
      } else {
        const possibleValues = Object.values(attr.value).filter(v => typeof v === 'string');
        extractedValues = possibleValues as string[];
      }
    }

    return extractedValues.filter(val => val);
  };

  // Find matching product based on selected attributes
  const matchingProduct = useMemo(() => {
    if (!cluster?.products || Object.keys(selectedAttributes).length === 0) {
      return null;
    }

    const foundProduct = cluster.products.find((product: Product) => {
      const attributeItems = product.attributes?.items || product.attributes;

      if (!Array.isArray(attributeItems)) return false;

      return Object.entries(selectedAttributes).every(([attrName, attrValue]) => {
        return attributeItems.some((attr: AttributeResult) => {
          if (!attributeNameMatches(attr, attrName)) return false;

          const productValues = extractAttributeValues(attr);
          return productValues.includes(attrValue);
        });
      });
    }) as Product || null;

    console.log('Matching product for attributes:', selectedAttributes, 'Found:', foundProduct);
    return foundProduct;
  }, [cluster, selectedAttributes]);

  // Calculate total price including selected options
  const totalPrice = useMemo(() => {
    const displayProduct = selectedProduct || cluster?.defaultProduct;
    const basePrice = displayProduct?.price?.gross || 0;
    let total = basePrice;

    // Add prices of selected options
    if (cluster?.options && Object.keys(selectedOptions).length > 0) {
      Object.entries(selectedOptions).forEach(([optionId, productId]) => {
        if (!productId) return;

        const option = cluster.options?.find(opt => opt.id.toString() === optionId);
        if (option?.products) {
          const selectedOptionProduct = option.products.find(
            p => p.productId.toString() === productId
          );
          if (selectedOptionProduct?.price?.gross) {
            total += selectedOptionProduct.price.gross;
          }
        }
      });
    }

    return total;
  }, [selectedProduct, cluster, selectedOptions]);

  useEffect(() => {
    const fetchCluster = async () => {
      setLoading(true);
      try {
        const clusterConfig = await clusterService.getClusterConfig(clusterId);
        console.log(clusterConfig);

        const clusterAttributesNames = clusterConfig?.config?.settings?.map((setting: ClusterConfigSetting) => setting.name) || [];

        const variables: ClusterQueryVariables = {
          clusterId,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          imageSearchFilters: imageSearchFiltersGrid,
          imageVariantFilters: imageVariantFiltersMedium,
          attributeResultSearchInput: {
            attributeDescription: {
              names: clusterAttributesNames
            }
          }
        };

        const data = await clusterService.getCluster(variables);
        setCluster(data);

        // Set default product as initially selected
        if (data.defaultProduct) {
          setSelectedProduct(data.defaultProduct as Product);
        }
      } catch (error) {
        console.error('Failed to load cluster:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCluster();
  }, [clusterId]);

  // Update selected product when attributes change
  useEffect(() => {
    if (matchingProduct) {
      console.log('Updating selected product to:', matchingProduct);
      setSelectedProduct(matchingProduct);
    }
  }, [matchingProduct]);

  const handleAttributeChange = (name: string, value: string, allSelections?: Record<string, string>) => {
    if (allSelections) {
      setSelectedAttributes(allSelections);
    } else {
      setSelectedAttributes(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionId]: valueId
    }));
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    // Collect child items (options)
    const childItems: { productId: number; quantity: number }[] = [];

    if (cluster?.options && Object.keys(selectedOptions).length > 0) {
      for (const [optionId, productId] of Object.entries(selectedOptions)) {
        if (!productId) continue;

        const option = cluster.options.find(opt => opt.id.toString() === optionId);
        const optionProduct = option?.products?.find(p => p.productId.toString() === productId);

        if (optionProduct) {
          childItems.push({
            productId: optionProduct.productId,
            quantity: quantity // Use same quantity as main product for now, or 1 if per-unit. Assuming 1-to-1 or same quantity multiplier.
          });
        }
      }
    }

    // Add main product with options as child items
    const mainProductName = selectedProduct.names?.[0]?.value || cluster?.names?.[0]?.value || 'Product';

    await addToCart(
      selectedProduct.productId,
      quantity,
      mainProductName,
      clusterId, // Pass clusterId
      childItems.length > 0 ? childItems : undefined // Pass childItems if any
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12">
          <div className="container-width">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 animate-pulse">
              <div className="space-y-4">
                <div className="aspect-square bg-slate-100 rounded-xl" />
                <div className="flex gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-20 h-20 bg-slate-100 rounded-lg" />
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-4 bg-slate-100 rounded w-1/4" />
                <div className="h-10 bg-slate-100 rounded w-3/4" />
                <div className="h-8 bg-slate-100 rounded w-1/3" />
                <div className="h-24 bg-slate-100 rounded" />
                <div className="h-16 bg-slate-100 rounded" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!cluster) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-12">
          <div className="container-width">
            <h1 className="text-3xl font-bold mb-6">Cluster Not Found</h1>
            <p className="text-muted-foreground">Unable to load cluster data.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const clusterName = cluster.names?.[0]?.value || 'Cluster';
  const displayProduct = selectedProduct || cluster.defaultProduct;
  const imageUrl = displayProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '/no-image.webp';
  const sku = displayProduct?.sku || '';


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-12">
        <div className="container-width">
          {/* Breadcrumb */}
          <div className="mb-6 text-sm text-gray-600">
            <span>Home</span> / <span>Clusters</span> / <span className="text-gray-900">{clusterName}</span>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left: Image Gallery */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="relative w-full h-96 mb-4">
                <Image
                  src={imageUrl}
                  alt={clusterName}
                  fill
                  className="object-contain"
                />
              </div>

              {/* Thumbnail gallery */}
              <div className="flex gap-2 overflow-x-auto">
                {displayProduct?.media?.images?.items?.slice(0, 5).map((img, index) => (
                  <div key={index} className="relative w-20 h-20 flex-shrink-0 border rounded cursor-pointer hover:border-blue-600">
                    <Image
                      src={img.imageVariants?.[0]?.url || imageUrl}
                      alt={`${clusterName} ${index + 1}`}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Product Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-3xl font-bold mb-2">{clusterName}</h1>
              <p className="text-gray-600 mb-4">SKU: {sku}</p>

              <div className="text-4xl font-bold text-blue-600 mb-6">
                €{totalPrice.toFixed(2)}
              </div>

              {/* Short Description */}
              {displayProduct?.shortDescriptions?.[0]?.value && (
                <div className="mb-6 text-gray-700">
                  {displayProduct.shortDescriptions[0].value}
                </div>
              )}

              {/* Cluster Configurator */}
              {cluster.products && cluster.products.length > 1 && (
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <ClusterConfigurator
                    cluster={cluster}
                    selectedAttributes={selectedAttributes}
                    onAttributeChange={handleAttributeChange}
                  />
                </div>
              )}

              {/* Cluster Options */}
              {cluster.options && cluster.options.length > 0 && (
                <div className="mb-6">
                  <ClusterOptionsSelector
                    options={cluster.options}
                    selectedOptions={selectedOptions}
                    onOptionChange={handleOptionChange}
                  />
                </div>
              )}

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block font-semibold mb-2">Quantity:</label>
                <div className="flex items-center border border-gray-200 rounded-lg w-32">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-gray-100"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-center border-x border-gray-200"
                    min="1"
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart Button */}
              <button
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleAddToCart}
                disabled={!selectedProduct}
              >
                {selectedProduct ? 'Add to Cart' : 'Select Options'}
              </button>
            </div>
          </div>

          {/* Product Tabs - Description, Specifications, etc. */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-8">
                <button className="pb-4 border-b-2 border-blue-600 font-semibold text-blue-600">
                  Description
                </button>
                <button className="pb-4 border-b-2 border-transparent font-semibold text-gray-600 hover:text-gray-900">
                  Specifications
                </button>
              </div>
            </div>

            {/* Description Content */}
            <div className="prose max-w-none">
              {displayProduct?.descriptions?.[0]?.value ? (
                <div dangerouslySetInnerHTML={{ __html: displayProduct.descriptions[0].value }} />
              ) : (
                <p className="text-gray-600">No description available.</p>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
