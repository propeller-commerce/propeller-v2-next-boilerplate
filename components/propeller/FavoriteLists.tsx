'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  FavoriteListService,
  FavoriteList,
  GraphQLClient,
  Contact,
  Customer,
  FavoriteListsSearchInput,
} from 'propeller-sdk-v2';

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
interface FavoriteListsState {
  lists: FavoriteList[];
  loading: boolean;
  editingListId: string | null;
  editListName: string;
  editSetAsDefault: boolean;
  showDeleteModal: boolean;
  listToDelete: FavoriteList | null;
  showCreateModal: boolean;
  newListName: string;
  newSetAsDefault: boolean;
  isMounted: boolean;
  fetchLists: () => Promise<void>;
  handleEditList: (list: FavoriteList) => void;
  handleCancelEdit: () => void;
  handleUpdateList: (listId: string) => Promise<void>;
  handleDeleteList: (list: FavoriteList) => void;
  handleConfirmDelete: () => Promise<void>;
  handleCancelDelete: () => void;
  closeCreateModal: () => void;
  handleCreateList: () => Promise<void>;
  formatDate: (dateString: string) => string;
  getTotalCount: (list: FavoriteList) => number;
  getProductCount: (list: FavoriteList) => number;
  getClusterCount: (list: FavoriteList) => number;
  getLabel: (key: string, fallback: string) => string;
  displayedLists: () => FavoriteList[];
}

