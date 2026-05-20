'use client';
/**
 * @rsc-blocked — Client-only component: side effects (useEffect).
 * Must be rendered inside (or below) a Client Component boundary; cannot be
 * imported directly into a React Server Component. The 'use client' header
 * above marks this boundary to Next.js.
 */
import * as React from 'react';

import { useEffect } from 'react';
import {
  Product,
  ClusterConfig,
} from 'propeller-sdk-v2';
import { useClusterConfigurator } from '@/composables/react/useClusterConfigurator';
import { getLabel } from '@/composables/shared/utils/labelHelpers';

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

  

  useEffect(() => {
    if (props.defaultProduct) {
      initFromProduct(props.defaultProduct);
    }
  }, []);

  return (
    <div className={`propeller-cluster-configurator ${props.className || ''}`}>
      {!!(props.config as ClusterConfig)?.settings?.length ? (
        <div className="propeller-cluster-configurator__content flex flex-col gap-6">
          {settingsWithValues?.map((setting) => (
            <div
              className="propeller-cluster-configurator__group"
              key={setting.id}
              data-display-type={setting.displayType}
              data-disabled={setting.disabled ? 'true' : 'false'}
            >
              <h4 className="propeller-cluster-configurator__label font-semibold text-sm text-muted-foreground mb-3">
                {setting.displayName || setting.name}
              </h4>
              {setting.displayType === 'DROPDOWN' ? (
                <select
                  className="propeller-cluster-configurator__select w-full border border-border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary disabled:bg-surface-hover disabled:text-foreground-subtle cursor-pointer"
                  value={setting.selectedValue}
                  disabled={setting.disabled}
                  onChange={(e) => handleAttributeSelect(setting.name, e.target.value)}
                >
                  <option value="">{getLabel(props.labels, 'selectOption', '— Select —')}</option>
                  {setting.availableValues?.map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              ) : null}
              {setting.displayType === 'RADIO' ? (
                <div className="propeller-cluster-configurator__options flex flex-wrap gap-2">
                  {setting.availableValues?.map((val) => (
                    <label
                      key={val}
                      data-selected={setting.selectedValue === val ? 'true' : 'false'}
                      className={`propeller-cluster-configurator__radio flex items-center gap-2 px-3 py-1.5 rounded-control border text-sm font-medium transition-colors select-none ${setting.disabled ? 'opacity-50 cursor-not-allowed border-border text-foreground-subtle' : setting.selectedValue === val ? 'border-secondary bg-secondary/5 text-secondary cursor-pointer' : 'border-border text-muted-foreground hover:border-secondary/30 cursor-pointer'}`}
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
                <div className="propeller-cluster-configurator__options flex flex-wrap gap-2">
                  {setting.availableValues?.map((val) => (
                    <button
                      type="button"
                      key={val}
                      title={val}
                      disabled={setting.disabled}
                      onClick={(event) => handleAttributeSelect(setting.name, val)}
                      data-selected={setting.selectedValue === val ? 'true' : 'false'}
                      style={{
                        backgroundColor: val,
                      }}
                      className={`propeller-cluster-configurator__color w-8 h-8 rounded-full border-2 transition-all ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${setting.selectedValue === val ? 'border-secondary ring-2 ring-secondary/30 ring-offset-1 scale-110' : 'border-input hover:scale-105'}`}
                    />
                  ))}
                </div>
              ) : null}
              {setting.displayType === 'IMAGE' ? (
                <div className="propeller-cluster-configurator__options flex flex-wrap gap-3">
                  {setting.availableValues?.map((val) => (
                    <button
                      type="button"
                      key={val}
                      disabled={setting.disabled}
                      onClick={(event) => handleAttributeSelect(setting.name, val)}
                      data-selected={setting.selectedValue === val ? 'true' : 'false'}
                      className={`propeller-cluster-configurator__image-swatch relative w-16 h-16 rounded-control border-2 overflow-hidden transition-all ${setting.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${setting.selectedValue === val ? 'border-secondary ring-2 ring-secondary/30 ring-offset-1' : 'border-border hover:border-secondary/30'}`}
                    >
                      <img className="propeller-cluster-configurator__image w-full h-full object-cover" src={val} alt={val} />
                      {setting.selectedValue === val ? (
                        <div className="propeller-cluster-configurator__image-check absolute inset-0 bg-secondary bg-opacity-20 flex items-center justify-center">
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
                <div className="propeller-cluster-configurator__options flex flex-wrap gap-2">
                  {setting.availableValues?.map((val) => (
                    <button
                      type="button"
                      key={val}
                      disabled={setting.disabled}
                      onClick={(event) => handleAttributeSelect(setting.name, val)}
                      data-selected={setting.selectedValue === val ? 'true' : 'false'}
                      className={`propeller-cluster-configurator__chip px-3 py-1.5 rounded-control border text-sm font-medium transition-colors ${setting.disabled ? 'opacity-50 cursor-not-allowed border-border text-foreground-subtle' : setting.selectedValue === val ? 'border-secondary bg-secondary/5 text-secondary cursor-pointer' : 'border-border text-muted-foreground hover:border-secondary/30 cursor-pointer'}`}
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
