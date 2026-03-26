'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  Product,
  AttributeResult,
  ClusterConfig,
  ClusterConfigSetting,
  Enums,
} from 'propeller-sdk-v2';

/**
 * A computed object containing a cluster config setting enriched with
 * its current UI state: available values for drilldown, the currently
 * selected value, and whether the selector should be disabled.
 */
interface ConfiguredSetting {
  id: number;
  name: string;
  /** String representation of ClusterConfigSettingDisplayType */
  displayType: string;
  priority: string;
  displayName: string;
  availableValues: string[];
  selectedValue: string;
  disabled: boolean;
}
/**
 * A computed object containing a cluster config setting enriched with
 * its current UI state: available values for drilldown, the currently
 * selected value, and whether the selector should be disabled.
 */

export interface ClusterConfiguratorProps {
  /**
   * The cluster ID this configurator belongs to.
   * @required
   */
  clusterId: number;

  /**
   * All products that belong to the cluster.
   * Used to derive available values per attribute and to match
   * the configured product when all selections are made.
   * @required
   */
  products: Product[];

  /**
   * Cluster configuration object (cluster.config).
   * Provides the ordered list of attribute settings.
   * @required
   */
  config: ClusterConfig;

  /**
   * Fired whenever the user completes a set of attribute selections
   * that uniquely identifies a cluster product.
   * Also fired whenever any selection changes and a matching product
   * can already be determined (e.g. only one setting exists).
   */
  onConfigurationChange?: (product: Product) => void;

  /** Default product to pre-populate the attribute selections on mount. */
  defaultProduct?: Product;

  /** Override any UI string. Available keys: selectOption */
  labels?: Record<string, string>;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
/**
 * A computed object containing a cluster config setting enriched with
 * its current UI state: available values for drilldown, the currently
 * selected value, and whether the selector should be disabled.
 */

interface ClusterConfiguratorState {
  /** Current user selections: { [attributeName]: selectedValue } */
  selectedAttributes: Record<string, string>;
  getLabel: (key: string, fallback: string) => string;

  /**
   * Returns the cluster config settings sorted ascending by priority.
   */
  getSortedSettings: () => ClusterConfigSetting[];

  /**
   * Checks whether an AttributeResult matches a given target name,
   * looking at the SDK name field and all localised descriptions.
   */
  attributeNameMatches: (attr: AttributeResult, targetName: string) => boolean;

  /**
   * Extracts string values from an AttributeResult, supporting both
   * the legacy Propeller SDK format and the current type-based format.
   */
  extractAttributeValues: (attr: AttributeResult) => string[];

  /**
   * Returns the localised display name for an attribute by looking up
   * the matching attribute on the first product in the list.
   */
  getAttributeDisplayName: (attributeName: string) => string;

  /**
   * Returns all unique values for a given attribute name across all products.
   */
  getAttributeValues: (attributeName: string) => string[];

  /**
   * Returns the available values for a given attribute at a specific
   * position in the sorted settings list, filtered by all prior selections
   * (drilldown logic). For the first attribute (index 0) all values are returned.
   */
  getAvailableValuesForIndex: (attributeName: string, settingIndex: number) => string[];

  /** Same as getAvailableValuesForIndex but uses explicit selections instead of state. */
  getAvailableValuesForIndexWithSelections: (
    attributeName: string,
    settingIndex: number,
    selections: Record<string, string>
  ) => string[];

  /**
   * Computes a derived list of ConfiguredSetting objects ready for rendering,
   * including available values, selected value and disabled state for each setting.
   */
  getSettingsWithValues: () => ConfiguredSetting[];

  /**
   * Finds the first product whose attributes match all key/value pairs in
   * the given selections object.
   */
  findMatchingProduct: (selections: Record<string, string>) => Product | null;

