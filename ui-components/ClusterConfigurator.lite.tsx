import { useStore, Show, For, onMount } from '@builder.io/mitosis';
import { Product, AttributeResult, ClusterConfig, ClusterConfigSetting, Enums } from 'propeller-sdk-v2';

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
    getAvailableValuesForIndexWithSelections: (attributeName: string, settingIndex: number, selections: Record<string, string>) => string[];

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

export default function ClusterConfigurator(props: ClusterConfiguratorProps) {
    const state = useStore<ClusterConfiguratorState>({
        selectedAttributes: {},

        getLabel(key: string, fallback: string) {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },

        getSortedSettings(): ClusterConfigSetting[] {
            const settings = (props.config as ClusterConfig)?.settings;
            if (!settings || settings.length === 0) return [];
            return settings
                .slice()
                .sort(
                    (a: ClusterConfigSetting, b: ClusterConfigSetting) =>
                        parseInt(a.priority) - parseInt(b.priority),
                );
        },

        attributeNameMatches(attr: AttributeResult, targetName: string): boolean {
            const attrName =
                attr.attributeDescription?.descriptions?.[0]?.value ||
                attr.attributeDescription?.name;
            return (
                attrName === targetName ||
                attr.attributeDescription?.name === targetName ||
                (attr.attributeDescription?.descriptions?.some(
                    (desc: any) => desc.value === targetName,
                ) ?? false)
            );
        },

        extractAttributeValues(attr: AttributeResult): string[] {
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
                extractedValues.push(
                    (attr.value as any).booleanValue ? 'Yes' : 'No',
                );
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
                if (
                    (attr.value as any).values &&
                    Array.isArray((attr.value as any).values)
                ) {
                    extractedValues = (attr.value as any).values.filter(
                        (v: any) => typeof v === 'string',
                    );
                } else {
                    const possibleValues = Object.values(attr.value).filter(
                        (v: any) => typeof v === 'string',
                    );
                    extractedValues = possibleValues as string[];
                }
            }

            return extractedValues.filter((val: string) => !!val);
        },

        getAttributeDisplayName(attributeName: string): string {
            const products = (props.products as Product[]) || [];
            if (products.length === 0) return attributeName;
            const firstProduct = products[0];
            const attributeItems = firstProduct.attributes?.items;
            if (Array.isArray(attributeItems)) {
                const matchingAttr = (attributeItems as AttributeResult[]).find(
                    (attr: AttributeResult) =>
                        state.attributeNameMatches(attr, attributeName),
                );
                if (matchingAttr?.attributeDescription?.descriptions?.[0]?.value) {
                    return matchingAttr.attributeDescription.descriptions[0].value;
                }
            }
            return attributeName;
        },

        getAttributeValues(attributeName: string): string[] {
            const valSet = new Set<string>();
            const products = (props.products as Product[]) || [];
            products.forEach((product: Product) => {
                const attributeItems = product.attributes?.items;
                if (Array.isArray(attributeItems)) {
                    (attributeItems as AttributeResult[]).forEach(
                        (attr: AttributeResult) => {
                            if (state.attributeNameMatches(attr, attributeName)) {
                                const extracted = state.extractAttributeValues(attr);
                                extracted.forEach((val: string) => valSet.add(val));
                            }
                        },
                    );
                }
            });
            return Array.from(valSet);
        },

        getAvailableValuesForIndex(
            attributeName: string,
            settingIndex: number,
        ): string[] {
            return state.getAvailableValuesForIndexWithSelections(
                attributeName,
                settingIndex,
                state.selectedAttributes as Record<string, string>,
            );
        },

        getAvailableValuesForIndexWithSelections(
            attributeName: string,
            settingIndex: number,
            selections: Record<string, string>,
        ): string[] {
            if (settingIndex === 0) {
                return state.getAttributeValues(attributeName);
            }

            const sortedSettings = state.getSortedSettings();
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
                return prevEntries.every(
                    ([attrName, attrValue]: [string, string]) => {
                        const attributeItems = product.attributes?.items;
                        if (!Array.isArray(attributeItems)) return false;
                        return (attributeItems as AttributeResult[]).some(
                            (attr: AttributeResult) => {
                                if (!state.attributeNameMatches(attr, attrName))
                                    return false;
                                return state.extractAttributeValues(attr).includes(attrValue);
                            },
                        );
                    },
                );
            });

            const availableSet = new Set<string>();
            matchingProducts.forEach((product: Product) => {
                const attributeItems = product.attributes?.items;
                if (Array.isArray(attributeItems)) {
                    (attributeItems as AttributeResult[]).forEach(
                        (attr: AttributeResult) => {
                            if (state.attributeNameMatches(attr, attributeName)) {
                                state.extractAttributeValues(attr).forEach(
                                    (val: string) => availableSet.add(val),
                                );
                            }
                        },
                    );
                }
            });
            return Array.from(availableSet);
        },

        getSettingsWithValues(): ConfiguredSetting[] {
            const sortedSettings = state.getSortedSettings();
            const sel = state.selectedAttributes as Record<string, string>;
            return sortedSettings.map(
                (setting: ClusterConfigSetting, index: number) => {
                    const availableValues = state.getAvailableValuesForIndex(
                        setting.name,
                        index,
                    );
                    const selectedValue = sel[setting.name] || '';
                    const isPreviousSelectionMissing =
                        index > 0 &&
                        sortedSettings
                            .slice(0, index)
                            .some(
                                (prev: ClusterConfigSetting) => !sel[prev.name],
                            );
                    const isDisabled =
                        availableValues.length === 0 || isPreviousSelectionMissing;
                    const displayName = state.getAttributeDisplayName(setting.name);
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
                },
            );
        },

        findMatchingProduct(
            selections: Record<string, string>,
        ): Product | null {
            const products = (props.products as Product[]) || [];
            const entries = Object.entries(selections);
            if (entries.length === 0) return null;
            const found = products.find((product: Product) => {
                const attrItems = product.attributes?.items;
                if (!Array.isArray(attrItems)) return false;
                return entries.every(
                    ([attrName, attrValue]: [string, string]) => {
                        return (attrItems as AttributeResult[]).some(
                            (attr: AttributeResult) => {
                                if (!state.attributeNameMatches(attr, attrName))
                                    return false;
                                const productValues =
                                    state.extractAttributeValues(attr);
                                return productValues.includes(attrValue);
                            },
                        );
                    },
                );
            });
            return found || null;
        },

        handleAttributeSelect(settingName: string, value: string) {
            const sortedSettings = state.getSortedSettings();
            const changedIndex = sortedSettings.findIndex(
                (s: ClusterConfigSetting) => s.name === settingName,
            );

            // Build new selections: keep, update changed, remove subsequent
            const newSelections: Record<string, string> = {
                ...(state.selectedAttributes as Record<string, string>),
            };
            newSelections[settingName] = value;
            for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
                delete newSelections[sortedSettings[i].name];
            }

            // Always pre-select the first available value for all subsequent settings
            for (let i = changedIndex + 1; i < sortedSettings.length; i++) {
                const nextSetting = sortedSettings[i];
                const available = state.getAvailableValuesForIndexWithSelections(
                    nextSetting.name,
                    i,
                    newSelections,
                );
                if (available.length > 0) {
                    newSelections[nextSetting.name] = available[0];
                } else {
                    break;
                }
            }

            state.selectedAttributes = newSelections;

            // When all settings have a selection, resolve and report the product
            const allSelected = sortedSettings.every(
                (s: ClusterConfigSetting) => !!newSelections[s.name],
            );
            if (allSelected) {
                const matchingProduct = state.findMatchingProduct(newSelections);
                if (matchingProduct && props.onConfigurationChange) {
                    props.onConfigurationChange(matchingProduct);
                }
            }
        },
    });

    onMount(() => {
        const defaultProduct = props.defaultProduct as Product;
        if (!defaultProduct) return;

        const sortedSettings = state.getSortedSettings();
        if (sortedSettings.length === 0) return;

        const initial: Record<string, string> = {};
        sortedSettings.forEach((setting: ClusterConfigSetting) => {
            const attrItems = defaultProduct.attributes?.items;
            if (!Array.isArray(attrItems)) return;
            const matchingAttr = (attrItems as AttributeResult[]).find(
                (attr: AttributeResult) => state.attributeNameMatches(attr, setting.name),
            );
            if (matchingAttr) {
                const values = state.extractAttributeValues(matchingAttr);
                if (values.length > 0) {
                    initial[setting.name] = values[0];
                }
            }
        });

        if (Object.keys(initial).length === 0) return;
        state.selectedAttributes = initial;

        const allSelected = sortedSettings.every(
            (s: ClusterConfigSetting) => !!initial[s.name],
        );
        if (allSelected && props.onConfigurationChange) {
            const matchingProduct = state.findMatchingProduct(initial);
            if (matchingProduct) {
                props.onConfigurationChange(matchingProduct);
            }
        }
    });

    return (
        <div
            className={`cluster-configurator ${props.className || ''}`}
        >
            <Show when={!!(props.config as ClusterConfig)?.settings?.length}>
                <div className="configurator-content flex flex-col gap-6">
                    <For each={state.getSettingsWithValues()}>
                        {(setting: ConfiguredSetting) => (
                            <div key={setting.id} className="attribute-group">

                                {/* Setting label */}
                                <h4 className="font-semibold text-sm text-gray-700 mb-3">
                                    {setting.displayName || setting.name}
                                </h4>

                                {/* ── DROPDOWN ────────────────────────────── */}
                                <Show when={setting.displayType === 'DROPDOWN'}>
                                    <select
                                        value={setting.selectedValue}
                                        disabled={setting.disabled}
                                        onChange={(e: any) =>
                                            state.handleAttributeSelect(
                                                setting.name,
                                                e.target.value,
                                            )
                                        }
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
                                    >
                                        <option value="">
                                            {state.getLabel('selectOption', '— Select —')}
                                        </option>
                                        <For each={setting.availableValues}>
                                            {(val: string) => (
                                                <option key={val} value={val}>
                                                    {val}
                                                </option>
                                            )}
                                        </For>
                                    </select>
                                </Show>

                                {/* ── RADIO (pill buttons) ─────────────────── */}
                                <Show when={setting.displayType === 'RADIO'}>
                                    <div className="flex flex-wrap gap-2">
                                        <For each={setting.availableValues}>
                                            {(val: string) => (
                                                <label
                                                    key={val}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors select-none ${setting.disabled ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400' : setting.selectedValue === val ? 'border-violet-500 bg-violet-50 text-violet-700 cursor-pointer' : 'border-gray-200 text-gray-700 hover:border-violet-300 cursor-pointer'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`cluster-${props.clusterId}-${setting.name}`}
                                                        value={val}
                                                        checked={setting.selectedValue === val}
                                                        disabled={setting.disabled}
                                                        onChange={() =>
                                                            state.handleAttributeSelect(
                                                                setting.name,
                                                                val,
                                                            )
                                                        }
                                                        className="sr-only"
                                                    />
                                                    {val}
                                                </label>
                                            )}
                                        </For>
                                    </div>
                                </Show>

                                {/* ── COLOR (circle swatches) ─────────────── */}
                                <Show when={setting.displayType === 'COLOR'}>
                                    <div className="flex flex-wrap gap-2">
                                        <For each={setting.availableValues}>
                                            {(val: string) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    title={val}
                                                    disabled={setting.disabled}
                                                    onClick={() =>
                                                        state.handleAttributeSelect(
                                                            setting.name,
                                                            val,
                                                        )
                                                    }
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${setting.selectedValue === val ? 'border-violet-600 ring-2 ring-violet-300 ring-offset-1 scale-110' : 'border-gray-300 hover:scale-105'}`}
                                                    style={{ backgroundColor: val }}
                                                />
                                            )}
                                        </For>
                                    </div>
                                </Show>

                                {/* ── IMAGE (thumbnail grid) ───────────────── */}
                                <Show when={setting.displayType === 'IMAGE'}>
                                    <div className="flex flex-wrap gap-3">
                                        <For each={setting.availableValues}>
                                            {(val: string) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    disabled={setting.disabled}
                                                    onClick={() =>
                                                        state.handleAttributeSelect(
                                                            setting.name,
                                                            val,
                                                        )
                                                    }
                                                    className={`relative w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${setting.selectedValue === val ? 'border-violet-600 ring-2 ring-violet-300 ring-offset-1' : 'border-gray-200 hover:border-violet-300'}`}
                                                >
                                                    <img
                                                        src={val}
                                                        alt={val}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <Show
                                                        when={
                                                            setting.selectedValue === val
                                                        }
                                                    >
                                                        <div className="absolute inset-0 bg-violet-600 bg-opacity-20 flex items-center justify-center">
                                                            <svg
                                                                className="w-5 h-5 text-violet-700"
                                                                fill="currentColor"
                                                                viewBox="0 0 20 20"
                                                            >
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                        </div>
                                                    </Show>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </Show>

                                {/* ── Default / unknown display type ───────── */}
                                <Show
                                    when={
                                        setting.displayType !== 'DROPDOWN' &&
                                        setting.displayType !== 'RADIO' &&
                                        setting.displayType !== 'COLOR' &&
                                        setting.displayType !== 'IMAGE'
                                    }
                                >
                                    <div className="flex flex-wrap gap-2">
                                        <For each={setting.availableValues}>
                                            {(val: string) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    disabled={setting.disabled}
                                                    onClick={() =>
                                                        state.handleAttributeSelect(
                                                            setting.name,
                                                            val,
                                                        )
                                                    }
                                                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${setting.disabled ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400' : setting.selectedValue === val ? 'border-violet-500 bg-violet-50 text-violet-700 cursor-pointer' : 'border-gray-200 text-gray-700 hover:border-violet-300 cursor-pointer'}`}
                                                >
                                                    {val}
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </Show>

                            </div>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}
