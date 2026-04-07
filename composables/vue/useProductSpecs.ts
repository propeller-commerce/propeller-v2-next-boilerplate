/**
 * useProductSpecs (Vue) — Product attribute fetch and grouping.
 *
 * Covers: ProductSpecifications component.
 *
 * Responsibilities:
 * - AttributeService.getAttributeResultByProductId
 * - Type-based value extraction (reuses attributeExtractor utility)
 * - Group attributes by category/group
 */

import { ref, type Ref } from 'vue';
import { ProductService } from 'propeller-sdk-v2';
import type { GraphQLClient, AttributeResult } from 'propeller-sdk-v2';
import {
  extractAttributeValues,
  getAttributeDisplayName,
} from '../shared/utils/attributeExtractor';

// ── Types ────────────────────────────────────────────────────────────────────

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
  language?: Ref<string>;
}

export interface UseProductSpecsReturn {
  attributes: Ref<AttributeResult[]>;
  groupedAttributes: Ref<AttributeGroup[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchSpecs: (productId: number) => Promise<void>;
}

export function useProductSpecs(options: UseProductSpecsOptions): UseProductSpecsReturn {
  const { graphqlClient } = options;
  const languageRef = options.language ?? ref('NL');

  const attributes = ref<AttributeResult[]>([]) as Ref<AttributeResult[]>;
  const groupedAttributes = ref<AttributeGroup[]>([]) as Ref<AttributeGroup[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  function buildGroups(attrs: AttributeResult[], language: string): AttributeGroup[] {
    const ungrouped: AttributeDisplayItem[] = [];
    const groupMap: Record<string, AttributeDisplayItem[]> = {};

    for (const attr of attrs) {
      const values = extractAttributeValues(attr);
      if (!values.length) continue;

      const displayName = getAttributeDisplayName(attr, language);
      const item: AttributeDisplayItem = {
        name: attr.attributeDescription?.name || '',
        displayName,
        values,
        type: (attr.value as any)?.type || 'TEXT',
      };

      const groupName = (attr.attributeDescription as any)?.group || '';
      if (groupName) {
        if (!groupMap[groupName]) groupMap[groupName] = [];
        groupMap[groupName].push(item);
      } else {
        ungrouped.push(item);
      }
    }

    const groups: AttributeGroup[] = Object.entries(groupMap).map(([name, attrs]) => ({
      name,
      attributes: attrs,
    }));

    if (ungrouped.length) {
      groups.push({ name: '', attributes: ungrouped });
    }

    return groups;
  }

  async function fetchSpecs(productId: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = new ProductService(graphqlClient);
      const language = languageRef.value || 'NL';
      const result = await service.getAttributeResultByProductId(productId, {} as any);
      const items = ((result as any)?.items as AttributeResult[]) || [];
      attributes.value = items;
      groupedAttributes.value = buildGroups(items, language);
    } catch (e: any) {
      error.value = e?.message || 'Failed to fetch specifications';
    } finally {
      loading.value = false;
    }
  }

  return {
    attributes,
    groupedAttributes,
    loading,
    error,
    fetchSpecs,
  };
}
