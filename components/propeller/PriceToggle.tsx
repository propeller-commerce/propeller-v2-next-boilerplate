'use client';
import * as React from 'react';

import { useState } from 'react';

export interface PriceToggleProps {
  /**
   * Label text shown beside the toggle.
   * Defaults to 'Prices:'.
   */
  label?: string;

  /**
   * Initial state of the toggle.
   * Defaults to true (incl. VAT).
   */
  initialState?: boolean;

  /**
   * Required callback fired when the toggle is switched.
   * Receives the new state: true = incl. VAT, false = excl. VAT.
   */
  inclExclVatSwitched: (on: boolean) => void;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
function PriceToggle(props: PriceToggleProps) {
  const [isOn, setIsOn] = useState(props.initialState ?? true);
  const label = props.label || 'Prices:';
  const statusText = isOn ? 'Incl. VAT' : 'Excl. VAT';
  function handleToggle(): void {
    const newValue = !isOn;
    setIsOn(newValue);
    if (props.inclExclVatSwitched) {
      props.inclExclVatSwitched(newValue);
    }
    window.dispatchEvent(
      new CustomEvent('priceToggleChanged', { detail: newValue }),
    );
  }
  // Note: the previous code re-set isOn from props.initialState in a
  // useEffect — redundant with the lazy initializer above and a
  // set-state-in-effect anti-pattern, so it was removed.
  return (
    <div
      className={`propeller-price-toggle flex items-center gap-2 ${props.className || ''}`}
      data-state={isOn ? 'on' : 'off'}
    >
      <span className="propeller-price-toggle__label hidden sm:inline text-xs">{label}</span>
      <button
        type="button"
        role="switch"
        className="propeller-price-toggle__switch hover:opacity-80 transition-opacity text-xs font-medium"
        aria-checked={isOn}
        onClick={handleToggle}
      >
        {statusText}
      </button>
    </div>
  );
}

export default PriceToggle;
