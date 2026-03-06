'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient, Cluster, ClusterService, ClusterConfigSetting, LocalizedString, Contact, Customer } from 'propeller-sdk-v2';
import  { ClusterQueryVariables } from 'propeller-sdk-v2/dist/service/ClusterService';



  export interface ClusterInfoProps {
// ── Data source ──────────────────────────────────────────────────────────
/** The authenticated user (Contact or Customer) */
user: Contact | Customer | null;
/**
 * Pre-fetched cluster object to display.
 * When provided the component skips internal fetching.
 */
cluster?: Cluster;

/**
 * Cluster ID to fetch data for when no `cluster` prop is provided.
 * Requires `graphqlClient` to be set.
 */
clusterId?: number;

/**
 * Initialised Propeller SDK GraphQL client.
 * Required when `clusterId` is provided for internal data fetching.
 */
graphqlClient?: GraphQLClient;

/**
 * Called once the cluster data is loaded — either immediately (when
 * `cluster` prop is supplied) or after the internal fetch completes.
 * Use this to hydrate sibling components (configurator, price, gallery, etc.).
 */
onClusterLoaded?: (cluster: Cluster) => void;

// ── Display toggles ───────────────────────────────────────────────────────

/** Show the cluster name. Defaults to true. */
showTitle?: boolean;

/** Show the cluster SKU. Defaults to true. */
showSku?: boolean;

// ── Locale ────────────────────────────────────────────────────────────────

/** Language code used to resolve localised names. Defaults to 'NL'. */
language?: string;

/** Extra CSS class applied to the root element. */
className?: string;

/**
 * Tax zone to use for price calculation.
 */
taxZone?: string;

/**
 * Image search filter passed to ProductService.getProduct().
 * Controls how many image items are returned.
 * Example: { page: 1, offset: 20 }
 */
imageSearchFilters?: any;

/**
 * Image variant transformation filter passed to ProductService.getProduct().
 * Controls image size/format variants returned with the product.
 * Example: imageVariantFiltersLarge from @/data/defaults
 * Defaults to { transformations: [] } when omitted.
 */
imageVariantFilters?: any;

/**
 * Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall.
 */
configuration?: any;

/**
 * Attribute codes/names to look up and display as badge overlays on the product image.
 * Each code is resolved against `product.attributes.items[].attributeDescription.code`
 * (or `.name`). Attributes with no matching value are silently omitted.
 * Example: ['new', 'sale']
 */
imageLabels?: string[];

/**
 * Attribute codes/names to look up and display as extra text rows below the product name.
 * Resolved the same way as `imageLabels`.
 * Example: ['brand', 'color']
 */
textLabels?: string[];
}
interface ClusterInfoState {
internalCluster: Cluster | null;
loading: boolean;
getCluster: () => Cluster | null;
getClusterName: () => string;
getClusterSku: () => string;
}




  function ClusterInfo(props:ClusterInfoProps) {

  const [internalCluster, setInternalCluster] = useState<ClusterInfoState["internalCluster"]>(() => (null))


const [loading, setLoading] = useState<ClusterInfoState["loading"]>(() => (false))


function getCluster(): ReturnType<ClusterInfoState["getCluster"]>{
return props.cluster as Cluster || internalCluster;
}


function getClusterName(): ReturnType<ClusterInfoState["getClusterName"]>{
const cluster = getCluster();
if (!cluster) return '';
const lang = props.language as string || 'NL';
const match = cluster.names?.find((n: LocalizedString) => n.language === lang);
return match?.value || cluster.names?.[0]?.value || '';
}


function getClusterSku(): ReturnType<ClusterInfoState["getClusterSku"]>{
return getCluster()?.sku || '';
}








useEffect(() => {
      if (props.cluster) {
if (props.onClusterLoaded) {
props.onClusterLoaded(props.cluster);
}
return;
}
if (!props.clusterId || !props.graphqlClient) return;
setLoading(true);
const service = new ClusterService(props.graphqlClient as GraphQLClient);
const lang = props.language as string || 'NL';
const taxZone = props.taxZone || 'NL';
service.getClusterConfig(props.clusterId as number).then((clusterConfig: Cluster) => {
const attributeNames: string[] = clusterConfig?.config?.settings?.map((setting: ClusterConfigSetting) => setting.name) || [];
const variables: ClusterQueryVariables = {
clusterId: props.clusterId as number,
imageSearchFilters: props.imageSearchFilters || props.configuration.imageSearchFiltersGrid,
imageVariantFilters: props.imageVariantFilters || props.configuration.imageVariantFiltersMedium,
language: lang,
priceCalculateProductInput: {
  taxZone: taxZone,
  ...(props.user && 'company' in props.user && {
    companyId: (props.user as Contact)?.company?.companyId
  }),
  ...(props.user && 'contactId' in props.user && {
    contactId: (props.user as Contact)?.contactId
  }),
  ...(props.user && 'customerId' in props.user && {
    customerId: (props.user as Customer)?.customerId
  })
},
...(attributeNames.length > 0 && {
  attributeResultSearchInput: {
    attributeDescription: {
      names: attributeNames
    }
  }
})
};
return service.getCluster(variables);
}).then((cluster: Cluster) => {
setInternalCluster(cluster);
setLoading(false);
if (props.onClusterLoaded) {
props.onClusterLoaded(cluster);
}
}).catch(() => {
setLoading(false);
})
    },
    [props.clusterId, props.cluster])


return (


  <div  className={`cluster-info ${props.className as string || ''}`}>{loading && !props.cluster ? (
  <div className="animate-pulse space-y-3"><div className="h-4 bg-slate-100 rounded w-1/4"  /><div className="h-8 bg-slate-100 rounded w-3/4"  /></div>
) : null}{!loading || !!props.cluster ? (
  <>{props.showSku !== false && !!getClusterSku() ? (
  <div className="text-sm font-mono text-muted-foreground mb-2">
                    SKU: {getClusterSku()}</div>
) : null}
{props.showTitle !== false && !!getClusterName() ? (
  <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">{getClusterName()}</h1>
) : null}</>
) : null}</div>


);
}




  export default ClusterInfo;


