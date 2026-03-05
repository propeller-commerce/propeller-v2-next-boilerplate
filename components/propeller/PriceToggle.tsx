'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'



  export interface PriceToggleProps {
/**
 * Label text shown beside the toggle.
 * Defaults to 'Prices:'.
 */
label?: string;

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





  function PriceToggle(props:PriceToggleProps) {

  const [isOn, setIsOn] = useState<PriceToggleState["isOn"]>(() => (true))


function getLabel(): ReturnType<PriceToggleState["getLabel"]>{
return props.label as string || 'Prices:';
}


function getStatusText(): ReturnType<PriceToggleState["getStatusText"]>{
return isOn ? 'Incl. VAT' : 'Excl. VAT';
}


function handleToggle(): ReturnType<PriceToggleState["handleToggle"]>{
const newValue = !isOn;
setIsOn(newValue);
if (typeof window !== 'undefined') {
localStorage.setItem('price_include_tax', String(newValue));
window.dispatchEvent(new CustomEvent('priceToggleChanged', {
  detail: newValue
}));
}
if (props.inclExclVatSwitched) {
props.inclExclVatSwitched(newValue);
}
}







useEffect(() => {
      if (typeof window !== 'undefined') {
const stored = localStorage.getItem('price_include_tax');
setIsOn(stored === null ? true : stored === 'true');
}
    }, [])



return (


  <div  className={`price-toggle flex items-center gap-2 ${props.className as string || ''}`}><span className="hidden sm:inline text-xs">{getLabel()}</span><button  type="button"  role="switch" className="hover:opacity-80 transition-opacity text-xs font-medium"  aria-checked={isOn}  onClick={(event) => handleToggle() }>{getStatusText()}</button></div>


);
}




  export default PriceToggle;