  /**
   * Handles a selection change for one attribute:
   * - Updates selectedAttributes (sets the new value, clears all subsequent ones).
   * - If all settings now have a selection, finds the matching product and calls
   *   props.onConfigurationChange with it.
   */
  handleAttributeSelect: (settingName: string, value: string) => void;
}

function ClusterConfigurator(props: ClusterConfiguratorProps) {
  const [selectedAttributes, setSelectedAttributes] = useState<
    ClusterConfiguratorState['selectedAttributes']
  >(() => ({}));
  function getLabel(
    key: string,
    fallback: string
  ): ReturnType<ClusterConfiguratorState['getLabel']> {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  function getSortedSettings(): ReturnType<ClusterConfiguratorState['getSortedSettings']> {
    const settings = (props.config as ClusterConfig)?.settings;
    if (!settings || settings.length === 0) return [];
    return settings
      .slice()
      .sort(
        (a: ClusterConfigSetting, b: ClusterConfigSetting) =>
          parseInt(a.priority) - parseInt(b.priority)
      );
  }

  function attributeNameMatches(
    attr: AttributeResult,
    targetName: string
  ): ReturnType<ClusterConfiguratorState['attributeNameMatches']> {
    const attrName =
      attr.attributeDescription?.descriptions?.[0]?.value || attr.attributeDescription?.name;
    return (
      attrName === targetName ||
      attr.attributeDescription?.name === targetName ||
      (attr.attributeDescription?.descriptions?.some((desc: any) => desc.value === targetName) ??
        false)
    );
  }

  function extractAttributeValues(
    attr: AttributeResult
  ): ReturnType<ClusterConfiguratorState['extractAttributeValues']> {
    let extractedValues: string[] = [];

    // ── Legacy SDK format ────────────────────────────────────────────
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
    // ── Current SDK format (type-based) ──────────────────────────────
    else if (attr.value?.type === Enums.AttributeType.COLOR) {
      extractedValues.push(attr.value?.value);
    } else if (attr.value?.type === Enums.AttributeType.TEXT) {
      extractedValues = attr.value?.value?.textValues?.[0]?.values || [];
    } else if (attr.value?.type === Enums.AttributeType.DECIMAL) {
      extractedValues.push(attr.value?.value?.toString());
    } else if (attr.value?.type === Enums.AttributeType.INT) {
      extractedValues.push(attr.value?.value?.toString());
    } else if (attr.value?.type === Enums.AttributeType.ENUM) {
      extractedValues.push(attr.value?.value);
    }
    // ── Fallback ─────────────────────────────────────────────────────
    else if (typeof attr.value === 'string') {
      extractedValues.push(attr.value);
    } else if (attr.value && typeof attr.value === 'object') {
      if ((attr.value as any).values && Array.isArray((attr.value as any).values)) {
        extractedValues = (attr.value as any).values.filter((v: any) => typeof v === 'string');
      } else {
        const possibleValues = Object.values(attr.value).filter((v: any) => typeof v === 'string');
        extractedValues = possibleValues as string[];
      }
    }
    return extractedValues.filter((val: string) => !!val);
  }

  function getAttributeDisplayName(
    attributeName: string
  ): ReturnType<ClusterConfiguratorState['getAttributeDisplayName']> {
    const products = (props.products as Product[]) || [];
    if (products.length === 0) return attributeName;
    const firstProduct = products[0];
    const attributeItems = firstProduct.attributes?.items;
    if (Array.isArray(attributeItems)) {
      const matchingAttr = (attributeItems as AttributeResult[]).find((attr: AttributeResult) =>
        attributeNameMatches(attr, attributeName)
      );
      if (matchingAttr?.attributeDescription?.descriptions?.[0]?.value) {
        return matchingAttr.attributeDescription.descriptions[0].value;
      }
    }
    return attributeName;
  }

  function getAttributeValues(
    attributeName: string
  ): ReturnType<ClusterConfiguratorState['getAttributeValues']> {
    const valSet = new Set<string>();
    const products = (props.products as Product[]) || [];
    products.forEach((product: Product) => {
      const attributeItems = product.attributes?.items;
      if (Array.isArray(attributeItems)) {
        (attributeItems as AttributeResult[]).forEach((attr: AttributeResult) => {
          if (attributeNameMatches(attr, attributeName)) {
            const extracted = extractAttributeValues(attr);
            extracted.forEach((val: string) => valSet.add(val));
          }
        });
      }
    });
    return Array.from(valSet);
  }

  function getAvailableValuesForIndex(
    attributeName: string,
    settingIndex: number
  ): ReturnType<ClusterConfiguratorState['getAvailableValuesForIndex']> {
    return getAvailableValuesForIndexWithSelections(
      attributeName,
      settingIndex,
      selectedAttributes as Record<string, string>
    );
  }

  function getAvailableValuesForIndexWithSelections(
    attributeName: string,
    settingIndex: number,
    selections: Record<string, string>
  ): ReturnType<ClusterConfiguratorState['getAvailableValuesForIndexWithSelections']> {
    if (settingIndex === 0) {
      return getAttributeValues(attributeName);
    }
    const sortedSettings = getSortedSettings();
    const previousSelections: Record<string, string> = {};
    for (let i = 0; i < settingIndex; i++) {
      const prevSetting = sortedSettings[i];
      if (selections[prevSetting.name]) {
        previousSelections[prevSetting.name] = selections[prevSetting.name];
      }
    }
    const products = (props.products as Product[]) || [];
    const prevEntries = Object.entries(previousSelections);
    const matchingProducts = products.filter((product: Product) => {
      return prevEntries.every(([attrName, attrValue]: [string, string]) => {
        const attributeItems = product.attributes?.items;
        if (!Array.isArray(attributeItems)) return false;
        return (attributeItems as AttributeResult[]).some((attr: AttributeResult) => {
          if (!attributeNameMatches(attr, attrName)) return false;
          return extractAttributeValues(attr).includes(attrValue);
        });
      });
    });
    const availableSet = new Set<string>();
    matchingProducts.forEach((product: Product) => {
      const attributeItems = product.attributes?.items;
      if (Array.isArray(attributeItems)) {
        (attributeItems as AttributeResult[]).forEach((attr: AttributeResult) => {
          if (attributeNameMatches(attr, attributeName)) {
            extractAttributeValues(attr).forEach((val: string) => availableSet.add(val));
          }
        });
      }
    });
    return Array.from(availableSet);
  }

  function getSettingsWithValues(): ReturnType<ClusterConfiguratorState['getSettingsWithValues']> {
    const sortedSettings = getSortedSettings();
    const sel = selectedAttributes as Record<string, string>;
    return sortedSettings.map((setting: ClusterConfigSetting, index: number) => {
      const availableValues = getAvailableValuesForIndex(setting.name, index);
      const selectedValue = sel[setting.name] || '';
      const isPreviousSelectionMissing =
        index > 0 &&
        sortedSettings.slice(0, index).some((prev: ClusterConfigSetting) => !sel[prev.name]);
      const isDisabled = availableValues.length === 0 || isPreviousSelectionMissing;
      const displayName = getAttributeDisplayName(setting.name);
      return {
        id: setting.id,
        name: setting.name,
        displayType: setting.displayType as string,
        priority: setting.priority,
        displayName,
        availableValues,
        selectedValue,
        disabled: isDisabled,
      };
    });
  }

  function findMatchingProduct(
    selections: Record<string, string>
  ): ReturnType<ClusterConfiguratorState['findMatchingProduct']> {
    const products = (props.products as Product[]) || [];
    const entries = Object.entries(selections);
    if (entries.length === 0) return null;
    const found = products.find((product: Product) => {
      const attrItems = product.attributes?.items;
      if (!Array.isArray(attrItems)) return false;
      return entries.every(([attrName, attrValue]: [string, string]) => {
        return (attrItems as AttributeResult[]).some((attr: AttributeResult) => {
          if (!attributeNameMatches(attr, attrName)) return false;
          const productValues = extractAttributeValues(attr);
          return productValues.includes(attrValue);
        });
      });
    });
    return found || null;
  }

  function handleAttributeSelect(
    settingName: string,
    value: string
  ): ReturnType<ClusterConfiguratorState['handleAttributeSelect']> {
    const sortedSettings = getSortedSettings();
    const changedIndex = sortedSettings.findIndex(
      (s: ClusterConfigSetting) => s.name === settingName
    );

    // Build new selections: keep, update changed, remove subsequent
    const newSelections: Record<string, string> = {
      ...(selectedAttributes as Record<string, string>),
    };
    newSelections[settingName] = value;
    for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
      delete newSelections[sortedSettings[i].name];
    }

    // Always pre-select the first available value for all subsequent settings
    for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
      const nextSetting = sortedSettings[i];
      const available = getAvailableValuesForIndexWithSelections(
        nextSetting.name,
        i,
        newSelections
      );
      if (available.length > 0) {
        newSelections[nextSetting.name] = available[0];
      } else {
        break;
      }
    }
    setSelectedAttributes(newSelections);

    // When all settings have a selection, resolve and report the product
    const allSelected = sortedSettings.every((s: ClusterConfigSetting) => !!newSelections[s.name]);
    if (allSelected) {
      const matchingProduct = findMatchingProduct(newSelections);
      if (matchingProduct && props.onConfigurationChange) {
        props.onConfigurationChange(matchingProduct);
      }
    }
  }

