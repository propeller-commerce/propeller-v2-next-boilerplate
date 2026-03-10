'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  FavoriteList,
  FavoriteListService,
  FavoriteListsSearchInput,
  GraphQLClient,
  Contact,
  Customer,
} from 'propeller-sdk-v2';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Trash2, Heart, Edit2, Calendar, Package, Plus } from 'lucide-react';

export interface FavoriteListFormData {
  name: string;
  isDefault: boolean;
}

export interface FavoriteListsProps {
  /** The authenticated user (Contact or Customer) */
  user: Contact | Customer | null;

  /** The initialized GraphQL Client instance */
  graphqlClient: GraphQLClient;

  /** Callback when a list is clicked (navigate to detail) */
  onListClick?: (listId: string | number) => void;

  /** Limit the number of lists shown (e.g. 3 = last 3 modified). undefined = show all */
  limit?: number;

  /** Displays the "Default" badge on the favorite list (default: true) */
  showDefaultIndicator?: boolean;

  /** Displays the last modified date on the favorite list (default: true) */
  showLastModified?: boolean;

  /** Displays number of products and clusters contained in the favorite list (default: true) */
  showItemsCount?: boolean;

  /** Displays edit/delete action buttons on each list (default: true) */
  showActions?: boolean;

  /** Displays create new favorite list button (default: true) */
  allowFavoriteListCreate?: boolean;

  /** Custom class name */
  className?: string;

  /** Format date function override. If not provided, dates are formatted as dd/mm/YYYY */
  formatDate?: (dateString: string) => string;

  /** Localization labels */
  labels?: {
    lastModified?: string;
    items?: string;
    products?: string;
    clusters?: string;
    defaultBadge?: string;
    editSave?: string;
    editCancel?: string;
    makeDefault?: string;
    deleteTitle?: string;
    deleteConfirm?: string;
    deleteWarning?: string;
    deleteButton?: string;
    cancelButton?: string;
    createTitle?: string;
    createButton?: string;
    createPlaceholder?: string;
    setAsDefault?: string;
    saveButton?: string;
    noLists?: string;
    noListsDescription?: string;
    createFirstList?: string;
    loading?: string;
  };

  /** Action function triggered when creating a new favorite list. If not provided, the default action is executed */
  onCreate?: (favoriteListData: FavoriteListFormData) => void;

  /** Action function triggered when editing a favorite list. If not provided, the default action is executed */
  onEdit?: (favoriteListId: string, favoriteListData: FavoriteListFormData) => void;

  /** Action function triggered when deleting a favorite list. If not provided, the default action is executed */
  onDelete?: (favoriteListId: string) => void;
}

