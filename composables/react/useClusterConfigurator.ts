/**
 * useClusterConfigurator (React) — Cascading attribute selection state machine.
 *
 * React mirror of vue/useClusterConfigurator.ts.
 */

import { useState, useMemo, useCallback } from 'react';
import type { Product, AttributeResult, ClusterConfig, ClusterConfigSetting } from 'propeller-sdk-v2';
import {
  attributeNameMatches,
  extractAttributeValues,
  filterProductsBySelections,
  collectAttributeValues,
  getAttributeDisplayName,
} from '../shared/utils/attributeExtractor';

export interface ConfiguredSetting {
  id: number;
  name: string;
  displayType: string;
  priority: string;
  displayName: string;
  availableValues: string[];
  selectedValue: string;
  disabled: boolean;
}

export interface UseClusterConfiguratorOptions {
  products: Product[];
  config: ClusterConfig;
  language?: string;
  onConfigurationChange?: (product: Product) => void;
}

export interface UseClusterConfiguratorReturn {
  selectedAttributes: Record<string, string>;
  settingsWithValues: ConfiguredSetting[];
  handleAttributeSelect: (settingName: string, value: string) => void;
  initFromProduct: (product: Product) => void;
  reset: () => void;
}

export function useClusterConfigurator(
  options: UseClusterConfiguratorOptions
): UseClusterConfiguratorReturn {
  const { products, config, language = 'NL', onConfigurationChange } = options;

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  function getSortedSettings(): ClusterConfigSetting[] {
    const settings = config?.settings;
    if (!settings?.length) return [];
    return settings.slice().sort((a, b) => parseInt(a.priority) - parseInt(b.priority));
  }

  function getAvailableValuesForIndexWithSelections(
    attributeName: string,
    settingIndex: number,
    selections: Record<string, string>
  ): string[] {
    if (settingIndex === 0) return collectAttributeValues(products, attributeName);
    const sortedSettings = getSortedSettings();
    const previousSelections: Record<string, string> = {};
    for (let i = 0; i < settingIndex; i++) {
      const prev = sortedSettings[i];
      if (selections[prev.name]) previousSelections[prev.name] = selections[prev.name];
    }
    const matching = filterProductsBySelections(products, previousSelections);
    return collectAttributeValues(matching, attributeName);
  }

  const settingsWithValues = useMemo<ConfiguredSetting[]>(() => {
    const sortedSettings = getSortedSettings();
    const sel = selectedAttributes;
    return sortedSettings.map((setting, index) => {
      const availableValues = getAvailableValuesForIndexWithSelections(setting.name, index, sel);
      const selectedValue = sel[setting.name] || '';
      const isPreviousMissing = index > 0 && sortedSettings.slice(0, index).some((prev) => !sel[prev.name]);
      const isDisabled = availableValues.length === 0 || isPreviousMissing;
      let displayName = setting.name;
      const firstProduct = products[0];
      if (firstProduct) {
        const items = firstProduct.attributes?.items as AttributeResult[] | undefined;
        if (items) {
          const match = items.find((a) => attributeNameMatches(a, setting.name));
          if (match) displayName = getAttributeDisplayName(match, language) || setting.name;
        }
      }
      return { id: setting.id, name: setting.name, displayType: setting.displayType as string, priority: setting.priority, displayName, availableValues, selectedValue, disabled: isDisabled };
    });
  }, [products, config, selectedAttributes, language]);

  const handleAttributeSelect = useCallback(
    (settingName: string, value: string): void => {
      const sortedSettings = getSortedSettings();
      const changedIndex = sortedSettings.findIndex((s) => s.name === settingName);
      if (changedIndex < 0) return;
      const newSelections: Record<string, string> = { ...selectedAttributes };
      newSelections[settingName] = value;
      for (let i = changedIndex + 1; i < sortedSettings.length; i++) delete newSelections[sortedSettings[i].name];
      for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
        const next = sortedSettings[i];
        const available = getAvailableValuesForIndexWithSelections(next.name, i, newSelections);
        if (available.length > 0) { newSelections[next.name] = available[0]; } else { break; }
      }
      setSelectedAttributes(newSelections);
      const allSelected = sortedSettings.every((s) => !!newSelections[s.name]);
      if (allSelected) {
        const matching = filterProductsBySelections(products, newSelections);
        if (matching.length > 0 && onConfigurationChange) onConfigurationChange(matching[0]);
      }
    },
    [products, config, selectedAttributes, onConfigurationChange]
  );

  const initFromProduct = useCallback(
    (product: Product): void => {
      const sortedSettings = getSortedSettings();
      if (!sortedSettings.length) return;
      const attrItems = product.attributes?.items as AttributeResult[] | undefined;
      if (!attrItems) return;
      const initial: Record<string, string> = {};
      for (const setting of sortedSettings) {
        const match = attrItems.find((a) => attributeNameMatches(a, setting.name));
        if (match) { const values = extractAttributeValues(match); if (values.length) initial[setting.name] = values[0]; }
      }
      if (!Object.keys(initial).length) return;
      setSelectedAttributes(initial);
      const allSelected = sortedSettings.every((s) => !!initial[s.name]);
      if (allSelected && onConfigurationChange) {
        const matching = filterProductsBySelections(products, initial);
        if (matching.length > 0) onConfigurationChange(matching[0]);
      }
    },
    [products, config, onConfigurationChange]
  );

  const reset = useCallback(() => setSelectedAttributes({}), []);

  return { selectedAttributes, settingsWithValues, handleAttributeSelect, initFromProduct, reset };
}
