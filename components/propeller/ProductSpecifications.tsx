'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'



  export interface ProductSpecificationsProps {
/**
 * Initialised Propeller SDK GraphQL client.
 * Required when `attributes` is not provided and `productId` is set —
 * used to internally fetch public attributes for the product.
 */
graphqlClient?: GraphQLClient;

/**
 * Product ID to fetch attributes for.
 * Only used when `attributes` is not provided.
 */
productId?: number;

/**
 * Pre-fetched attribute result items.
 * When provided the component skips internal fetching.
 * Obtain from `product.attributes?.items` or a separate attribute fetch.
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

  import  { GraphQLClient, ProductService, AttributeResult, LocalizedString } from 'propeller-sdk-v2';



  function ProductSpecifications(props:ProductSpecificationsProps) {

  const [internalAttributes, setInternalAttributes] = useState<ProductSpecificationsState["internalAttributes"]>(() => ([]))


const [loading, setLoading] = useState<ProductSpecificationsState["loading"]>(() => (false))


function getAttributes(): ReturnType<ProductSpecificationsState["getAttributes"]>{
const attrs = props.attributes as AttributeResult[] || internalAttributes;
return attrs.filter((a: AttributeResult) => a.attributeDescription?.isPublic === true);
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
const val = attr.value?.value;
if (val === null || val === undefined) return '';
if (typeof val === 'boolean') return val ? 'Yes' : 'No';
return String(val);
}


function hasPublicAttributes(): ReturnType<ProductSpecificationsState["hasPublicAttributes"]>{
return getAttributes().length > 0;
}








useEffect(() => {
      if (props.attributes) return;
if (!props.productId || !props.graphqlClient) return;
setLoading(true);
const service = new ProductService(props.graphqlClient as GraphQLClient);
service.getAttributeResultByProductId(props.productId as number, {
attributeDescription: {
isPublic: true
}
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
  <><div  className={`product-specifications ${props.className as string || ''}`}>{getGroups()?.map((group) => (
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
))}</div></>
) : null}

  </>
);
}




  export default ProductSpecifications;


