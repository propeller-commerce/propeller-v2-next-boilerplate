'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient, CartService, Cart, CartActionCodeVariables } from 'propeller-sdk-v2';



  export interface ActionCodeProps {
/** GraphQL client for the Propeller SDK */
graphqlClient: GraphQLClient;

/** The shopping cart used to populate the cart summary data */
cart: Cart;

/** Action code block title */
title?: string;

/** Labels for the component */
labels?: Record<string, string>;

/** Display the option to remove the action code of the shopping cart. Defaults to true. */
showRemoveCode?: boolean;

/** Action handler when action code is added to the cart */
onActionCodeApply?: (code: string, cart: Cart) => void;

/** Action handler when action code is removed from the cart */
onActionCodeRemove?: (code: string, cart: Cart) => void;

/** Action callback method after action code is applied */
afterActionCodeApply?: (cart: Cart) => void;

/** Action callback method after action code is removed */
afterActionCodeRemove?: (cart: Cart) => void;

/** Configuration object for image filters */
configuration?: any;

/** Language code for CartService operations. Defaults to 'NL'. */
language?: string;
}
interface ActionCodeState {
code: string;
loading: boolean;
error: string;
isMounted: boolean;
getLabel: (key: string, fallback: string) => string;
title: () => string;
showRemoveCode: () => boolean;
appliedCode: () => string;
hasAppliedCode: () => boolean;
handleApply: () => Promise<void>;
handleRemove: () => Promise<void>;
handleKeyDown: (e: any) => void;
}




  function ActionCode(props:ActionCodeProps) {

  const [code, setCode] = useState<ActionCodeState["code"]>(() => (''))


const [loading, setLoading] = useState<ActionCodeState["loading"]>(() => (false))


const [error, setError] = useState<ActionCodeState["error"]>(() => (''))


const [isMounted, setIsMounted] = useState<ActionCodeState["isMounted"]>(() => (false))


function getLabel(key: string, fallback: string): ReturnType<ActionCodeState["getLabel"]>{
return props.labels?.[key] || fallback;
}


function title(): ReturnType<ActionCodeState["title"]>{
return props.title || 'Action code';
}


function showRemoveCode(): ReturnType<ActionCodeState["showRemoveCode"]>{
return props.showRemoveCode !== undefined ? props.showRemoveCode : true;
}


function appliedCode(): ReturnType<ActionCodeState["appliedCode"]>{
return props.cart?.actionCode || '';
}


function hasAppliedCode(): ReturnType<ActionCodeState["hasAppliedCode"]>{
return !!props.cart?.actionCode;
}


async function handleApply(): ReturnType<ActionCodeState["handleApply"]>{
if (!code.trim() || loading) return;
setLoading(true);
setError('');
if (props.onActionCodeApply) {
props.onActionCodeApply(code.trim(), props.cart);
setLoading(false);
return;
}
const cartService = new CartService(props.graphqlClient);
const cartActionCodeVariables: CartActionCodeVariables = {
id: props.cart?.cartId,
input: {
  actionCode: code.trim()
},
language: props.language || 'NL',
imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
imageVariantFilters: props.configuration?.imageVariantFiltersSmall
};
await cartService.addActionCodeToCart(cartActionCodeVariables).then((updatedCart: Cart) => {
setLoading(false);
setCode('');
if (props.afterActionCodeApply) {
  props.afterActionCodeApply(updatedCart);
}
}).catch((error: any) => {
setLoading(false);
setError(getLabel('errorApply', 'Failed to apply action code. Please try again.'));
console.error('Failed to apply action code:', error);
});
}


async function handleRemove(): ReturnType<ActionCodeState["handleRemove"]>{
if (loading || !hasAppliedCode()) return;
setLoading(true);
setError('');
const code = appliedCode();
if (props.onActionCodeRemove) {
props.onActionCodeRemove(code, props.cart);
setLoading(false);
return;
}
const cartService = new CartService(props.graphqlClient);
const cartActionCodeVariables: CartActionCodeVariables = {
id: props.cart?.cartId,
input: {
  actionCode: code
},
language: props.language || 'NL',
imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
imageVariantFilters: props.configuration?.imageVariantFiltersSmall
};
await cartService.removeActionCodeFromCart(cartActionCodeVariables).then((updatedCart: Cart) => {
setLoading(false);
if (props.afterActionCodeRemove) {
  props.afterActionCodeRemove(updatedCart);
}
}).catch((error: any) => {
setLoading(false);
setError(getLabel('errorRemove', 'Failed to remove action code. Please try again.'));
console.error('Failed to remove action code:', error);
});
}


function handleKeyDown(e: any): ReturnType<ActionCodeState["handleKeyDown"]>{
if (e.key === 'Enter') {
handleApply();
}
}







useEffect(() => {
      setIsMounted(true)
    }, [])



return (


  <div className="w-full bg-white p-6 rounded-lg shadow space-y-3"><h2 className="text-lg font-bold">{title()}</h2>{isMounted ? (
  <>{hasAppliedCode() ? (
  <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-md px-3 py-2"><div className="flex items-center gap-2"><svg  fill="none"  viewBox="0 0 24 24"  stroke="currentColor" className="w-4 h-4 text-violet-600"  strokeWidth={2}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"  /></svg><span className="text-sm font-medium text-violet-700">{appliedCode()}</span></div>{showRemoveCode() ? (
  <button  type="button" className="text-violet-600 hover:text-violet-800 text-sm font-medium transition-colors disabled:opacity-50"  onClick={(event) => handleRemove() }  disabled={loading}>{getLabel('remove', 'Remove')}</button>
) : null}</div>
) : null}
{!hasAppliedCode() ? (
  <div className="flex gap-2"><input  type="text" className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"  value={code}  onChange={(e) => {
setCode(e.target.value);
} }  onKeyDown={(e) => handleKeyDown(e) }  placeholder={getLabel('placeholder', 'Enter action code')}  disabled={loading}  /><button  type="button" className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"  onClick={(event) => handleApply() }  disabled={loading || !code.trim()}>{loading ? (
  <>{getLabel('applying', 'Applying...')}</>
) : null}{!loading ? (
  <>{getLabel('apply', 'Apply')}</>
) : null}</button></div>
) : null}
{!!error ? (
  <p className="text-sm text-red-600">{error}</p>
) : null}</>
) : null}</div>


);
}




  export default ActionCode;


