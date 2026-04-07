/**
 * useClusterConfigurator (Vue) — Cascading attribute selection state machine.
 *
 * Covers: ClusterConfigurator component (most complex, no SDK calls).
 *
 * Responsibilities:
 * - selectedAttributes state (only reactive field)
 * - getSortedSettings() — settings sorted by priority
 * - getAvailableValuesForIndex(name, index, selections) — drilldown filtering
 * - handleAttributeSelect(name, value) — cascade reset + auto-fill + match
 * - initFromProduct(product) — pre-populate from defaultProduct on mount
 * - Delegates attribute extraction to shared attributeExtractor utility
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import type {
  Product,
  AttributeResult,
  ClusterConfig,
  ClusterConfigSetting,
} from 'propeller-sdk-v2';
import {
  attributeNameMatches,
  extractAttributeValues,
  filterProductsBySelections,
  collectAttributeValues,
} from '../shared/utils/attributeExtractor';
import { getAttributeDisplayName } from '../shared/utils/attributeExtractor';

// ── Types ────────────────────────────────────────────────────────────────────

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
  products: Ref<Product[]>;
  config: Ref<ClusterConfig>;
  language?: Ref<string>;
  onConfigurationChange?: (product: Product) => void;
}

export interface UseClusterConfiguratorReturn {
  selectedAttributes: Ref<Record<string, string>>;
  settingsWithValues: ComputedRef<ConfiguredSetting[]>;
  handleAttributeSelect: (settingName: string, value: string) => void;
  initFromProduct: (product: Product) => void;
  reset: () => void;
}

export function useClusterConfigurator(
  options: UseClusterConfiguratorOptions
): UseClusterConfiguratorReturn {
  const { products, config, onConfigurationChange } = options;
  const languageRef = options.language ?? ref('NL');

  const selectedAttributes = ref<Record<string, string>>({});

  // ── Sorted settings ───────────────────────────────────────────────────────

  function getSortedSettings(): ClusterConfigSetting[] {
    const settings = config.value?.settings;
    if (!settings?.length) return [];
    return settings
      .slice()
      .sort((a: ClusterConfigSetting, b: ClusterConfigSetting) => parseInt(a.priority) - parseInt(b.priority));
  }

  // ── Available values for a setting at a given index with explicit selections ─

  function getAvailableValuesForIndexWithSelections(
    attributeName: string,
    settingIndex: number,
    selections: Record<string, string>
  ): string[] {
    if (settingIndex === 0) {
      return collectAttributeValues(products.value, attributeName);
    }

    const sortedSettings = getSortedSettings();
    const previousSelections: Record<string, string> = {};
    for (let i = 0; i < settingIndex; i++) {
      const prev = sortedSettings[i];
      if (selections[prev.name]) previousSelections[prev.name] = selections[prev.name];
    }

    const matching = filterProductsBySelections(products.value, previousSelections);
    return collectAttributeValues(matching, attributeName);
  }

  // ── Computed settings with values ─────────────────────────────────────────

  const settingsWithValues = computed<ConfiguredSetting[]>(() => {
    const sortedSettings = getSortedSettings();
    const sel = selectedAttributes.value;
    const language = languageRef.value || 'NL';

    return sortedSettings.map((setting, index) => {
      const availableValues = getAvailableValuesForIndexWithSelections(setting.name, index, sel);
      const selectedValue = sel[setting.name] || '';
      const isPreviousMissing =
        index > 0 && sortedSettings.slice(0, index).some((prev) => !sel[prev.name]);
      const isDisabled = availableValues.length === 0 || isPreviousMissing;

      // Resolve display name from first product attributes
      let displayName = setting.name;
      const firstProduct = products.value[0];
      if (firstProduct) {
        const items = firstProduct.attributes?.items as AttributeResult[] | undefined;
        if (items) {
          const match = items.find((a) => attributeNameMatches(a, setting.name));
          if (match) displayName = getAttributeDisplayName(match, language) || setting.name;
        }
      }

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
  });

  // ── Handle attribute selection ─────────────────────────────────────────────

  function handleAttributeSelect(settingName: string, value: string): void {
    const sortedSettings = getSortedSettings();
    const changedIndex = sortedSettings.findIndex((s) => s.name === settingName);
    if (changedIndex < 0) return;

    const newSelections: Record<string, string> = { ...selectedAttributes.value };
    newSelections[settingName] = value;

    // Clear subsequent selections
    for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
      delete newSelections[sortedSettings[i].name];
    }

    // Auto-fill: pre-select first available value for each subsequent setting
    for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
      const next = sortedSettings[i];
      const available = getAvailableValuesForIndexWithSelections(next.name, i, newSelections);
      if (available.length > 0) {
        newSelections[next.name] = available[0];
      } else {
        break;
      }
    }

    selectedAttributes.value = newSelections;

    // Fire callback if all settings have selections
    const allSelected = sortedSettings.every((s) => !!newSelections[s.name]);
    if (allSelected) {
      const matching = filterProductsBySelections(products.value, newSelections);
      if (matching.length > 0 && onConfigurationChange) {
        onConfigurationChange(matching[0]);
      }
    }
  }

  // ── Init from default product ─────────────────────────────────────────────

  function initFromProduct(product: Product): void {
    const sortedSettings = getSortedSettings();
    if (!sortedSettings.length) return;

    const initial: Record<string, string> = {};
    const attrItems = product.attributes?.items as AttributeResult[] | undefined;

    if (!attrItems) return;

    for (const setting of sortedSettings) {
      const match = attrItems.find((a) => attributeNameMatches(a, setting.name));
      if (match) {
        const values = extractAttributeValues(match);
        if (values.length) initial[setting.name] = values[0];
      }
    }

    if (!Object.keys(initial).length) return;
    selectedAttributes.value = initial;

    const allSelected = sortedSettings.every((s) => !!initial[s.name]);
    if (allSelected && onConfigurationChange) {
      const matching = filterProductsBySelections(products.value, initial);
      if (matching.length > 0) onConfigurationChange(matching[0]);
    }
  }

  function reset(): void {
    selectedAttributes.value = {};
  }

  return {
    selectedAttributes,
    settingsWithValues,
    handleAttributeSelect,
    initFromProduct,
    reset,
  };
}
