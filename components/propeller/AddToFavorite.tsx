'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FavoriteListService,
  FavoriteList,
  GraphQLClient,
  Contact,
  Customer,
} from 'propeller-sdk-v2';

export interface AddToFavoriteProps {
  /** The initialized GraphQL Client instance */
  graphqlClient: GraphQLClient;

  /** The authenticated user */
  user: Contact | Customer | null;

  /** Product ID to add/remove from favorites (for products) */
  productId?: number;

  /** Cluster ID to add/remove from favorites (for clusters) */
  clusterId?: number;

  /** Extra CSS class applied to the root button */
  className?: string;

  /** UI string overrides */
  labels?: Record<string, string>;
}

function AddToFavorite(props: AddToFavoriteProps) {
  const [memberListIds, setMemberListIds] = useState<Set<string>>(() => new Set());
  const [showModal, setShowModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isProduct = !!props.productId;
  const itemId = (props.productId || props.clusterId || 0) as number;
  const isFavorited = memberListIds.size > 0;

  const userLists = (props.user as any)?.favoriteLists?.items as FavoriteList[] | undefined;

  function getMemberLists(): FavoriteList[] {
    return (userLists || []).filter((list: FavoriteList) => memberListIds.has(String(list.id)));
  }

  function getNonMemberLists(): FavoriteList[] {
    return (userLists || []).filter((list: FavoriteList) => !memberListIds.has(String(list.id)));
  }

  function getLabel(key: string, fallback: string): string {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  function getListIds(list: FavoriteList): { productIds: number[]; clusterIds: number[] } {
    const productIds: number[] = [];
    const clusterIds: number[] = [];
    const productsRef = list?.products as { items?: { productId?: number; clusterId?: number }[] } | undefined;
    if (productsRef?.items) {
      productsRef.items.forEach((item) => {
        if (item.productId) productIds.push(item.productId);
        if (item.clusterId && !clusterIds.includes(item.clusterId)) clusterIds.push(item.clusterId);
      });
    }
    const clustersRef = list?.clusters as { items?: { clusterId?: number }[] } | undefined;
    if (clustersRef?.items) {
      clustersRef.items.forEach((item) => {
        if (item.clusterId && !clusterIds.includes(item.clusterId)) clusterIds.push(item.clusterId);
      });
    }
    return { productIds, clusterIds };
  }

  function toggleModal() {
    if (!props.user) return;
    if (!showModal) {
      // Pre-select the first non-member list when opening
      const nonMember = getNonMemberLists();
      if (nonMember.length > 0) setSelectedListId(String(nonMember[0].id));
    }
    setShowModal(!showModal);
  }

  function closeModal() {
    setShowModal(false);
  }

  async function handleAddToList() {
    if (!selectedListId || !props.graphqlClient || addLoading) return;

    setAddLoading(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);
      const list = (userLists || []).find((l: FavoriteList) => String(l.id) === String(selectedListId));
      const { productIds, clusterIds } = getListIds(list!);

      if (isProduct && !productIds.includes(itemId)) {
        productIds.push(itemId);
      } else if (!isProduct && !clusterIds.includes(itemId)) {
        clusterIds.push(itemId);
      }

      await service.updateFavoriteList(selectedListId, {
        name: list?.name,
        isDefault: list?.isDefault,
        productIds,
        clusterIds,
      });

      setMemberListIds((prev) => {
        const next = new Set(prev);
        next.add(String(selectedListId));
        return next;
      });
      setSelectedListId('');
      setShowModal(false);
      toast.success(getLabel('addedToFavorites', 'Added to favorites'));
    } catch (error) {
      console.error('Error adding to favorite list:', error);
      toast.error(getLabel('addError', 'Failed to add to favorites'));
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemoveFromList(listId: string) {
    if (!props.graphqlClient || removeLoading) return;

    setRemoveLoading(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);
      const list = (userLists || []).find((l: FavoriteList) => String(l.id) === String(listId));
      const { productIds, clusterIds } = getListIds(list!);

      await service.updateFavoriteList(listId, {
        name: list?.name,
        isDefault: list?.isDefault,
        productIds: isProduct ? productIds.filter((id: number) => id !== itemId) : productIds,
        clusterIds: !isProduct ? clusterIds.filter((id: number) => id !== itemId) : clusterIds,
      });

      setMemberListIds((prev) => {
        const next = new Set(prev);
        next.delete(String(listId));
        return next;
      });
      setShowModal(false);
      toast.success(getLabel('removedFromFavorites', 'Removed from favorites'));
    } catch (error) {
      console.error('Error removing from favorite list:', error);
      toast.error(getLabel('removeError', 'Failed to remove from favorites'));
    } finally {
      setRemoveLoading(false);
    }
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Derive membership from props.user.favoriteLists.items — no service call needed
  useEffect(() => {
    if (!props.user || !itemId) return;
    const memberIds = new Set<string>();
    (userLists || []).forEach((list: FavoriteList) => {
      const productsRef = list?.products as { items?: { productId?: number; clusterId?: number }[] } | undefined;
      const clustersRef = list?.clusters as { items?: { clusterId?: number }[] } | undefined;
      if (isProduct) {
        if (productsRef?.items?.some((item) => item.productId === itemId)) {
          memberIds.add(String(list.id));
        }
      } else {
        const inProducts = productsRef?.items?.some((item) => item.clusterId === itemId);
        const inClusters = clustersRef?.items?.some((item) => item.clusterId === itemId);
        if (inProducts || inClusters) {
          memberIds.add(String(list.id));
        }
      }
    });
    setMemberListIds(memberIds);
  }, [props.user, props.productId, props.clusterId]);

  if (!props.user) return null;

  return (
    <div className="relative inline-block">
      {/* Heart button */}
      <button
        type="button"
        onClick={() => toggleModal()}
        className={`inline-flex items-center justify-center rounded-md border p-2.5 transition-colors ${
          isFavorited
            ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
            : 'border-gray-200 bg-white text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5'
        } ${props.className || ''}`}
        title={
          isFavorited
            ? getLabel('removeFromFavorites', 'Remove from favorites')
            : getLabel('addToFavorites', 'Add to favorites')
        }
      >
        {isFavorited ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
        )}
      </button>

      {/* Modal */}
      {showModal && isMounted ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-lg border">
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-4">
              <h3 className="text-xl font-bold">
                {getLabel('modalTitle', 'Favorite product?')}
              </h3>
              <button
                type="button"
                onClick={() => closeModal()}
                className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 pb-6 space-y-4">
              {/* Lists where item IS a member — clickable to remove */}
              {getMemberLists().length > 0 ? (
                <div className="space-y-2">
                  {getMemberLists().map((list: FavoriteList) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => handleRemoveFromList(String(list.id))}
                      disabled={removeLoading}
                      className="flex items-center gap-2 py-2 w-full text-left hover:bg-gray-50 rounded-md px-1 transition-colors disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0">
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                      <span className="text-sm font-medium">{list.name}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const memberLists = getMemberLists();
                      if (memberLists.length > 0) handleRemoveFromList(String(memberLists[0].id));
                    }}
                    disabled={removeLoading}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-md transition-colors disabled:opacity-50"
                  >
                    {removeLoading
                      ? getLabel('removing', 'Removing...')
                      : getLabel('removeFromFavorites', 'Remove from favorites')}
                  </button>
                  <div className="border-t border-gray-200" />
                </div>
              ) : null}

              {/* Dropdown to select a list + add button */}
              {getNonMemberLists().length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">
                      {getLabel('chooseList', 'Choose a favorites list*')}
                    </label>
                    <select
                      value={selectedListId}
                      onChange={(e) => setSelectedListId(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-primary"
                    >
                      {getNonMemberLists().map((list: FavoriteList) => (
                        <option key={list.id} value={String(list.id)}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddToList()}
                    disabled={!selectedListId || addLoading}
                    className="w-full py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-md transition-colors disabled:opacity-50"
                  >
                    {addLoading
                      ? getLabel('adding', 'Adding...')
                      : getLabel('addToFavorites', 'Add to favorites')}
                  </button>
                </div>
              ) : null}

              {/* No lists at all */}
              {getMemberLists().length === 0 && getNonMemberLists().length === 0 ? (
                <div className="py-4 text-center text-gray-500 text-sm">
                  {getLabel('noLists', 'You have no favorite lists. Create one in your account first.')}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AddToFavorite;
