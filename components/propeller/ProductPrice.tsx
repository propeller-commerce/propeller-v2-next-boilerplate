'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
import  { ProductPrice, Contact, Customer } from 'propeller-sdk-v2';



  export interface ProductPriceProps {
/**
 * ProductPrice object from the product.
 * Obtain from `product.price`.
 */
price: ProductPrice;

/** Currency symbol to display. Defaults to '€'. */
currency?: string;

/**
 * Controls portal visibility mode.
 * 'open'        — full e-commerce; price is always visible.
 * 'semi-closed' — catalog-only; price is hidden for anonymous users.
 * Defaults to 'open'.
 */
portalMode?: string;

/** Authenticated user — used for semi-closed visibility. */
user?: Contact | Customer | null;

/**
 * When true, net price (incl. tax) is the leading price.
 * When false (default), gross price (excl. tax) is the leading price.
 * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
 */
includeTax?: boolean;

/** Tax zone code. Defaults to 'NL'. */
taxZone?: string;

/**
 * Override any UI string.
 * Available keys: inclTax, exclTax, loginToSeePrices
 */
labels?: Record<string, string>;

/** Extra CSS class applied to the root element. */
className?: string;
}
interface ProductPriceState {
_includeTax: boolean;
_priceListener: any;
isHidden: () => boolean;
getIncludeTax: () => boolean;
getLeadingPrice: () => string;
getSecondaryPrice: () => string;
getTaxLabel: () => string;
getSecondaryTaxLabel: () => string;
getLabel: (key: string, fallback: string) => string;
formatPrice: (value: number | null | undefined) => string;
}


  function ProductPriceDisplay(props:ProductPriceProps) {

  const [_includeTax, set_includeTax] = useState<ProductPriceState["_includeTax"]>(() => (true))


const [_priceListener, set_priceListener] = useState<ProductPriceState["_priceListener"]>(() => (null))


function isHidden(): ReturnType<ProductPriceState["isHidden"]>{
return props.portalMode as string === 'semi-closed' && !props.user;
}


function getIncludeTax(): ReturnType<ProductPriceState["getIncludeTax"]>{
return props.includeTax !== undefined ? !!props.includeTax : _includeTax;
}


function formatPrice(value: number | null | undefined): ReturnType<ProductPriceState["formatPrice"]>{
if (value === null || value === undefined) return '';
const currency = props.currency as string || '\u20AC';
return `${currency}${Number(value).toFixed(2)}`;
}


function getLeadingPrice(): ReturnType<ProductPriceState["getLeadingPrice"]>{
const price = props.price as ProductPrice;
if (!price) return '';
const useTax: boolean = getIncludeTax();
const value: number | undefined = useTax ? price.net : price.gross;
return formatPrice(value);
}


function getSecondaryPrice(): ReturnType<ProductPriceState["getSecondaryPrice"]>{
const price = props.price as ProductPrice;
if (!price) return '';
const useTax: boolean = getIncludeTax();
const value: number | undefined = useTax ? price.gross : price.net;
return formatPrice(value);
}


function getTaxLabel(): ReturnType<ProductPriceState["getTaxLabel"]>{
const useTax: boolean = getIncludeTax();
return useTax ? getLabel('inclTax', 'incl. VAT') : getLabel('exclTax', 'excl. VAT');
}


function getSecondaryTaxLabel(): ReturnType<ProductPriceState["getSecondaryTaxLabel"]>{
const useTax: boolean = getIncludeTax();
return useTax ? getLabel('exclTax', 'excl. VAT') : getLabel('inclTax', 'incl. VAT');
}


function getLabel(key: string, fallback: string): ReturnType<ProductPriceState["getLabel"]>{
return (props.labels as Record<string, string>)?.[key] || fallback;
}







useEffect(() => {
      if (typeof window !== 'undefined') {
const stored = localStorage.getItem('price_include_tax');
set_includeTax(stored === null ? true : stored === 'true');
set_priceListener(() => {
const val = localStorage.getItem('price_include_tax');
set_includeTax(val === null ? true : val === 'true');
});
window.addEventListener('priceToggleChanged', _priceListener);
}
    }, [])



return (


  <div  className={`product-price ${props.className as string || ''}`}>{isHidden() ? (
  <p className="text-sm text-muted-foreground italic">{getLabel('loginToSeePrices', 'Log in to see prices')}</p>
) : null}{!isHidden() && !!getLeadingPrice() ? (
  <div className="flex flex-col gap-0.5"><div className="flex items-baseline gap-2"><span className="text-3xl font-bold text-primary">{getLeadingPrice()}</span><span className="text-sm text-muted-foreground">{getTaxLabel()}</span></div>{!!getSecondaryPrice() ? (
  <div className="text-sm text-muted-foreground">{getSecondaryPrice()}{getSecondaryTaxLabel()}</div>
) : null}</div>
) : null}</div>


);
}




  export default ProductPriceDisplay;


