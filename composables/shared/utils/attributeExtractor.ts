/**
 * attributeExtractor — Extracts string values from SDK AttributeResult objects.
 *
 * Handles both the legacy Propeller SDK format and the current type-based format.
 * Shared by ClusterConfigurator and ProductSpecifications.
 *
 * Framework-agnostic pure functions.
 */

import type { AttributeResult } from 'propeller-sdk-v2';
import { AttributeType } from 'propeller-sdk-v2';

/**
 * Checks whether an AttributeResult matches a given target attribute name,
 * looking at the SDK name field and all localised descriptions.
 */
export function attributeNameMatches(
  attr: AttributeResult,
  targetName: string
): boolean {
  const desc = attr.attributeDescription;
  if (!desc) return false;
  if (desc.name === targetName) return true;
  if (desc.descriptions?.some((d: any) => d.value === targetName)) return true;
  return false;
}

/**
 * Extracts the display name for an attribute from its descriptions array.
 * Falls back to the SDK `name` field, then to attributeName.
 */
export function getAttributeDisplayName(
  attr: AttributeResult,
  language?: string
): string {
  const desc = attr.attributeDescription;
  if (!desc) return '';

  if (language && desc.descriptions?.length) {
    const lang = language.toUpperCase();
    const match = desc.descriptions.find((d: any) => d.language?.toUpperCase() === lang);
    if (match?.value) return match.value;
  }

  return desc.descriptions?.[0]?.value ?? desc.name ?? '';
}

/**
 * Extracts string values from an AttributeResult.
 *
 * Supports:
 * - Legacy SDK: `colorValue`, `textValues[0].values`, `textValue`, `numericValue`, `booleanValue`
 * - Current SDK (type-based): `COLOR | TEXT | DECIMAL | INT | ENUM`
 * - Fallback: string coercion + object property mining
 */
export function extractAttributeValues(attr: AttributeResult): string[] {
  const values: string[] = [];
  const v = attr.value as any;

  if (!v) return values;

  // ── Legacy SDK format ────────────────────────────────────────────────────
  if (v.colorValue) {
    values.push(v.colorValue);
  } else if (v.textValues?.[0]?.values) {
    return (v.textValues[0].values as string[]).filter(Boolean);
  } else if (v.textValue) {
    values.push(v.textValue);
  } else if (v.numericValue !== undefined) {
    values.push(String(v.numericValue));
  } else if (v.booleanValue !== undefined) {
    values.push(v.booleanValue ? 'Yes' : 'No');
  }

  // ── Current SDK format (type-based) ─────────────────────────────────────
  else if (v.type === AttributeType.COLOR) {
    if (v.value) values.push(v.value);
  } else if (v.type === AttributeType.TEXT) {
    const textVals: string[] = v.value?.textValues?.[0]?.values ?? [];
    return textVals.filter(Boolean);
  } else if (v.type === AttributeType.DECIMAL) {
    if (v.value !== undefined) values.push(String(v.value));
  } else if (v.type === AttributeType.INT) {
    if (v.value !== undefined) values.push(String(v.value));
  } else if (v.type === AttributeType.ENUM) {
    if (v.value) values.push(v.value);
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  else if (typeof v === 'string') {
    values.push(v);
  } else if (typeof v === 'object') {
    if (Array.isArray(v.values)) {
      return (v.values as any[]).filter((x) => typeof x === 'string');
    }
    const strVals = Object.values(v).filter((x) => typeof x === 'string');
    return strVals as string[];
  }

  return values.filter(Boolean);
}

/**
 * Collects all unique values for a named attribute across a list of products.
 */
export function collectAttributeValues(
  products: import('propeller-sdk-v2').Product[],
  attributeName: string
): string[] {
  const set = new Set<string>();
  for (const product of products) {
    const items = product.attributes?.items as AttributeResult[] | undefined;
    if (!Array.isArray(items)) continue;
    for (const attr of items) {
      if (attributeNameMatches(attr, attributeName)) {
        extractAttributeValues(attr).forEach((v) => set.add(v));
      }
    }
  }
  return Array.from(set);
}

/**
 * Filters a product list to those that match ALL given attribute selections.
 */
export function filterProductsBySelections(
  products: import('propeller-sdk-v2').Product[],
  selections: Record<string, string>
): import('propeller-sdk-v2').Product[] {
  const entries = Object.entries(selections);
  if (entries.length === 0) return products;

  return products.filter((product) => {
    const items = product.attributes?.items as AttributeResult[] | undefined;
    if (!Array.isArray(items)) return false;
    return entries.every(([attrName, attrValue]) =>
      items.some(
        (attr) =>
          attributeNameMatches(attr, attrName) &&
          extractAttributeValues(attr).includes(attrValue)
      )
    );
  });
}
