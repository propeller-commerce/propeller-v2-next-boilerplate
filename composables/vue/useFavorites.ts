/**
 * useFavorites (Vue) — Favorite list CRUD with optimistic updates.
 *
 * Covers: FavoriteLists, FavoriteListDetails, AddToFavorite components.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import { FavoriteListService } from 'propeller-sdk-v2';
import type { GraphQLClient, FavoriteList } from 'propeller-sdk-v2';
import type { AnyUser } from '../shared/utils/userIdentity';

export interface FavoriteListFormData {
  name: string;
  isDefault: boolean;
}

export interface UseFavoritesOptions {
  graphqlClient: GraphQLClient;
  user: Ref<AnyUser>;
  language?: Ref<string>;
  onCreate?: (data: FavoriteListFormData) => void;
  onEdit?: (id: string, data: FavoriteListFormData) => void;
  onDelete?: (id: string) => void;
  onListChanged?: () => void;
}

export interface UseFavoritesReturn {
  lists: Ref<FavoriteList[]>;
  loading: Ref<boolean>;
  saving: Ref<boolean>;
  error: Ref<string | null>;
  editingListId: Ref<string | null>;
  editListName: Ref<string>;
  editSetAsDefault: Ref<boolean>;
  newListName: Ref<string>;
  newSetAsDefault: Ref<boolean>;
  listToDelete: Ref<FavoriteList | null>;
  fetchLists: () => void;
  startEdit: (list: FavoriteList) => void;
  cancelEdit: () => void;
  updateList: (listId: string) => Promise<void>;
  confirmDelete: (list: FavoriteList) => void;
  deleteList: () => Promise<void>;
  createList: (name: string, isDefault: boolean) => Promise<void>;
  addToList: (listId: string, productId?: number, clusterId?: number) => Promise<void>;
  removeFromList: (listId: string, productId?: number, clusterId?: number) => Promise<void>;
  isProductInList: (listId: string, productId: number) => ComputedRef<boolean>;
}

export function useFavorites(options: UseFavoritesOptions): UseFavoritesReturn {
  const { graphqlClient, user, onCreate, onEdit, onDelete, onListChanged } = options;

  const lists = ref<FavoriteList[]>([]) as Ref<FavoriteList[]>;
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const editingListId = ref<string | null>(null);
  const editListName = ref('');
  const editSetAsDefault = ref(false);
  const newListName = ref('');
  const newSetAsDefault = ref(false);
  const listToDelete = ref<FavoriteList | null>(null) as Ref<FavoriteList | null>;

  function fetchLists(): void {
    lists.value = (user.value as any)?.favoriteLists?.items || [];
  }

  function startEdit(list: FavoriteList): void {
    editingListId.value = String(list.id);
    editListName.value = list.name;
    editSetAsDefault.value = list.isDefault || false;
  }

  function cancelEdit(): void {
    editingListId.value = null; editListName.value = ''; editSetAsDefault.value = false;
  }

  async function updateList(listId: string): Promise<void> {
    const data: FavoriteListFormData = { name: editListName.value, isDefault: editSetAsDefault.value };
    if (onEdit) { onEdit(listId, data); cancelEdit(); onListChanged?.(); return; }
    saving.value = true;
    try {
      const service = new FavoriteListService(graphqlClient);
      if (data.isDefault) {
        const currentDefault = lists.value.find((l: FavoriteList) => l.isDefault && String(l.id) !== listId);
        if (currentDefault) await service.updateFavoriteList(String(currentDefault.id), { name: currentDefault.name, isDefault: false });
      }
      const updated = await service.updateFavoriteList(listId, { name: data.name, isDefault: data.isDefault });
      lists.value = lists.value.map((l: FavoriteList) => String(l.id) === listId ? updated : l);
      cancelEdit(); onListChanged?.();
    } catch (e: any) { error.value = e?.message || 'Failed to update list'; }
    finally { saving.value = false; }
  }

  function confirmDelete(list: FavoriteList): void { listToDelete.value = list; }

  async function deleteList(): Promise<void> {
    if (!listToDelete.value) return;
    const list = listToDelete.value;
    const listId = String(list.id);
    if (onDelete) { onDelete(listId); listToDelete.value = null; onListChanged?.(); return; }
    saving.value = true;
    lists.value = lists.value.filter((l: FavoriteList) => String(l.id) !== listId);
    listToDelete.value = null;
    try {
      const service = new FavoriteListService(graphqlClient);
      await service.deleteFavoriteList(listId);
      onListChanged?.();
    } catch (e: any) {
      error.value = e?.message || 'Failed to delete list';
      if (list) lists.value = [...lists.value, list];
    } finally { saving.value = false; }
  }

  async function createList(name: string, isDefault: boolean): Promise<void> {
    const data: FavoriteListFormData = { name, isDefault };
    if (onCreate) { onCreate(data); onListChanged?.(); return; }
    saving.value = true;
    try {
      const service = new FavoriteListService(graphqlClient);
      if (isDefault) {
        const currentDefault = lists.value.find((l: FavoriteList) => l.isDefault);
        if (currentDefault) await service.updateFavoriteList(String(currentDefault.id), { name: currentDefault.name, isDefault: false });
      }
      const created = await service.createFavoriteList({ name, isDefault });
      lists.value = [...lists.value, created];
      onListChanged?.();
    } catch (e: any) { error.value = e?.message || 'Failed to create list'; }
    finally { saving.value = false; }
  }

  async function addToList(listId: string, productId?: number, clusterId?: number): Promise<void> {
    try {
      const service = new FavoriteListService(graphqlClient);
      const updated = await service.addFavoriteListItems(listId, {
        ...(productId && { productIds: [productId] }),
        ...(clusterId && { clusterIds: [clusterId] }),
      });
      lists.value = lists.value.map((l: FavoriteList) => String(l.id) === listId ? updated : l);
    } catch (e: any) { error.value = e?.message || 'Failed to add to list'; }
  }

  async function removeFromList(listId: string, productId?: number, clusterId?: number): Promise<void> {
    try {
      const service = new FavoriteListService(graphqlClient);
      const updated = await service.removeFavoriteListItems(listId, {
        ...(productId && { productIds: [productId] }),
        ...(clusterId && { clusterIds: [clusterId] }),
      });
      lists.value = lists.value.map((l: FavoriteList) => String(l.id) === listId ? updated : l);
    } catch (e: any) { error.value = e?.message || 'Failed to remove from list'; }
  }

  function isProductInList(listId: string, productId: number): ComputedRef<boolean> {
    return computed(() => {
      const list = lists.value.find((l: FavoriteList) => String(l.id) === listId);
      if (!list) return false;
      return (list.products?.items || []).some((p: any) => p.productId === productId);
    });
  }

  return { lists, loading, saving, error, editingListId, editListName, editSetAsDefault, newListName, newSetAsDefault, listToDelete, fetchLists, startEdit, cancelEdit, updateList, confirmDelete, deleteList, createList, addToList, removeFromList, isProductInList };
}
