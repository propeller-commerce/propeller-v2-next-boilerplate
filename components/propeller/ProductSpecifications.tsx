'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'



  export interface ProductSpecificationsProps {
/**
 * Initialised Propeller SDK GraphQL client.
 * Required when `productId` is set — used to fetch public attributes.
 */
graphqlClient?: GraphQLClient;

/**
 * Product ID to fetch attributes for.
 */
productId?: number;

/**
 * Pre-fetched attribute result items used as fallback when `productId` is not provided.
 * When `productId` is provided the component fetches its own data and this prop is ignored.
 */
attributes?: AttributeResult[];

/**
 * Language code used to resolve localised attribute labels.
 * Defaults to 'NL'.
 */
language?: string;

/**
 * Display layout for the specifications.
 * 'table' — two-column table (name | value). Default.
 * 'list'  — vertical label + value stacked rows.
 */
layout?: string;

/**
 * When true, groups attributes by their group field with a heading per section.
 * When false or omitted, displays a flat ungrouped table/list. Default: false.
 */
grouping?: boolean;

/** Extra CSS class applied to the root element. */
className?: string;
}
interface ProductSpecificationsState {
internalAttributes: AttributeResult[];
loading: boolean;
getAttributes: () => AttributeResult[];
getGroups: () => string[];
getAttributesByGroup: (group: string) => AttributeResult[];
getAttributeLabel: (attr: AttributeResult) => string;
getAttributeValue: (attr: AttributeResult) => string;
hasPublicAttributes: () => boolean;
}

  import  { GraphQLClient, ProductService, AttributeResult, LocalizedString, Enums } from 'propeller-sdk-v2';



  function ProductSpecifications(props:ProductSpecificationsProps) {

  const [internalAttributes, setInternalAttributes] = useState<ProductSpecificationsState["internalAttributes"]>(() => ([]))


const [loading, setLoading] = useState<ProductSpecificationsState["loading"]>(() => (false))


function getAttributes(): ReturnType<ProductSpecificationsState["getAttributes"]>{
// Prefer fetched internalAttributes; fall back to props.attributes
const attrs = internalAttributes.length ? internalAttributes : props.attributes as AttributeResult[] || [];
return attrs.filter((a: AttributeResult) => a.attributeDescription?.isPublic === true && getAttributeValue(a) !== '' && getAttributeValue(a) !== null && getAttributeValue(a) !== '0');
}


function getGroups(): ReturnType<ProductSpecificationsState["getGroups"]>{
const attrs = getAttributes();
const seen: string[] = [];
attrs.forEach((a: AttributeResult) => {
const group = a.attributeDescription?.group || '';
if (!seen.includes(group)) seen.push(group);
});
return seen;
}


function getAttributesByGroup(group: string): ReturnType<ProductSpecificationsState["getAttributesByGroup"]>{
return getAttributes().filter((a: AttributeResult) => (a.attributeDescription?.group || '') === group);
}


function getAttributeLabel(attr: AttributeResult): ReturnType<ProductSpecificationsState["getAttributeLabel"]>{
const lang = props.language as string || 'NL';
const descs = attr.attributeDescription?.descriptions || [];
const match = descs.find((d: LocalizedString) => d.language === lang);
return match?.value || attr.attributeDescription?.name || '';
}


function getAttributeValue(attr: AttributeResult): ReturnType<ProductSpecificationsState["getAttributeValue"]>{
const v = attr.value;
if (!v) return '';
const lang = props.language as string || 'NL';
if (v.type === Enums.AttributeType.TEXT) {
const entry = (v as any).textValues?.find((tv: any) => tv.language === lang);
const vals = (entry?.values || []).filter(Boolean);
return vals.join(', ');
}
if (v.type === Enums.AttributeType.ENUM) {
const vals = ((v as any).enumValues || []).filter(Boolean);
return vals.join(', ');
}
if (v.type === Enums.AttributeType.INT) {
const val = (v as any).intValue;
return val !== null && val !== undefined ? String(val) : '';
}
if (v.type === Enums.AttributeType.DECIMAL) {
const val = (v as any).decimalValue;
return val !== null && val !== undefined ? String(val) : '';
}
if (v.type === Enums.AttributeType.DATETIME) {
return (v as any).dateTimeValue || '';
}
if (v.type === Enums.AttributeType.COLOR) {
return (v as any).colorValue || '';
}
const fallback = v.value;
if (fallback === null || fallback === undefined) return '';
if (typeof fallback === 'boolean') return fallback ? 'Yes' : 'No';
return String(fallback);
}


function hasPublicAttributes(): ReturnType<ProductSpecificationsState["hasPublicAttributes"]>{
return getAttributes().length > 0;
}








useEffect(() => {
      if (!props.productId || !props.graphqlClient) return;
setLoading(true);
const service = new ProductService(props.graphqlClient as GraphQLClient);
service.getAttributeResultByProductId(props.productId as number, {
attributeDescription: {
isPublic: true
},
page: 1,
offset: 2000
}).then((result: {
items?: AttributeResult[];
}) => {
setInternalAttributes(result?.items || []);
setLoading(false);
}).catch(() => {
setLoading(false);
})
    },
    [props.productId])


return (
  <>

  {!loading && hasPublicAttributes() ? (
  <><div  className={`product-specifications ${props.className as string || ''}`}>{!props.grouping ? (
  <>{props.layout as string !== 'list' ? (
  <div className="overflow-hidden rounded-lg border border-border"><table className="w-full text-sm"><tbody className="divide-y divide-border">{getAttributes()?.map((attr, i) => (
  <tr className="odd:bg-white even:bg-muted/20"  key={i}><td className="px-4 py-2 font-medium text-foreground w-1/2">{getAttributeLabel(attr)}</td><td className="px-4 py-2 text-muted-foreground">{getAttributeValue(attr)}</td></tr>
))}</tbody></table></div>
) : null}
{props.layout as string === 'list' ? (
  <div className="space-y-3">{getAttributes()?.map((attr, i) => (
  <div className="flex flex-col gap-0.5"  key={i}><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{getAttributeLabel(attr)}</span><span className="text-sm text-foreground">{getAttributeValue(attr)}</span></div>
))}</div>
) : null}</>
) : null}{!!props.grouping ? (
  <>{getGroups()?.map((group) => (
  <div className="mb-6"  key={group}>{!!group ? (
  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group}</h4>
) : null}{props.layout as string !== 'list' ? (
  <div className="overflow-hidden rounded-lg border border-border"><table className="w-full text-sm"><tbody className="divide-y divide-border">{getAttributesByGroup(group)?.map((attr, i) => (
  <tr className="odd:bg-white even:bg-muted/20"  key={i}><td className="px-4 py-2 font-medium text-foreground w-1/2">{getAttributeLabel(attr)}</td><td className="px-4 py-2 text-muted-foreground">{getAttributeValue(attr)}</td></tr>
))}</tbody></table></div>
) : null}{props.layout as string === 'list' ? (
  <div className="space-y-3">{getAttributesByGroup(group)?.map((attr, i) => (
  <div className="flex flex-col gap-0.5"  key={i}><span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{getAttributeLabel(attr)}</span><span className="text-sm text-foreground">{getAttributeValue(attr)}</span></div>
))}</div>
) : null}</div>
))}</>
) : null}</div></>
) : null}

  </>
);
}




  export default ProductSpecifications;