  useEffect(() => {
    const defaultProduct = props.defaultProduct as Product;
    if (!defaultProduct) return;
    const sortedSettings = getSortedSettings();
    if (sortedSettings.length === 0) return;
    const initial: Record<string, string> = {};
    sortedSettings.forEach((setting: ClusterConfigSetting) => {
      const attrItems = defaultProduct.attributes?.items;
      if (!Array.isArray(attrItems)) return;
      const matchingAttr = (attrItems as AttributeResult[]).find((attr: AttributeResult) =>
        attributeNameMatches(attr, setting.name)
      );
      if (matchingAttr) {
        const values = extractAttributeValues(matchingAttr);
        if (values.length > 0) {
          initial[setting.name] = values[0];
        }
      }
    });
    if (Object.keys(initial).length === 0) return;
    setSelectedAttributes(initial);
    const allSelected = sortedSettings.every((s: ClusterConfigSetting) => !!initial[s.name]);
    if (allSelected && props.onConfigurationChange) {
      const matchingProduct = findMatchingProduct(initial);
      if (matchingProduct) {
        props.onConfigurationChange(matchingProduct);
      }
    }
  }, []);
  return (
    <div className={`cluster-configurator ${props.className || ''}`}>
      {!!(props.config as ClusterConfig)?.settings?.length ? (
        <div className="configurator-content flex flex-col gap-6">
          {getSettingsWithValues()?.map((setting) => (
            <div className="attribute-group" key={setting.id}>
              <h4 className="font-semibold text-sm text-gray-700 mb-3">
                {setting.displayName || setting.name}
              </h4>
              {setting.displayType === 'DROPDOWN' ? (
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
                  value={setting.selectedValue}
                  disabled={setting.disabled}
                  onChange={(e) => handleAttributeSelect(setting.name, e.target.value)}
                >
                  <option value="">{getLabel('selectOption', '— Select —')}</option>
                  {setting.availableValues?.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              ) : null}
              {setting.displayType === 'RADIO' ? (
                <div className="flex flex-wrap gap-2">
                  {setting.availableValues?.map((val) => (
                    <label
                      key={val}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors select-none ${setting.disabled ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400' : setting.selectedValue === val ? 'border-secondary bg-secondary/5 text-secondary cursor-pointer' : 'border-gray-200 text-gray-700 hover:border-secondary/30 cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`cluster-${props.clusterId}-${setting.name}`}
                        value={val}
                        checked={setting.selectedValue === val}
                        disabled={setting.disabled}
                        onChange={(event) => handleAttributeSelect(setting.name, val)}
                      />
                      {val}
                    </label>
                  ))}
                </div>
              ) : null}
              {setting.displayType === 'COLOR' ? (
                <div className="flex flex-wrap gap-2">
                  {setting.availableValues?.map((val) => (
                    <button
                      type="button"
                      key={val}
                      title={val}
                      disabled={setting.disabled}
                      onClick={(event) => handleAttributeSelect(setting.name, val)}
                      style={{
                        backgroundColor: val,
                      }}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${setting.selectedValue === val ? 'border-secondary ring-2 ring-secondary/30 ring-offset-1 scale-110' : 'border-gray-300 hover:scale-105'}`}
                    />
                  ))}
                </div>
              ) : null}
              {setting.displayType === 'IMAGE' ? (
                <div className="flex flex-wrap gap-3">
                  {setting.availableValues?.map((val) => (
                    <button
                      type="button"
                      key={val}
                      disabled={setting.disabled}
                      onClick={(event) => handleAttributeSelect(setting.name, val)}
                      className={`relative w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${setting.selectedValue === val ? 'border-secondary ring-2 ring-secondary/30 ring-offset-1' : 'border-gray-200 hover:border-secondary/30'}`}
                    >
                      <img className="w-full h-full object-cover" src={val} alt={val} />
                      {setting.selectedValue === val ? (
                        <div className="absolute inset-0 bg-secondary bg-opacity-20 flex items-center justify-center">
                          <svg
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            className="w-5 h-5 text-secondary"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {setting.displayType !== 'DROPDOWN' &&
              setting.displayType !== 'RADIO' &&
              setting.displayType !== 'COLOR' &&
              setting.displayType !== 'IMAGE' ? (
                <div className="flex flex-wrap gap-2">
                  {setting.availableValues?.map((val) => (
                    <button
                      type="button"
                      key={val}
                      disabled={setting.disabled}
                      onClick={(event) => handleAttributeSelect(setting.name, val)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${setting.disabled ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400' : setting.selectedValue === val ? 'border-secondary bg-secondary/5 text-secondary cursor-pointer' : 'border-gray-200 text-gray-700 hover:border-secondary/30 cursor-pointer'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ClusterConfigurator;
