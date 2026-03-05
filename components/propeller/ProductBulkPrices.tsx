'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
import  { ProductPrice, Contact, Customer } from 'propeller-sdk-v2';



  export interface ProductBulkPricesProps {
/**
 * Bulk price tiers from the product.
 * Obtain from `product.bulkPrices`.
 */
bulkPrices: ProductPrice[];

/**
 * When true, net price (incl. tax) is the leading price.
 * Defaults to false — gross (excl. VAT) is shown.
 * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
 */
includeTax?: boolean;

/**
 * Controls portal visibility mode.
 * 'semi-closed' — component is hidden for anonymous users.
 * Defaults to 'open'.
 */
portalMode?: string;

/** Authenticated user — used for semi-closed visibility. */
user?: Contact | Customer | null;

/** Tax zone code. Defaults to 'NL'. */
taxZone?: string;

/**
 * Override any UI string.
 * Available keys: title, quantityFrom, price, inclTax, exclTax
 */
labels?: Record<string, string>;

/** Extra CSS class applied to the root element. */
className?: string;
}
interface ProductBulkPricesState {
_includeTax: boolean;
_priceListener: any;
isHidden: () => boolean;
hasItems: () => boolean;
getIncludeTax: () => boolean;
getBulkPrices: () => ProductPrice[];
getPrice: (tier: ProductPrice) => string;
getLabel: (key: string, fallback: string) => string;
}


  function ProductBulkPrices(props:ProductBulkPricesProps) {

  const [_includeTax, set_includeTax] = useState<ProductBulkPricesState["_includeTax"]>(() => (true))


const [_priceListener, set_priceListener] = useState<ProductBulkPricesState["_priceListener"]>(() => (null))


function isHidden(): ReturnType<ProductBulkPricesState["isHidden"]>{
return props.portalMode as string === 'semi-closed' && !props.user;
}


function getIncludeTax(): ReturnType<ProductBulkPricesState["getIncludeTax"]>{
return props.includeTax !== undefined ? !!props.includeTax : _includeTax;
}


function getBulkPrices(): ReturnType<ProductBulkPricesState["getBulkPrices"]>{
return props.bulkPrices as ProductPrice[] || [];
}


function hasItems(): ReturnType<ProductBulkPricesState["hasItems"]>{
return getBulkPrices().length > 0;
}


function getPrice(tier: ProductPrice): ReturnType<ProductBulkPricesState["getPrice"]>{
const useTax: boolean = getIncludeTax();
const value: number | undefined = useTax ? tier.net : tier.gross;
if (value === null || value === undefined) return '';
return `\u20AC${Number(value).toFixed(2)}`;
}


function getLabel(key: string, fallback: string): ReturnType<ProductBulkPricesState["getLabel"]>{
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
  <>

  {!isHidden() && hasItems() ? (
  <><div  className={`product-bulk-prices ${props.className as string || ''}`}><h3 className="text-base font-semibold text-foreground mb-3">{getLabel('title', 'Volume pricing')}</h3><div className="overflow-hidden rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left font-medium text-muted-foreground">{getLabel('quantityFrom', 'Qty from')}</th><th className="px-4 py-2 text-right font-medium text-muted-foreground">{getLabel('price', 'Price')}<span className="font-normal text-xs">
                                    ({getIncludeTax() ? (
  <>{getLabel('inclTax', 'incl. VAT')}</>
) : <>{getLabel('exclTax', 'excl. VAT')}</>})
                                </span></th></tr></thead><tbody className="divide-y divide-border">{getBulkPrices()?.map((tier, index) => (
  <tr className="bg-white hover:bg-muted/20 transition-colors"  key={index}><td className="px-4 py-2 text-foreground font-medium">{tier.quantity}+
                                    </td><td className="px-4 py-2 text-right text-primary font-semibold">{getPrice(tier)}</td></tr>
))}</tbody></table></div></div></>
) : null}

  </>
);
}




  export default ProductBulkPrices;


