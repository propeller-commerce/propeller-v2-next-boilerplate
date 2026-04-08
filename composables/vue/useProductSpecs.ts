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
import type { GraphQLClient, AttributeResult, AttributeResultSearchInput } from 'propeller-sdk-v2';
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

  // Mirrors ProductSpecifications.lite.tsx buildGroups logic.
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
        type: attr.value?.type || 'TEXT',
      };

      const groupName = attr.attributeDescription?.group || '';
      if (groupName) {
        if (!groupMap[groupName]) groupMap[groupName] = [];
        groupMap[groupName].push(item);
      } else {
        ungrouped.push(item);
      }
    }

    const groups: AttributeGroup[] = Object.entries(groupMap).map(([name, attributes]) => ({
      name,
      attributes,
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
      // Mirrors ProductSpecifications.lite.tsx: isPublic: true, page: 1, offset: 2000
      const searchInput: AttributeResultSearchInput = {
        attributeDescription: { isPublic: true },
        page: 1,
        offset: 2000,
      };
      const result = await service.getAttributeResultByProductId(productId, searchInput);
      const items: AttributeResult[] = result?.items ?? [];
      attributes.value = items;
      groupedAttributes.value = buildGroups(items, language);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch specifications';
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
