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
interface PriceToggleState {
  isOn: boolean;
  getLabel: () => string;
  getStatusText: () => string;
  handleToggle: () => void;
}
function PriceToggle(props: PriceToggleProps) {
  const [isOn, setIsOn] = useState<PriceToggleState['isOn']>(() => props.initialState ?? true);
  function getLabel(): ReturnType<PriceToggleState['getLabel']> {
    return (props.label as string) || 'Prices:';
  }
  function getStatusText(): ReturnType<PriceToggleState['getStatusText']> {
    return isOn ? 'Incl. VAT' : 'Excl. VAT';
  }
  function handleToggle(): ReturnType<PriceToggleState['handleToggle']> {
    const newValue = !isOn;
    setIsOn(newValue);
    if (props.inclExclVatSwitched) {
      props.inclExclVatSwitched(newValue);
    }
    window.dispatchEvent(
      new CustomEvent('priceToggleChanged', {
        detail: newValue,
      })
    );
  }
  // Note: the previous code re-set isOn from props.initialState in a
  // useEffect — redundant with the lazy initializer above and a
  // set-state-in-effect anti-pattern, so it was removed.
  return (
    <div
      className={`propeller-price-toggle flex items-center gap-2 ${(props.className as string) || ''}`}
      data-state={isOn ? 'on' : 'off'}
    >
      <span className="propeller-price-toggle__label hidden sm:inline text-xs">{getLabel()}</span>
      <button
        type="button"
        role="switch"
        className="propeller-price-toggle__switch hover:opacity-80 transition-opacity text-xs font-medium"
        aria-checked={isOn}
        onClick={(event) => handleToggle()}
      >
        {getStatusText()}
      </button>
    </div>
  );
}

export default PriceToggle;