function FavoriteLists(props: FavoriteListsProps) {
  const [lists, setLists] = useState<FavoriteListsState['lists']>(() => []);

  const [loading, setLoading] = useState<FavoriteListsState['loading']>(() => true);

  const [editingListId, setEditingListId] = useState<FavoriteListsState['editingListId']>(
    () => null
  );

  const [editListName, setEditListName] = useState<FavoriteListsState['editListName']>(() => '');

  const [editSetAsDefault, setEditSetAsDefault] = useState<FavoriteListsState['editSetAsDefault']>(
    () => false
  );

  const [showDeleteModal, setShowDeleteModal] = useState<FavoriteListsState['showDeleteModal']>(
    () => false
  );

  const [listToDelete, setListToDelete] = useState<FavoriteListsState['listToDelete']>(() => null);

  const [showCreateModal, setShowCreateModal] = useState<FavoriteListsState['showCreateModal']>(
    () => false
  );

  const [newListName, setNewListName] = useState<FavoriteListsState['newListName']>(() => '');

  const [newSetAsDefault, setNewSetAsDefault] = useState<FavoriteListsState['newSetAsDefault']>(
    () => false
  );

  const [isMounted, setIsMounted] = useState<FavoriteListsState['isMounted']>(() => false);

  const [saving, setSaving] = useState(false);

  async function fetchLists(): ReturnType<FavoriteListsState['fetchLists']> {
    if (!props.user || !props.graphqlClient) return;
    setLoading(true);
    try {
      const isContact = 'contactId' in props.user;
      const searchInput: FavoriteListsSearchInput = {};
      if (isContact) {
        searchInput.contactId = (props.user as Contact).contactId;
      } else {
        searchInput.customerId = (props.user as Customer).customerId;
      }

      const service = new FavoriteListService(props.graphqlClient);
      const response = await service.getFavoriteLists(searchInput);
      setLists(response.items || []);
    } catch (error) {
      console.error('Error fetching favorite lists:', error);
      setLists([]);
    } finally {
      setLoading(false);
    }
  }

  function handleEditList(list: FavoriteList): ReturnType<FavoriteListsState['handleEditList']> {
    setEditingListId(String(list.id));
    setEditListName(list.name);
    setEditSetAsDefault(list.isDefault || false);
  }

  function handleCancelEdit(): ReturnType<FavoriteListsState['handleCancelEdit']> {
    setEditingListId(null);
    setEditListName('');
    setEditSetAsDefault(false);
  }

  async function handleUpdateList(
    listId: string
  ): ReturnType<FavoriteListsState['handleUpdateList']> {
    if (!editListName.trim()) return;
    const formData = {
      name: editListName,
      isDefault: editSetAsDefault,
    };

    // If onEdit callback is provided, delegate to parent
    if (props.onEdit) {
      props.onEdit(listId, formData);
      handleCancelEdit();
      return;
    }
    if (!props.graphqlClient || saving) return;
    setSaving(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);

      // If setting as default, first unset the current default
      if (formData.isDefault) {
        const currentDefault = lists.find((l: FavoriteList) => l.isDefault && String(l.id) !== listId);
        if (currentDefault) {
          await service.updateFavoriteList(String(currentDefault.id), {
            name: currentDefault.name,
            isDefault: false,
          });
        }
      }

      await service.updateFavoriteList(listId, {
        name: formData.name,
        isDefault: formData.isDefault,
      });

      // Optimistic update — clear default from others when setting a new default
      setLists(
        lists.map((l: FavoriteList) => {
          if (String(l.id) === listId) {
            return {
              ...l,
              name: formData.name,
              isDefault: formData.isDefault,
            } as FavoriteList;
          }
          if (formData.isDefault && l.isDefault) {
            return {
              ...l,
              isDefault: false,
            } as FavoriteList;
          }
          return l;
        })
      );
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating favorite list:', error);
      fetchLists();
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteList(
    list: FavoriteList
  ): ReturnType<FavoriteListsState['handleDeleteList']> {
    setListToDelete(list);
    setShowDeleteModal(true);
  }

  async function handleConfirmDelete(): ReturnType<FavoriteListsState['handleConfirmDelete']> {
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

      // Optimistic update
      setLists(lists.filter((l: FavoriteList) => String(l.id) !== deletedId));
      setShowDeleteModal(false);
      setListToDelete(null);
    } catch (error) {
      console.error('Error deleting favorite list:', error);
      fetchLists();
    }
  }

  function handleCancelDelete(): ReturnType<FavoriteListsState['handleCancelDelete']> {
    setShowDeleteModal(false);
    setListToDelete(null);
  }

  function closeCreateModal(): ReturnType<FavoriteListsState['closeCreateModal']> {
    setShowCreateModal(false);
  }

  async function handleCreateList(): ReturnType<FavoriteListsState['handleCreateList']> {
    if (!newListName.trim() || saving) return;
    setSaving(true);
    const formData = {
      name: newListName,
      isDefault: newSetAsDefault,
    };

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

      // If setting as default, first unset the current default
      if (formData.isDefault) {
        const currentDefault = lists.find((l: FavoriteList) => l.isDefault);
        if (currentDefault) {
          await service.updateFavoriteList(String(currentDefault.id), {
            name: currentDefault.name,
            isDefault: false,
          });
        }
      }

      const isContact = 'contactId' in props.user;
      const contactId = isContact ? (props.user as Contact).contactId : undefined;
      const customerId = !isContact ? (props.user as Customer).customerId : undefined;
      await service.createFavoriteList({
        name: formData.name,
        isDefault: formData.isDefault,
        contactId: contactId,
        customerId: customerId,
      } as Parameters<FavoriteListService['createFavoriteList']>[0]);
      setNewListName('');
      setNewSetAsDefault(false);
      closeCreateModal();

      // Refetch to get the complete list
      fetchLists();
    } catch (error) {
      console.error('Error creating favorite list:', error);
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateString: string): ReturnType<FavoriteListsState['formatDate']> {
    if (props.formatDate) return props.formatDate(dateString);
    if (!dateString) return '-';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function getProductCount(list: FavoriteList): ReturnType<FavoriteListsState['getProductCount']> {
    const products = list.products;
    if (!products) return 0;
    if (products.itemsFound !== undefined) return products.itemsFound;
    if (products.items) return products.items.length;
    return 0;
  }

  function getClusterCount(list: FavoriteList): ReturnType<FavoriteListsState['getClusterCount']> {
    const clusters = list.clusters;
    if (!clusters) return 0;
    if (clusters.itemsFound !== undefined) return clusters.itemsFound;
    if (clusters.items) return clusters.items.length;
    return 0;
  }

  function getTotalCount(list: FavoriteList): ReturnType<FavoriteListsState['getTotalCount']> {
    return getProductCount(list) + getClusterCount(list);
  }

  function getLabel(key: string, fallback: string): ReturnType<FavoriteListsState['getLabel']> {
    const labels = props.labels as Record<string, string> | undefined;
    return labels?.[key] || fallback;
  }

  function displayedLists(): ReturnType<FavoriteListsState['displayedLists']> {
    if (props.limit && props.limit > 0) {
      // Sort by updatedAt descending, then take the first N
      const sorted = [...lists].sort((a: FavoriteList, b: FavoriteList) => {
        const dateA = new Date(a.updatedAt || '').getTime();
        const dateB = new Date(b.updatedAt || '').getTime();
        return dateB - dateA;
      });
      return sorted.slice(0, props.limit);
    }
    return lists;
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);
  useEffect(() => {
    if (props.user) {
      fetchLists();
    }
  }, [props.user]);

  return (
    <div className={props.className}>
      {props.allowFavoriteListCreate !== false &&
      !loading &&
      isMounted &&
      displayedLists().length > 0 ? (
        <div className="flex justify-end mb-4">
          <button
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80"
            onClick={(event) => {
              setShowCreateModal(true);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            {getLabel('createButton', 'Create New List')}
          </button>
        </div>
      ) : null}
      {loading ? (
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-6 w-1/3 bg-gray-200 rounded" />
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-6 w-1/3 bg-gray-200 rounded" />
                <div className="h-4 w-1/4 bg-gray-200 rounded" />
                <div className="h-4 w-1/2 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {!loading && isMounted ? (
        <>
          {displayedLists().length > 0 ? (
            <div className="space-y-4">
              {displayedLists()?.map((list) => (
                <div
                  className={`border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors${editingListId !== String(list.id) && props.onListClick ? ' cursor-pointer' : ''}`}
                  key={list.id}
                  onClick={() => {
                    if (editingListId !== String(list.id) && props.onListClick) {
                      props.onListClick(list.id);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {editingListId === String(list.id) ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Enter list name"
                              className="max-w-md block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
                              value={editListName}
                              onChange={(e) => {
                                setEditListName(e.target.value);
                              }}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              id={`default-edit-${list.id}`}
                              checked={editSetAsDefault}
                              onChange={(e) => {
                                setEditSetAsDefault(e.target.checked);
                              }}
                            />
                            <label
                              className="text-sm text-gray-500"
                              htmlFor={`default-edit-${list.id}`}
                            >
                              {getLabel('makeDefault', 'Make default')}
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 disabled:opacity-50"
                              onClick={(event) => handleUpdateList(String(list.id))}
                              disabled={!editListName.trim()}
                            >
                              {getLabel('editSave', 'Save')}
                            </button>
                            <button
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                              onClick={(event) => handleCancelEdit()}
                            >
                              {getLabel('editCancel', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {editingListId !== String(list.id) ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-semibold">
                              {list.name}
                            </span>
                            {props.showDefaultIndicator !== false && list.isDefault ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {getLabel('defaultBadge', 'Default')}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {props.showLastModified !== false ? (
                              <div className="flex items-center gap-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                                  <line x1="16" x2="16" y1="2" y2="6" />
                                  <line x1="8" x2="8" y1="2" y2="6" />
                                  <line x1="3" x2="21" y1="10" y2="10" />
                                </svg>
                                {getLabel('lastModified', 'Last modified')}:{' '}
                                {formatDate(list.updatedAt)}
                              </div>
                            ) : null}
                            {props.showItemsCount !== false ? (
                              <div className="flex items-center gap-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M16.5 9.4 7.55 4.24" />
                                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                  <polyline points="3.29 7 12 12 20.71 7" />
                                  <line x1="12" x2="12" y1="22" y2="12" />
                                </svg>
                                {getTotalCount(list)}
                                {getLabel('items', 'items')}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {props.showActions !== false && editingListId !== String(list.id) ? (
                      <div className="flex gap-2">
                        <button
                          title="Edit"
                          className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                          onClick={(event) => { event.stopPropagation(); handleEditList(list); }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            <path d="m15 5 4 4" />
                          </svg>
                        </button>
                        <button
                          title="Delete"
                          className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(event) => { event.stopPropagation(); handleDeleteList(list); }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {displayedLists().length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-12 text-center space-y-4">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium">{getLabel('noLists', 'No favorite lists')}</p>
                <p className="text-gray-500">
                  {getLabel(
                    'noListsDescription',
                    'Start by creating a new list to save your items.'
                  )}
                </p>
              </div>
              {props.allowFavoriteListCreate !== false ? (
                <button
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80"
                  onClick={(event) => {
                    setShowCreateModal(true);
                  }}
                >
                  {getLabel('createFirstList', 'Create your first list')}
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {showCreateModal ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{getLabel('createTitle', 'Create New List')}</h3>
              <button
                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={(event) => {
                  closeCreateModal();
                }}
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-primary"
                  value={newListName}
                  onChange={(e) => {
                    setNewListName(e.target.value);
                  }}
                  placeholder={getLabel('createPlaceholder', 'Enter list name')}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="create-set-default"
                  className="rounded border-gray-300"
                  checked={newSetAsDefault}
                  onChange={(e) => {
                    setNewSetAsDefault(e.target.checked);
                  }}
                />
                <label htmlFor="create-set-default" className="text-sm text-gray-500">
                  {getLabel('setAsDefault', 'Set as default favorite list')}
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={(event) => {
                    closeCreateModal();
                  }}
                >
                  {getLabel('cancelButton', 'Cancel')}
                </button>
                <button
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/80 disabled:opacity-50"
                  onClick={(event) => handleCreateList()}
                  disabled={!newListName.trim()}
                >
                  {getLabel('saveButton', 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showDeleteModal && listToDelete ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-lg border">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {getLabel('deleteTitle', 'Delete Favorite List')}
              </h3>
              <button
                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                onClick={(event) => handleCancelDelete()}
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <p>
                {getLabel('deleteConfirm', 'Are you sure you want to delete')}
                <strong>&quot;{listToDelete?.name}&quot;</strong>?
              </p>
              <p className="text-sm text-red-600">
                {getLabel('deleteWarning', 'This action cannot be undone.')}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-6">
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                onClick={(event) => handleCancelDelete()}
              >
                {getLabel('cancelButton', 'Cancel')}
              </button>
              <button
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                onClick={(event) => handleConfirmDelete()}
              >
                {getLabel('deleteButton', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default FavoriteLists;
