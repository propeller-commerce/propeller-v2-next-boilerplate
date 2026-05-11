/**
 * useFavorites (React) — Favorite list CRUD with optimistic updates.
 *
 * React mirror of vue/useFavorites.ts.
 * Mirrors FavoriteLists.lite.tsx, FavoriteListDetails.lite.tsx, AddToFavorite.lite.tsx.
 *
 * Responsibilities:
 * - fetchLists: read favoriteLists from Contact/Customer (no separate SDK call needed)
 * - createList: FavoriteListService.createFavoriteList with contactId/customerId from user
 * - updateList / deleteList: FavoriteListService CRUD
 * - addToList / removeFromList: FavoriteListService item management
 * - isProductInList: check products.items for a given productId
 */

import { useState, useCallback, useEffect } from 'react';
import { FavoriteListService } from 'propeller-sdk-v2';
import type { GraphQLClient, FavoriteList, FavoriteListsCreateInput, Product } from 'propeller-sdk-v2';
import type { AnyUser } from '../shared/utils/userIdentity';
import { isContact, isCustomer } from '../shared/utils/userIdentity';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FavoriteListFormData {
  name: string;
  isDefault: boolean;
}

export interface UseFavoritesOptions {
  graphqlClient: GraphQLClient;
  user: AnyUser;
  language?: string;
  onCreate?: (data: FavoriteListFormData) => void;
  onEdit?: (id: string, data: FavoriteListFormData) => void;
  onDelete?: (id: string) => void;
  onListChanged?: () => void;
}

export interface UseFavoritesReturn {
  lists: FavoriteList[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  editingListId: string | null;
  editListName: string;
  editSetAsDefault: boolean;
  newListName: string;
  newSetAsDefault: boolean;
  listToDelete: FavoriteList | null;
  fetchLists: () => void;
  startEdit: (list: FavoriteList) => void;
  cancelEdit: () => void;
  setEditListName: (name: string) => void;
  setEditSetAsDefault: (v: boolean) => void;
  setNewListName: (name: string) => void;
  setNewSetAsDefault: (v: boolean) => void;
  updateList: (listId: string) => Promise<void>;
  confirmDelete: (list: FavoriteList) => void;
  deleteList: () => Promise<void>;
  createList: (name: string, isDefault: boolean) => Promise<void>;
  addToList: (listId: string, productId?: number, clusterId?: number) => Promise<void>;
  removeFromList: (
    listId: string,
    productId?: number | number[],
    clusterId?: number | number[],
  ) => Promise<void>;
  isProductInList: (listId: string, productId: number) => boolean;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useFavorites(options: UseFavoritesOptions): UseFavoritesReturn {
  const { graphqlClient, user, onCreate, onEdit, onDelete, onListChanged } = options;

  const [lists, setLists] = useState<FavoriteList[]>([]);
  // fetchLists reads synchronously from the user object — no async loading needed.
  const loading = false;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editSetAsDefault, setEditSetAsDefault] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newSetAsDefault, setNewSetAsDefault] = useState(false);
  const [listToDelete, setListToDelete] = useState<FavoriteList | null>(null);

  // ── Fetch lists ───────────────────────────────────────────────────────────
  // Mirrors FavoriteLists.lite.tsx: reads favoriteLists from user object directly.

  const fetchLists = useCallback(() => {
    if (!user) { setLists([]); return; }
    const items = user.favoriteLists?.items ?? [];
    setLists(items);
  }, [user]);

  // Auto-sync lists from user whenever user changes (covers initial mount).
  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  // ── Edit state helpers ────────────────────────────────────────────────────

  const startEdit = useCallback((list: FavoriteList) => {
    setEditingListId(String(list.id));
    setEditListName(list.name);
    setEditSetAsDefault(list.isDefault || false);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingListId(null);
    setEditListName('');
    setEditSetAsDefault(false);
  }, []);

  // ── Update list ───────────────────────────────────────────────────────────

  const updateList = useCallback(
    async (listId: string): Promise<void> => {
      const data: FavoriteListFormData = { name: editListName, isDefault: editSetAsDefault };
      if (onEdit) { onEdit(listId, data); cancelEdit(); onListChanged?.(); return; }
      setSaving(true);
      try {
        const service = new FavoriteListService(graphqlClient);
        if (data.isDefault) {
          const currentDefault = lists.find((l) => l.isDefault && String(l.id) !== listId);
          if (currentDefault) {
            await service.updateFavoriteList(String(currentDefault.id), { name: currentDefault.name, isDefault: false });
          }
        }
        const updated = await service.updateFavoriteList(listId, { name: data.name, isDefault: data.isDefault });
        setLists((prev) => prev.map((l) => String(l.id) === listId ? updated : l));
        cancelEdit();
        onListChanged?.();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update list');
      } finally {
        setSaving(false);
      }
    },
    [graphqlClient, editListName, editSetAsDefault, lists, onEdit, onListChanged, cancelEdit]
  );

