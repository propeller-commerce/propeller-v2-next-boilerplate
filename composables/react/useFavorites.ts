/**
 * useFavorites (React) — Favorite list CRUD with optimistic updates.
 *
 * React mirror of vue/useFavorites.ts.
 */

import { useState, useCallback } from 'react';
import { FavoriteListService } from 'propeller-sdk-v2';
import type { GraphQLClient, FavoriteList } from 'propeller-sdk-v2';
import type { AnyUser } from '../shared/utils/userIdentity';

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
  removeFromList: (listId: string, productId?: number, clusterId?: number) => Promise<void>;
  isProductInList: (listId: string, productId: number) => boolean;
}

export function useFavorites(options: UseFavoritesOptions): UseFavoritesReturn {
  const { graphqlClient, user, onCreate, onEdit, onDelete, onListChanged } = options;

  const [lists, setLists] = useState<FavoriteList[]>([]);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editSetAsDefault, setEditSetAsDefault] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newSetAsDefault, setNewSetAsDefault] = useState(false);
  const [listToDelete, setListToDelete] = useState<FavoriteList | null>(null);

  const fetchLists = useCallback(() => {
    setLists((user as any)?.favoriteLists?.items || []);
  }, [user]);

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
      } catch (e: any) { setError(e?.message || 'Failed to update list'); }
      finally { setSaving(false); }
    },
    [graphqlClient, editListName, editSetAsDefault, lists, onEdit, onListChanged, cancelEdit]
  );

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
    } catch (e: any) {
      setError(e?.message || 'Failed to delete list');
      setLists((prev) => [...prev, list]);
    }
    finally { setSaving(false); }
  }, [graphqlClient, listToDelete, onDelete, onListChanged]);

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
        const created = await service.createFavoriteList({ name, isDefault });
        setLists((prev) => [...prev, created]);
        onListChanged?.();
      } catch (e: any) { setError(e?.message || 'Failed to create list'); }
      finally { setSaving(false); }
    },
    [graphqlClient, lists, onCreate, onListChanged]
  );

  const addToList = useCallback(
    async (listId: string, productId?: number, clusterId?: number): Promise<void> => {
      try {
        const service = new FavoriteListService(graphqlClient);
        const updated = await service.addFavoriteListItems(listId, {
          ...(productId && { productIds: [productId] }),
          ...(clusterId && { clusterIds: [clusterId] }),
        });
        setLists((prev) => prev.map((l) => String(l.id) === listId ? updated : l));
      } catch (e: any) { setError(e?.message || 'Failed to add to list'); }
    },
    [graphqlClient]
  );

  const removeFromList = useCallback(
    async (listId: string, productId?: number, clusterId?: number): Promise<void> => {
      try {
        const service = new FavoriteListService(graphqlClient);
        const updated = await service.removeFavoriteListItems(listId, {
          ...(productId && { productIds: [productId] }),
          ...(clusterId && { clusterIds: [clusterId] }),
        });
        setLists((prev) => prev.map((l) => String(l.id) === listId ? updated : l));
      } catch (e: any) { setError(e?.message || 'Failed to remove from list'); }
    },
    [graphqlClient]
  );

  const isProductInList = useCallback(
    (listId: string, productId: number): boolean => {
      const list = lists.find((l) => String(l.id) === listId);
      if (!list) return false;
      return ((list as any).products?.items || []).some((p: any) => p.productId === productId);
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