function FavoriteLists(props: FavoriteListsProps) {
  const [lists, setLists] = useState<FavoriteList[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editSetAsDefault, setEditSetAsDefault] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listToDelete, setListToDelete] = useState<FavoriteList | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newSetAsDefault, setNewSetAsDefault] = useState(false);
  const [_isMounted, set_isMounted] = useState(false);

  async function fetchLists() {
    if (!props.user || !props.graphqlClient) return;
    setLoading(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);
      const isContact = 'contactId' in props.user;
      const searchInput: FavoriteListsSearchInput = {};

      if (isContact && (props.user as any).contactId) {
        searchInput.contactId = (props.user as any).contactId;
      } else if (!isContact && (props.user as any).customerId) {
        searchInput.customerId = (props.user as any).customerId;
      }

      const response = await service.getFavoriteLists(searchInput);
      setLists(response.items || []);
    } catch (error) {
      console.error('Error fetching favorite lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }

  function handleEditList(list: FavoriteList) {
    setEditingListId(String(list.id));
    setEditListName(list.name);
    setEditSetAsDefault(list.isDefault || false);
  }

  function handleCancelEdit() {
    setEditingListId(null);
    setEditListName('');
    setEditSetAsDefault(false);
  }

  async function handleUpdateList(listId: string) {
    if (!editListName.trim()) return;

    const formData: FavoriteListFormData = { name: editListName, isDefault: editSetAsDefault };

    // If onEdit callback is provided, delegate to parent
    if (props.onEdit) {
      props.onEdit(listId, formData);
      handleCancelEdit();
      return;
    }

    if (!props.graphqlClient) return;

    try {
      const service = new FavoriteListService(props.graphqlClient);
      await service.updateFavoriteList(listId, {
        name: formData.name,
        isDefault: formData.isDefault,
      });
      setLists(prev =>
        prev.map((l) => {
          if (String(l.id) === listId) {
            return { ...l, name: formData.name, isDefault: formData.isDefault } as FavoriteList;
          }
          if (formData.isDefault && l.isDefault) {
            return { ...l, isDefault: false } as FavoriteList;
          }
          return l;
        })
      );
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating favorite list:', error);
      fetchLists();
    }
  }

  function handleDeleteList(list: FavoriteList) {
    setListToDelete(list);
    setShowDeleteModal(true);
  }

  async function handleConfirmDelete() {
    if (!listToDelete) return;
    const deletedId = String(listToDelete.id);

    // If onDelete callback is provided, delegate to parent
    if (props.onDelete) {
      props.onDelete(deletedId);
      setShowDeleteModal(false);
      setListToDelete(null);
      return;
    }

    if (!props.graphqlClient) return;

    try {
      const service = new FavoriteListService(props.graphqlClient);
      await service.deleteFavoriteList(deletedId);
      setLists(prev => prev.filter((l) => String(l.id) !== deletedId));
      setShowDeleteModal(false);
      setListToDelete(null);
    } catch (error) {
      console.error('Error deleting favorite list:', error);
      fetchLists();
    }
  }

  function handleCancelDelete() {
    setShowDeleteModal(false);
    setListToDelete(null);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
  }

  async function handleCreateList() {
    if (!newListName.trim()) return;

    const formData: FavoriteListFormData = { name: newListName, isDefault: newSetAsDefault };

    // If onCreate callback is provided, delegate to parent
    if (props.onCreate) {
      props.onCreate(formData);
      setNewListName('');
      setNewSetAsDefault(false);
      closeCreateModal();
      return;
    }

    if (!props.graphqlClient || !props.user) return;

    try {
      const service = new FavoriteListService(props.graphqlClient);
      const isContact = 'contactId' in props.user;
      const input: any = {
        name: formData.name,
        isDefault: formData.isDefault,
      };
      if (isContact && (props.user as any).contactId) {
        input.contactId = (props.user as any).contactId;
      } else if (!isContact && (props.user as any).customerId) {
        input.customerId = (props.user as any).customerId;
      }
      await service.createFavoriteList(input);
      setNewListName('');
      setNewSetAsDefault(false);
      closeCreateModal();
      fetchLists();
    } catch (error) {
      console.error('Error creating favorite list:', error);
    }
  }

  function formatDateFn(dateString: string): string {
    if (props.formatDate) return props.formatDate(dateString);
    if (!dateString) return '-';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function getProductCount(list: FavoriteList): number {
    if (Array.isArray(list.products)) {
      return list.products.length;
    } else if (list.products && typeof list.products === 'object' && 'items' in list.products) {
      return ((list.products as any).items || []).length;
    } else if (list.products && typeof list.products === 'object' && 'itemsFound' in list.products) {
      return (list.products as any).itemsFound || 0;
    }
    return 0;
  }

  function getClusterCount(list: FavoriteList): number {
    if (Array.isArray(list.clusters)) {
      return list.clusters.length;
    } else if (list.clusters && typeof list.clusters === 'object' && 'items' in list.clusters) {
      return ((list.clusters as any).items || []).length;
    } else if (list.clusters && typeof list.clusters === 'object' && 'itemsFound' in list.clusters) {
      return (list.clusters as any).itemsFound || 0;
    }
    return 0;
  }

  function getTotalCount(list: FavoriteList): number {
    return getProductCount(list) + getClusterCount(list);
  }

  function getLabel(key: string, fallback: string): string {
    return (props.labels as any)?.[key] || fallback;
  }

  function getDisplayedLists(): FavoriteList[] {
    if (props.limit && props.limit > 0) {
      const sorted = [...lists].sort((a, b) => {
        const dateA = new Date(a.updatedAt || '').getTime();
        const dateB = new Date(b.updatedAt || '').getTime();
        return dateB - dateA;
      });
      return sorted.slice(0, props.limit);
    }
    return lists;
  }

  useEffect(() => {
    set_isMounted(true);
    if (props.user) {
      fetchLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.user) {
      fetchLists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.user]);

  const displayed = getDisplayedLists();

  return (
    <div className={props.className}>
      {props.allowFavoriteListCreate !== false && !loading && _isMounted && displayed.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {getLabel('createButton', 'Create New List')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border/60 rounded-lg p-6 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-6 w-1/3 bg-muted rounded"></div>
                  <div className="h-4 w-1/4 bg-muted rounded"></div>
                  <div className="h-4 w-1/2 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {!loading && _isMounted ? (
        <>
          {displayed.length > 0 ? (
            <div className="space-y-4">
              {displayed.map((list) => (
                <div
                  key={list.id}
                  className="border border-border/60 rounded-lg p-6 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {editingListId === String(list.id) ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Input
                              value={editListName}
                              onChange={(e) => setEditListName(e.target.value)}
                              placeholder="Enter list name"
                              className="max-w-md"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`default-edit-${list.id}`}
                              checked={editSetAsDefault}
                              onChange={(e) => setEditSetAsDefault(e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <label htmlFor={`default-edit-${list.id}`} className="text-sm text-muted-foreground">
                              {getLabel('makeDefault', 'Make default')}
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateList(String(list.id))}
                              disabled={!editListName.trim()}
                            >
                              {getLabel('editSave', 'Save')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              {getLabel('editCancel', 'Cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => props.onListClick && props.onListClick(list.id)}
                              className="text-xl font-semibold hover:text-primary transition-colors text-left"
                            >
                              {list.name}
                            </button>
                            {props.showDefaultIndicator !== false && list.isDefault && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {getLabel('defaultBadge', 'Default')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {props.showLastModified !== false && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {getLabel('lastModified', 'Last modified')}: {formatDateFn(list.updatedAt)}
                              </div>
                            )}
                            {props.showItemsCount !== false && (
                              <div className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {getTotalCount(list)} {getLabel('items', 'items')} ({getProductCount(list)} {getLabel('products', 'products')}, {getClusterCount(list)} {getLabel('clusters', 'clusters')})
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {props.showActions !== false && editingListId !== String(list.id) && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditList(list)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteList(list)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-border/60 rounded-lg p-12 text-center space-y-4">
              <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">{getLabel('noLists', 'No favorite lists')}</p>
                <p className="text-muted-foreground">{getLabel('noListsDescription', 'Start by creating a new list to save your items.')}</p>
              </div>
              {props.allowFavoriteListCreate !== false && (
                <Button onClick={() => setShowCreateModal(true)}>
                  {getLabel('createFirstList', 'Create your first list')}
                </Button>
              )}
            </div>
          )}
        </>
      ) : null}

      {/* Create New List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background p-6 rounded-lg max-w-md w-full shadow-lg border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{getLabel('createTitle', 'Create New List')}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => closeCreateModal()}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder={getLabel('createPlaceholder', 'Enter list name')}
                  autoFocus
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="create-set-default"
                  checked={newSetAsDefault}
                  onChange={(e) => setNewSetAsDefault(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="create-set-default" className="text-sm text-muted-foreground">
                  {getLabel('setAsDefault', 'Set as default favorite list')}
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => closeCreateModal()}>
                  {getLabel('cancelButton', 'Cancel')}
                </Button>
                <Button onClick={handleCreateList} disabled={!newListName.trim()}>
                  {getLabel('saveButton', 'Save')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && listToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background p-6 rounded-lg max-w-md w-full shadow-lg border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{getLabel('deleteTitle', 'Delete Favorite List')}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelDelete}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            <div className="space-y-4">
              <p>{getLabel('deleteConfirm', 'Are you sure you want to delete')} <strong>&quot;{listToDelete.name}&quot;</strong>?</p>
              <p className="text-sm text-destructive">{getLabel('deleteWarning', 'This action cannot be undone.')}</p>
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" onClick={handleCancelDelete}>
                {getLabel('cancelButton', 'Cancel')}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                {getLabel('deleteButton', 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FavoriteLists;
