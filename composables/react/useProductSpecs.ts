/**
 * useProductSpecs (React) — Product attribute fetch and grouping.
 *
 * React mirror of vue/useProductSpecs.ts.
 */

import { useState, useCallback } from 'react';
import { ProductService } from 'propeller-sdk-v2';
import type { GraphQLClient, AttributeResult } from 'propeller-sdk-v2';
import { extractAttributeValues, getAttributeDisplayName } from '../shared/utils/attributeExtractor';

export interface AttributeGroup {
  name: string;
  attributes: AttributeDisplayItem[];
}

export interface AttributeDisplayItem {
  name: string;
  displayName: string;
  values: string[];
  type: string;
}

export interface UseProductSpecsOptions {
  graphqlClient: GraphQLClient;
  language?: string;
}

export interface UseProductSpecsReturn {
  attributes: AttributeResult[];
  groupedAttributes: AttributeGroup[];
  loading: boolean;
  error: string | null;
  fetchSpecs: (productId: number) => Promise<void>;
}

export function useProductSpecs(options: UseProductSpecsOptions): UseProductSpecsReturn {
  const { graphqlClient } = options;
  const language = options.language || 'NL';

  const [attributes, setAttributes] = useState<AttributeResult[]>([]);
  const [groupedAttributes, setGroupedAttributes] = useState<AttributeGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildGroups(attrs: AttributeResult[]): AttributeGroup[] {
    const ungrouped: AttributeDisplayItem[] = [];
    const groupMap: Record<string, AttributeDisplayItem[]> = {};
    for (const attr of attrs) {
      const values = extractAttributeValues(attr);
      if (!values.length) continue;
      const displayName = getAttributeDisplayName(attr, language);
      const item: AttributeDisplayItem = { name: attr.attributeDescription?.name || '', displayName, values, type: (attr.value as any)?.type || 'TEXT' };
      const groupName = (attr.attributeDescription as any)?.group || '';
      if (groupName) {
        if (!groupMap[groupName]) groupMap[groupName] = [];
        groupMap[groupName].push(item);
      } else { ungrouped.push(item); }
    }
    const groups: AttributeGroup[] = Object.entries(groupMap).map(([name, attrs]) => ({ name, attributes: attrs }));
    if (ungrouped.length) groups.push({ name: '', attributes: ungrouped });
    return groups;
  }

  const fetchSpecs = useCallback(async (productId: number): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const service = new ProductService(graphqlClient);
      const result = await service.getAttributeResultByProductId(productId, {} as any);
      const items = ((result as any)?.items as AttributeResult[]) || [];
      setAttributes(items);
      setGroupedAttributes(buildGroups(items));
    } catch (e: any) { setError(e?.message || 'Failed to fetch specifications'); }
    finally { setLoading(false); }
  }, [graphqlClient, language]);

  return { attributes, groupedAttributes, loading, error, fetchSpecs };
}
