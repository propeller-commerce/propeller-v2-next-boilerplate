'use client';

import React from 'react';
import Image from 'next/image';
import { ClusterConfigSettingDisplayType } from 'propeller-sdk-v2/dist/enum';
import { SettingWithDisplayName } from './ClusterConfigurator';
import './AttributeSelector.css';

interface AttributeSelectorProps {
  setting: SettingWithDisplayName;
  availableValues: string[];
  selectedValue: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
}

const AttributeSelector: React.FC<AttributeSelectorProps> = ({
  setting,
  availableValues,
  selectedValue,
  disabled,
  onChange
}) => {
  const handleChange = (value: string) => {
    if (!disabled) {
      onChange(value);
    }
  };

  // IMAGE display type - selectable image grid
  const renderImageSelector = () => (
    <div className="attribute-selector image-selector">
      <h4 className="attribute-title">{setting.displayName || setting.name}</h4>
      <div className="image-grid">
        {availableValues.map((value, index) => (
          <div
            key={index}
            className={`image-option ${selectedValue === value ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => handleChange(value)}
          >
            <Image
              src={value}
              alt={`${setting.displayName || setting.name} option`}
              className="attribute-image"
              width={100}
              height={100}
              unoptimized
            />
            {selectedValue === value && (
              <div className="selection-indicator">
                <span className="checkmark">✓</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // COLOR display type - selectable color squares
  const renderColorSelector = () => (
    <div className="attribute-selector color-selector">
      <h4 className="attribute-title">{setting.displayName || setting.name}</h4>
      <div className="color-grid">
        {availableValues.map((value, index) => (
          <div
            key={index}
            className={`color-option ${selectedValue === value ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => handleChange(value)}
          >
            <div
              className="color-square"
              style={{ backgroundColor: value }}
              title={value}
            />
            {selectedValue === value && (
              <div className="selection-border"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // DROPDOWN display type - searchable select
  const renderDropdownSelector = () => (
    <div className="attribute-selector dropdown-selector">
      <h4 className="attribute-title">{setting.displayName || setting.name}</h4>
      <select
        value={selectedValue || (availableValues.length > 0 ? availableValues[0] : '')}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        className="attribute-dropdown"
      >
        {availableValues.map((value, index) => (
          <option key={index} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );

  // RADIO display type - radio button group
  const renderRadioSelector = () => (
    <div className="attribute-selector radio-selector">
      <h4 className="attribute-title">{setting.displayName || setting.name}</h4>
      <div className="radio-group">
        {availableValues.map((value, index) => (
          <label
            key={index}
            className={`radio-option ${disabled ? 'disabled' : ''}`}
          >
            <input
              type="radio"
              name={`attribute-${setting.id}`}
              value={value}
              checked={selectedValue === value}
              onChange={() => handleChange(value)}
              disabled={disabled}
            />
            <span className="radio-label">{value}</span>
          </label>
        ))}
      </div>
    </div>
  );

  // Debug logging
  console.log(`AttributeSelector for ${setting.name}:`, {
    displayType: setting.displayType,
    availableValues,
    selectedValue,
    disabled
  });

  // Show message when no values are available
  if (availableValues.length === 0) {
    return (
      <div className="attribute-selector">
        <h4 className="attribute-title">{setting.displayName || setting.name}</h4>
        <p style={{ color: '#999', fontStyle: 'italic' }}>
          No values available for {setting.displayName || setting.name} (Display type: {setting.displayType})
        </p>
      </div>
    );
  }

  // Render based on display type
  switch (setting.displayType) {
    case ClusterConfigSettingDisplayType.IMAGE:
      return renderImageSelector();
    case ClusterConfigSettingDisplayType.COLOR:
      return renderColorSelector();
    case ClusterConfigSettingDisplayType.DROPDOWN:
      return renderDropdownSelector();
    case ClusterConfigSettingDisplayType.RADIO:
      return renderRadioSelector();
    default:
      return (
        <div className="attribute-selector">
          <h4 className="attribute-title">{setting.displayName || setting.name}</h4>
          <p>Unsupported display type: {setting.displayType}</p>
        </div>
      );
  }
};

export default AttributeSelector;