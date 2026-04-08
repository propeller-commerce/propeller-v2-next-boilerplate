'use client';
import * as React from 'react';

import { useEffect } from 'react';
import {
  Product,
  ClusterConfig,
} from 'propeller-sdk-v2';
import { useClusterConfigurator } from '@/composables/react/useClusterConfigurator';

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

function ClusterConfigurator(props: ClusterConfiguratorProps) {
  const { settingsWithValues, handleAttributeSelect, initFromProduct } = useClusterConfigurator({
    products: props.products,
    config: props.config,
    onConfigurationChange: props.onConfigurationChange,
  });

  function getLabel(key: string, fallback: string): string {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  useEffect(() => {
    if (props.defaultProduct) {
      initFromProduct(props.defaultProduct);
    }
  }, []);

  return (
    <div className={`cluster-configurator ${props.className || ''}`}>
      {!!(props.config as ClusterConfig)?.settings?.length ? (
        <div className="configurator-content flex flex-col gap-6">
          {settingsWithValues?.map((setting) => (
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
