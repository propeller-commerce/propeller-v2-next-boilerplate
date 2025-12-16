'use client';

import { AttributeResult, Cluster, ClusterConfigSetting, LocalizedString, Product } from 'propeller-sdk-v2';
import AttributeSelector from './AttributeSelector';
import { AttributeType } from 'propeller-sdk-v2/dist/enum';
import './ClusterConfigurator.css';

interface ClusterConfiguratorProps {
  cluster: Cluster;
  selectedAttributes: Record<string, string>;
  onAttributeChange: (name: string, value: string, allSelections?: Record<string, string>) => void;
}

export interface SettingWithDisplayName extends ClusterConfigSetting {
  displayName: string;
}

const ClusterConfigurator: React.FC<ClusterConfiguratorProps> = ({
  cluster,
  selectedAttributes,
  onAttributeChange
}) => {
  // Helper function to check if attribute names match
  const attributeNameMatches = (attr: AttributeResult, targetName: string): boolean => {
    const attrName = attr.attributeDescription?.descriptions?.[0]?.value ||
      attr.attributeDescription?.name;

    return attrName === targetName ||
      attr.attributeDescription?.name === targetName ||
      (attr.attributeDescription?.descriptions?.some((desc: LocalizedString) => desc.value === targetName) ?? false);
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
    else if (attr.value?.type == AttributeType.COLOR) {
      extractedValues.push(attr.value?.value);
    } else if (attr.value?.type == AttributeType.TEXT) {
      extractedValues = attr.value?.value?.textValues?.[0]?.values || [];
    } else if (attr.value?.type == AttributeType.DECIMAL) {
      extractedValues.push(attr.value?.value?.toString());
    } else if (attr.value?.type == AttributeType.INT) {
      extractedValues.push(attr.value?.value?.toString());
    } else if (attr.value?.type == AttributeType.ENUM) {
      extractedValues.push(attr.value?.value);
    }
    // Fallback: try to extract from generic object structure
    else if (typeof attr.value === 'string') {
      extractedValues.push(attr.value);
    } else if (attr.value && typeof attr.value === 'object') {
      if ((attr.value as any).values && Array.isArray((attr.value as any).values)) {
        extractedValues = (attr.value as any).values.filter((v: any) => typeof v === 'string');
      } else {
        const possibleValues = Object.values(attr.value).filter(v => typeof v === 'string');
        extractedValues = possibleValues as string[];
      }
    }

    if (!extractedValues)
      return [];

    return extractedValues.filter(val => val); // Remove empty values
  };

  // Get attribute descriptions from first product
  const getAttributeDisplayName = (attributeName: string): string => {
    const clusterProducts = cluster.products;
    if (!clusterProducts || clusterProducts.length === 0) return attributeName;

    const firstProduct = clusterProducts[0];
    const attributeItems = firstProduct.attributes?.items;

    if (Array.isArray(attributeItems)) {
      const matchingAttr = attributeItems.find((attr: AttributeResult) =>
        attributeNameMatches(attr, attributeName)
      );

      if (matchingAttr?.attributeDescription?.descriptions?.[0]?.value) {
        return matchingAttr.attributeDescription.descriptions[0].value;
      }
    }

    return attributeName;
  };

  // Get default value from cluster.defaultProduct for highest priority attribute
  const getDefaultValueForFirstAttribute = (): string | null => {
    if (sortedSettings.length === 0) return null;

    const firstSetting = sortedSettings[0];
    const clusterProducts = cluster.products;
    const defaultProduct = cluster.defaultProduct;

    if (!defaultProduct) return null;

    // Find the default product in the cluster products to get its attributes
    const defaultProductInCluster = clusterProducts?.find((p: Product) =>
      p.productId === defaultProduct.productId
    );

    if (!defaultProductInCluster) return null;

    const attributeItems = defaultProductInCluster.attributes?.items;
    if (!Array.isArray(attributeItems)) return null;

    const matchingAttr = attributeItems.find((attr: AttributeResult) =>
      attributeNameMatches(attr, firstSetting.name)
    );

    if (matchingAttr) {
      const values = extractAttributeValues(matchingAttr);
      return values.length > 0 ? values[0] : null;
    }

    return null;
  };

  // Sort settings by priority (ascending)
  const sortedSettings = (() => {
    if (!cluster.config?.settings) {
      return [];
    }
    const sorted = cluster.config.settings
      .slice()
      .sort((a, b) => parseInt(a.priority) - parseInt(b.priority));

    console.log('Sorted settings by priority:', sorted.map(s => ({
      name: s.name,
      priority: s.priority,
      displayType: s.displayType
    })));

    console.log('Full cluster config:', cluster.config);
    console.log('Full cluster object:', cluster);

    return sorted;
  })();

  // Extract attribute values from cluster products
  const getAttributeValues = (attributeName: string): string[] => {
    const values = new Set<string>();

    console.log(`Extracting values for attribute: ${attributeName}`);
    console.log(`Total products: ${cluster.products?.length || 0}`);

    // Use the actual cluster products structure
    const clusterProducts = cluster.products;
    if (!clusterProducts || clusterProducts.length === 0) {
      console.log('No cluster products available');
      return [];
    }

    console.log('Cluster products structure:', clusterProducts);

    // Log the first product in detail to understand the structure
    if (clusterProducts.length > 0) {
      console.log('First product detailed structure:', {
        product: clusterProducts[0],
        attributes: clusterProducts[0].attributes,
        attributeItems: clusterProducts[0].attributes?.items,
        firstAttributeItem: clusterProducts[0].attributes?.items?.[0]
      });

      if (clusterProducts[0].attributes?.items?.[0]) {
        const firstAttr = clusterProducts[0].attributes.items[0];
        console.log('First attribute detailed:', {
          attributeDescription: firstAttr.attributeDescription,
          descriptions: firstAttr.attributeDescription?.descriptions,
          value: firstAttr.value,
          valueKeys: Object.keys(firstAttr.value || {})
        });
      }
    }

    clusterProducts.forEach((product: Product, productIndex: number) => {
      console.log(`Product ${productIndex}:`, product);

      // Check if attributes exist and have items
      const attributeItems = product.attributes?.items || product.attributes;
      console.log(`Product ${productIndex} attribute items:`, attributeItems);

      if (Array.isArray(attributeItems)) {
        attributeItems.forEach((attr: AttributeResult, attrIndex: number) => {
          // Get attribute name from descriptions
          const attrName = attr.attributeDescription?.descriptions?.[0]?.value ||
            attr.attributeDescription?.name;

          // Try multiple ways to match the attribute name
          const nameMatches = attrName === attributeName ||
            attr.attributeDescription?.name === attributeName ||
            attr.attributeDescription?.descriptions?.some((desc: LocalizedString) => desc.value === attributeName);

          console.log(`  Attribute ${attrIndex}:`, {
            name: attrName,
            configName: attr.attributeDescription?.name,
            descriptions: attr.attributeDescription?.descriptions,
            value: attr.value,
            matches: nameMatches,
            fullAttr: attr
          });

          if (nameMatches) {
            const extractedValues = extractAttributeValues(attr);
            console.log(`    Extracted values: ${extractedValues}`);

            extractedValues.forEach(val => values.add(val));
          }
        });
      } else {
        console.log(`Product ${productIndex} attributes.items is not an array:`, typeof attributeItems);
      }
    });

    const result = Array.from(values);
    console.log(`Final values for ${attributeName}:`, result);
    return result;
  };

  // Get available values for a specific attribute based on current selections (drilldown logic)
  const getAvailableValues = (attributeName: string, settingIndex: number): string[] => {
    console.log(`Getting available values for ${attributeName} at index ${settingIndex}`);

    // For the first attribute (highest priority), all values are available
    if (settingIndex === 0) {
      const allValues = getAttributeValues(attributeName);
      console.log(`First attribute ${attributeName}, all values:`, allValues);
      return allValues;
    }

    // For subsequent attributes, filter based on previous selections
    const availableValues = new Set<string>();

    // Get all previous attribute selections
    const previousSelections: Record<string, string> = {};
    for (let i = 0; i < settingIndex; i++) {
      const prevSetting = sortedSettings[i];
      const prevSelection = selectedAttributes[prevSetting.name];
      if (prevSelection) {
        previousSelections[prevSetting.name] = prevSelection;
      }
    }

    console.log(`Previous selections for ${attributeName}:`, previousSelections);

    // Find products that match all previous selections
    const clusterProducts = cluster.products;
    const matchingProducts = clusterProducts.filter((product: Product) => {
      return Object.entries(previousSelections).every(([attrName, attrValue]) => {
        const attributeItems = product.attributes?.items;

        if (!Array.isArray(attributeItems)) return false;

        return attributeItems.some((attr: AttributeResult) => {
          if (!attributeNameMatches(attr, attrName)) return false;

          const productValues = extractAttributeValues(attr);
          return productValues.includes(attrValue);
        });
      });
    });

    console.log(`Matching products for ${attributeName}:`, matchingProducts.length);

    // Extract available values for current attribute from matching products
    matchingProducts.forEach((product: Product) => {
      const attributeItems = product.attributes?.items;

      if (Array.isArray(attributeItems)) {
        attributeItems.forEach((attr: AttributeResult) => {
          if (attributeNameMatches(attr, attributeName)) {
            const extractedValues = extractAttributeValues(attr);
            extractedValues.forEach(val => availableValues.add(val));
          }
        });
      }
    });

    const result = Array.from(availableValues);
    console.log(`Available values for ${attributeName}:`, result);
    return result;
  };

  // Handle attribute change and clear dependent selections
  const handleAttributeChange = (attributeName: string, value: string) => {
    console.log(`Attribute changed: ${attributeName} = ${value}`);

    // Find the index of the changed attribute
    const changedIndex = sortedSettings.findIndex(setting => setting.name === attributeName);
    console.log(`Changed attribute index: ${changedIndex}`);

    // Create new selections object with the changed attribute and cleared subsequent ones
    const newSelections = { ...selectedAttributes };
    newSelections[attributeName] = value;

    // Clear subsequent selections (drilldown effect)
    const clearedAttributes: string[] = [];
    for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
      const subsequentSetting = sortedSettings[i];
      delete newSelections[subsequentSetting.name];
      clearedAttributes.push(subsequentSetting.name);
    }

    console.log(`Cleared subsequent attributes:`, clearedAttributes);
    console.log(`New selections:`, newSelections);

    // Pass the complete new selections to parent
    onAttributeChange(attributeName, value, newSelections);
  };

  if (!cluster.config?.settings || cluster.config.settings.length === 0) {
    return null;
  }

  return (
    <div className="cluster-configurator">
      <div className="configurator-content">
        {sortedSettings.map((setting, index) => {
          const availableValues = getAvailableValues(setting.name, index);
          let selectedValue = selectedAttributes[setting.name] || null;

          // For the first attribute (highest priority), use default value if no selection
          if (index === 0 && !selectedValue) {
            const defaultValue = getDefaultValueForFirstAttribute();
            if (defaultValue && availableValues.includes(defaultValue)) {
              selectedValue = defaultValue;
              // Auto-select the default value
              setTimeout(() => {
                handleAttributeChange(setting.name, defaultValue);
              }, 0);
            }
          }

          // Disable if no available values or if previous required selections are missing
          const isPreviousSelectionMissing = index > 0 &&
            sortedSettings.slice(0, index).some(prevSetting =>
              !selectedAttributes[prevSetting.name]
            );
          const isDisabled = availableValues.length === 0 || isPreviousSelectionMissing;

          // Get display name from first product attributes
          const displayName = getAttributeDisplayName(setting.name);

          // Debug logging
          console.log(`Attribute ${setting.name} (index ${index}):`, {
            availableValues,
            selectedValue,
            displayName,
            isPreviousSelectionMissing,
            isDisabled,
            previousSelections: sortedSettings.slice(0, index).map(s => ({
              name: s.name,
              selected: selectedAttributes[s.name]
            }))
          });

          const settingWithDisplayName = {
            ...setting,
            displayName
          } as SettingWithDisplayName;

          return (
            <AttributeSelector
              key={setting.id}
              setting={settingWithDisplayName}
              availableValues={availableValues}
              selectedValue={selectedValue}
              disabled={isDisabled}
              onChange={(value) => handleAttributeChange(setting.name, value)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ClusterConfigurator;