  // ── Delete list ───────────────────────────────────────────────────────────

  const confirmDelete = useCallback((list: FavoriteList) => setListToDelete(list), []);

  const deleteList = useCallback(async (): Promise<void> => {
    if (!listToDelete) return;
    const list = listToDelete;
    const listId = String(list.id);
    if (onDelete) { onDelete(listId); setListToDelete(null); onListChanged?.(); return; }
    setSaving(true);
    setLists((prev) => prev.filter((l) => String(l.id) !== listId));
    setListToDelete(null);
    try {
      const service = new FavoriteListService(graphqlClient);
      await service.deleteFavoriteList(listId);
      onListChanged?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to delete list');
      setLists((prev) => [...prev, list]);
    } finally {
      setSaving(false);
    }
  }, [graphqlClient, listToDelete, onDelete, onListChanged]);

  // ── Create list ───────────────────────────────────────────────────────────
  // Mirrors FavoriteLists.lite.tsx: passes contactId/customerId from user.

  const createList = useCallback(
    async (name: string, isDefault: boolean): Promise<void> => {
      const data: FavoriteListFormData = { name, isDefault };
      if (onCreate) { onCreate(data); onListChanged?.(); return; }
      setSaving(true);
      try {
        const service = new FavoriteListService(graphqlClient);
        if (isDefault) {
          const currentDefault = lists.find((l) => l.isDefault);
          if (currentDefault) {
            await service.updateFavoriteList(String(currentDefault.id), { name: currentDefault.name, isDefault: false });
          }
        }
        const createInput: FavoriteListsCreateInput = { name, isDefault };
        if (isContact(user)) createInput.contactId = user.contactId;
        if (isCustomer(user)) createInput.customerId = user.customerId;
        const created = await service.createFavoriteList(createInput);
        setLists((prev) => [...prev, created]);
        onListChanged?.();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to create list');
      } finally {
        setSaving(false);
      }
    },
    [graphqlClient, user, lists, onCreate, onListChanged]
  );

  // ── Add / remove items ────────────────────────────────────────────────────

  const addToList = useCallback(
    async (listId: string, productId?: number, clusterId?: number): Promise<void> => {
      try {
        const service = new FavoriteListService(graphqlClient);
        const updated = await service.addFavoriteListItems(listId, {
          ...(productId && { productIds: [productId] }),
          ...(clusterId && { clusterIds: [clusterId] }),
        });
        setLists((prev) => prev.map((l) => String(l.id) === listId ? updated : l));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to add to list');
      }
    },
    [graphqlClient]
  );

  const removeFromList = useCallback(
    async (
      listId: string,
      productId?: number | number[],
      clusterId?: number | number[],
    ): Promise<void> => {
      const productIds = productId === undefined ? [] : Array.isArray(productId) ? productId : [productId];
      const clusterIds = clusterId === undefined ? [] : Array.isArray(clusterId) ? clusterId : [clusterId];
      if (productIds.length === 0 && clusterIds.length === 0) return;
      try {
        const service = new FavoriteListService(graphqlClient);
        const updated = await service.removeFavoriteListItems(listId, {
          ...(productIds.length && { productIds }),
          ...(clusterIds.length && { clusterIds }),
        });
        setLists((prev) => prev.map((l) => String(l.id) === listId ? updated : l));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to remove from list');
      }
    },
    [graphqlClient]
  );

  // ── Check product in list ─────────────────────────────────────────────────
  // list.products is ProductsResponse; items are IBaseProduct but runtime Product.

  const isProductInList = useCallback(
    (listId: string, productId: number): boolean => {
      const list = lists.find((l) => String(l.id) === listId);
      if (!list) return false;
      return (list.products?.items ?? []).some((p) => (p as Product).productId === productId);
    },
    [lists]
  );

  return {
    lists, loading, saving, error,
    editingListId, editListName, editSetAsDefault,
    newListName, newSetAsDefault, listToDelete,
    fetchLists, startEdit, cancelEdit,
    setEditListName, setEditSetAsDefault, setNewListName, setNewSetAsDefault,
    updateList, confirmDelete, deleteList, createList,
    addToList, removeFromList, isProductInList,
  };
}
