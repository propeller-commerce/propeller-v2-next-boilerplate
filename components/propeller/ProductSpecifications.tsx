'use client';
/**
 * @rsc-blocked — Client-only component: side effects (useEffect).
 * Must be rendered inside (or below) a Client Component boundary; cannot be
 * imported directly into a React Server Component. The 'use client' header
 * above marks this boundary to Next.js.
 */
import * as React from 'react';

import { useEffect } from 'react';
import {
  AttributeResult,
  AttributeType,
  GraphQLClient,
  LocalizedString,
} from 'propeller-sdk-v2';
import type {
  AttributeTextValue,
  AttributeEnumValue,
  AttributeIntValue,
  AttributeDecimalValue,
  AttributeColorValue,
  AttributeDateTimeValue,
} from 'propeller-sdk-v2';
import { useProductSpecs } from '@/composables/react/useProductSpecs';
import { useInfraProps } from '@/composables/react/useInfraProps';

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

function ProductSpecifications(rawProps: ProductSpecificationsProps) {
  // Explicit props win; otherwise infra is resolved from <PropellerProvider>.
  const props = useInfraProps(rawProps);
  const { attributes: fetchedAttributes, loading, fetchSpecs } = useProductSpecs(
    props.graphqlClient
      ? { graphqlClient: props.graphqlClient, language: props.language }
      : { graphqlClient: {} as GraphQLClient, language: props.language }
  );

  function getAttributes(): AttributeResult[] {
    // Prefer fetched internalAttributes; fall back to props.attributes
    const attrs = fetchedAttributes.length
      ? fetchedAttributes
      : (props.attributes as AttributeResult[]) || [];
    return attrs.filter(
      (a: AttributeResult) =>
        a.attributeDescription?.isPublic === true &&
        getAttributeValue(a) !== '' &&
        getAttributeValue(a) !== null &&
        getAttributeValue(a) !== '0'
    );
  }

  function getGroups(): string[] {
    const attrs = getAttributes();
    const seen: string[] = [];
    attrs.forEach((a: AttributeResult) => {
      const group = a.attributeDescription?.group || '';
      if (!seen.includes(group)) seen.push(group);
    });
    return seen;
  }

  function getAttributesByGroup(group: string): AttributeResult[] {
    return getAttributes().filter(
      (a: AttributeResult) => (a.attributeDescription?.group || '') === group
    );
  }

  function getAttributeLabel(attr: AttributeResult): string {
    const lang = (props.language as string) || 'NL';
    const descs = attr.attributeDescription?.descriptions || [];
    const match = descs.find((d: LocalizedString) => d.language === lang);
    return match?.value || attr.attributeDescription?.name || '';
  }

  function getAttributeValue(attr: AttributeResult): string {
    const v = attr.value;
    if (!v) return '';
    const lang = (props.language as string) || 'NL';
    // AttributeValue is a discriminated union by `type`. The SDK's base
    // interface only types `value: any`; each concrete attribute type adds a
    // field with the type-specific shape. We cast through the corresponding
    // SDK type per branch to get real autocompletion / safety on the field
    // we expect to read.
    if (v.type === AttributeType.TEXT) {
      const tv = v as AttributeTextValue;
      const entry = tv.textValues?.find((row) => row.language === lang);
      const vals = (entry?.values || []).filter(Boolean);
      return vals.join(', ');
    }
    if (v.type === AttributeType.ENUM) {
      const ev = v as AttributeEnumValue;
      const vals = (ev.enumValues || []).filter(Boolean);
      return vals.join(', ');
    }
    if (v.type === AttributeType.INT) {
      const iv = v as AttributeIntValue;
      return iv.intValue !== null && iv.intValue !== undefined ? String(iv.intValue) : '';
    }
    if (v.type === AttributeType.DECIMAL) {
      const dv = v as AttributeDecimalValue;
      return dv.decimalValue !== null && dv.decimalValue !== undefined ? String(dv.decimalValue) : '';
    }
    if (v.type === AttributeType.DATETIME) {
      return (v as AttributeDateTimeValue).dateTimeValue || '';
    }
    if (v.type === AttributeType.COLOR) {
      return (v as AttributeColorValue).colorValue || '';
    }
    const fallback = v.value;
    if (fallback === null || fallback === undefined) return '';
    if (typeof fallback === 'boolean') return fallback ? 'Yes' : 'No';
    return String(fallback);
  }

  function hasPublicAttributes(): boolean {
    return getAttributes().length > 0;
  }

  useEffect(() => {
    if (!props.productId || !props.graphqlClient) return;
    fetchSpecs(props.productId);
  }, [props.productId]);

  return (
    <>
      {!loading && hasPublicAttributes() ? (
        <>
          <div
            className={`propeller-product-specifications ${(props.className as string) || ''}`}
            data-layout={(props.layout as string) === 'list' ? 'list' : 'table'}
            data-grouped={props.grouping ? 'true' : 'false'}
          >
            {!props.grouping ? (
              <>
                {(props.layout as string) !== 'list' ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border">
                        {getAttributes()?.map((attr, i) => (
                          <tr className="propeller-product-specifications__row odd:bg-card even:bg-muted/20" key={i}>
                            <td className="px-4 py-2 font-medium text-foreground w-1/2">
                              {getAttributeLabel(attr)}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">
                              {getAttributeValue(attr)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {(props.layout as string) === 'list' ? (
                  <div className="space-y-3">
                    {getAttributes()?.map((attr, i) => (
                      <div className="flex flex-col gap-0.5" key={i}>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {getAttributeLabel(attr)}
                        </span>
                        <span className="text-sm text-foreground">{getAttributeValue(attr)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            {!!props.grouping ? (
              <>
                {getGroups()?.map((group) => (
                  <div className="mb-6" key={group}>
                    {!!group ? (
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {group}
                      </h4>
                    ) : null}
                    {(props.layout as string) !== 'list' ? (
                      <div className="overflow-hidden rounded-lg border border-border">
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-border">
                            {getAttributesByGroup(group)?.map((attr, i) => (
                              <tr className="propeller-product-specifications__row odd:bg-card even:bg-muted/20" key={i}>
                                <td className="px-4 py-2 font-medium text-foreground w-1/2">
                                  {getAttributeLabel(attr)}
                                </td>
                                <td className="px-4 py-2 text-muted-foreground">
                                  {getAttributeValue(attr)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                    {(props.layout as string) === 'list' ? (
                      <div className="space-y-3">
                        {getAttributesByGroup(group)?.map((attr, i) => (
                          <div className="flex flex-col gap-0.5" key={i}>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              {getAttributeLabel(attr)}
                            </span>
                            <span className="text-sm text-foreground">
                              {getAttributeValue(attr)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}

export default ProductSpecifications;
