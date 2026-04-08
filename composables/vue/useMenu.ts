/**
 * useMenu (Vue) — Category tree fetch with depth-configurable recursive GraphQL query.
 *
 * Covers: Menu component.
 * Vue mirror of react/useMenu.ts.
 * Mirrors the fetch logic of ui-components/Menu.lite.tsx exactly.
 *
 * Responsibilities:
 * - Dynamic recursive GraphQL category query (depth-configurable, default 3)
 * - localStorage cache with 12h TTL, user-specific cache key
 * - Maps LocalizedString arrays to flat name/slug strings per language
 */

import { ref, type Ref } from 'vue';
import type { GraphQLClient } from 'propeller-sdk-v2';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Raw category shape returned by the recursive GraphQL query */
interface MenuCategoryRaw {
  categoryId: number;
  name: Array<{ value: string; language: string }>;
  slug: Array<{ value: string }>;
  categories?: MenuCategoryRaw[];
}

export interface MenuCategory {
  categoryId: number;
  name: string;
  slug: string;
  children: MenuCategory[];
}

export interface UseMenuOptions {
  graphqlClient: GraphQLClient;
  language?: Ref<string>;
  /** Nesting depth for the category tree. Default: 3 (mirrors Menu.lite.tsx). */
  depth?: number;
  /** Cache TTL in milliseconds. Default: 12h. */
  cacheTtlMs?: number;
}

export interface UseMenuReturn {
  categories: Ref<MenuCategory[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchMenu: (rootCategoryId: number, userKey?: string) => Promise<void>;
  clearCache: (rootCategoryId: number, language: string, userKey?: string) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_TTL_DEFAULT = 12 * 60 * 60 * 1000; // 12h

// ── Pure helpers (module-level, no reactive deps) ─────────────────────────────

/**
 * Builds recursive `categories { ... }` fragment string for the GraphQL query.
 * Mirrors Menu.lite.tsx buildCategoriesQuery() exactly.
 */
function buildCategoriesQuery(depth: number): string {
  if (depth === 0) return '';
  return `
    categories {
      categoryId
      name(language: $language) { value language }
      slug(language: $language) { value }
      ${buildCategoriesQuery(depth - 1)}
    }
  `;
}

/**
 * Maps a raw SDK category (LocalizedString arrays) to a flat MenuCategory.
 * Picks the entry matching `language`, falls back to first entry.
 */
function mapCategory(raw: MenuCategoryRaw, language: string): MenuCategory {
  const nameEntry = raw.name?.find(n => n.language === language) ?? raw.name?.[0];
  const slugEntry = raw.slug?.[0];
  return {
    categoryId: raw.categoryId,
    name: nameEntry?.value ?? '',
    slug: slugEntry?.value ?? '',
    children: (raw.categories ?? []).map(child => mapCategory(child, language)),
  };
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useMenu(options: UseMenuOptions): UseMenuReturn {
  const { graphqlClient } = options;
  const languageRef = options.language ?? ref('NL');
  const depth = options.depth ?? 3;
  const cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_DEFAULT;

  const categories = ref<MenuCategory[]>([]) as Ref<MenuCategory[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── Cache helpers ──────────────────────────────────────────────────────────

  function cacheKey(categoryId: number, lang: string, userKey = ''): string {
    return `propeller_menu_${categoryId}_${lang}${userKey ? `_${userKey}` : ''}`;
  }

  function getFromCache(key: string): MenuCategory[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed: { data: MenuCategory[]; expiresAt: number } = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) { localStorage.removeItem(key); return null; }
      return parsed.data;
    } catch { return null; }
  }

  function saveToCache(key: string, data: MenuCategory[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + cacheTtlMs }));
    } catch { /* localStorage quota exceeded — silently ignore */ }
  }

  function clearCache(rootCategoryId: number, lang: string, userKey = ''): void {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(cacheKey(rootCategoryId, lang, userKey)); } catch {}
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchMenu(rootCategoryId: number, userKey = ''): Promise<void> {
    const lang = languageRef.value || 'NL';
    const key = cacheKey(rootCategoryId, lang, userKey);
    const cached = getFromCache(key);
    if (cached) { categories.value = cached; return; }

    loading.value = true;
    error.value = null;
    try {
      // Build recursive query — mirrors Menu.lite.tsx buildCategoriesQuery() + query string
      const gql = `
        query Menu($categoryId: Float, $language: String) {
          category(categoryId: $categoryId) {
            categoryId
            name(language: $language) { value language }
            slug(language: $language) { value }
            ${buildCategoriesQuery(depth)}
          }
        }
      `;
      const variables: Record<string, unknown> = { categoryId: rootCategoryId, language: lang };

      // graphqlClient.query() extracts .data and throws on GraphQL errors
      const data = await graphqlClient.query<{ category: MenuCategoryRaw }>(gql, variables);
      const root = data?.category ?? null;

      // Return subcategories of root (L1 items) — same as Menu.lite.tsx getSubCategories(rootCategory)
      const items: MenuCategory[] = root
        ? (root.categories ?? []).map(cat => mapCategory(cat, lang))
        : [];

      categories.value = items;
      if (items.length > 0) saveToCache(key, items);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch menu';
    } finally {
      loading.value = false;
    }
  }

  return { categories, loading, error, fetchMenu, clearCache };
}
