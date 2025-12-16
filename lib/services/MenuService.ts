'use client';

import { graphqlClient } from '../api';

const CACHE_KEY = 'menuData';
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

export class MenuService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    this.initialized = true;
  }

  async getMenu() {
    const cached = this.getCachedMenu();
    if (cached) return cached;

    const depth = parseInt(process.env.NEXT_PUBLIC_MENU_DEPTH || '3', 10);
    const categoryId = parseInt(process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '17', 10);
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';

    // Build nested categories query
    const buildCategoriesQuery = (currentDepth: number): string => {
      if (currentDepth === 0) return '';
      return `
        categories {
          categoryId
          name(language: $language) { value language }
          slug(language: $language) { value }
          ${buildCategoriesQuery(currentDepth - 1)}
        }
      `;
    };

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

    const variables = { categoryId, language };

    try {
      console.log('🔍 Fetching menu with query:', gql.substring(0, 200) + '...');
      const response = await graphqlClient.execute({ query: gql, variables });
      console.log('📦 Raw menu response:', response);
      
      // GraphQL responses come wrapped in a 'data' property
      const menuData = response?.data || response;
      console.log('📋 Processed menu data:', menuData);
      
      this.cacheMenu(menuData);
      return menuData;
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      return null;
    }
  }

  private getCachedMenu() {
    if (typeof window === 'undefined') return null;
    
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    try {
      const parsed = JSON.parse(cached);
      if (parsed.expires > Date.now()) {
        return parsed.data;
      }
    } catch (error) {
      console.error('Failed to parse cached menu:', error);
    }

    return null;
  }

  private cacheMenu(data: unknown) {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        expires: Date.now() + CACHE_DURATION
      }));
    } catch (error) {
      console.error('Failed to cache menu:', error);
    }
  }
}

export const menuService = new MenuService();
