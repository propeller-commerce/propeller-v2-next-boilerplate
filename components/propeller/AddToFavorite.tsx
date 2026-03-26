'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  FavoriteListService,
  FavoriteList,
  GraphQLClient,
  Contact,
  Customer,
  UserService,
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
interface AddToFavoriteState {
  /** IDs of lists that contain this product/cluster (optimistic local tracking) */
  memberListIds: Set<string>;
  showModal: boolean;
  selectedListId: string;
  addLoading: boolean;
  removeLoading: boolean;
  _isMounted: boolean;
  isFavorited: () => boolean;
  isProduct: () => boolean;
  itemId: () => number;
  refreshUserData: () => Promise<void>;
  toggleModal: () => void;
  closeModal: () => void;
  handleAddToList: () => Promise<void>;
  handleRemoveFromList: (listId: string) => Promise<void>;
  getLabel: (key: string, fallback: string) => string;
  getMemberLists: () => FavoriteList[];
  getNonMemberLists: () => FavoriteList[];
}

function AddToFavorite(props: AddToFavoriteProps) {
  const [memberListIds, setMemberListIds] = useState<AddToFavoriteState['memberListIds']>(
    () => new Set<string>()
  );
  const [showModal, setShowModal] = useState<AddToFavoriteState['showModal']>(() => false);
  const [selectedListId, setSelectedListId] = useState<AddToFavoriteState['selectedListId']>(
    () => ''
  );
  const [addLoading, setAddLoading] = useState<AddToFavoriteState['addLoading']>(() => false);
  const [removeLoading, setRemoveLoading] = useState<AddToFavoriteState['removeLoading']>(
    () => false
  );
  const [_isMounted, set_isMounted] = useState<AddToFavoriteState['_isMounted']>(() => false);
  function isFavorited(): ReturnType<AddToFavoriteState['isFavorited']> {
    return memberListIds.size > 0;
  }

  function isProduct(): ReturnType<AddToFavoriteState['isProduct']> {
    return !!props.productId;
  }

  function itemId(): ReturnType<AddToFavoriteState['itemId']> {
    return (props.productId || props.clusterId || 0) as number;
  }

  async function refreshUserData(): ReturnType<AddToFavoriteState['refreshUserData']> {
    if (!props.graphqlClient) return;
    try {
      const userService = new UserService(props.graphqlClient);
      const viewerData = await userService.getViewer({});
      if (viewerData) {
        const plain = JSON.parse(JSON.stringify(viewerData, (_k, v) => v));
        // Strip underscore prefixes from SDK objects
        const strip = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;
          if (Array.isArray(obj)) return obj.map(strip);
          if (typeof obj === 'object') {
            const r: any = {};
            for (const [k, val] of Object.entries(obj)) {
              r[k.startsWith('_') ? k.slice(1) : k] = strip(val);
            }
            return r;
          }
          return obj;
        };
        localStorage.setItem('user', JSON.stringify(strip(plain)));
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  }

  function toggleModal(): ReturnType<AddToFavoriteState['toggleModal']> {
    if (!props.user) return;
    setShowModal(!showModal);
  }

  function closeModal(): ReturnType<AddToFavoriteState['closeModal']> {
    setShowModal(false);
  }

  async function handleAddToList(): ReturnType<AddToFavoriteState['handleAddToList']> {
    if (!selectedListId || !props.graphqlClient || addLoading) return;
    setAddLoading(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);
      const input = isProduct()
        ? {
            productIds: [itemId()],
          }
        : {
            clusterIds: [itemId()],
          };
      await service.addFavoriteListItems(selectedListId, input);
      const newMemberIds = new Set(memberListIds);
      newMemberIds.add(String(selectedListId));
      setMemberListIds(newMemberIds);
      setSelectedListId('');
      setShowModal(false);
      refreshUserData();
    } catch (error) {
      console.error('Error adding to favorite list:', error);
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemoveFromList(
    listId: string
  ): ReturnType<AddToFavoriteState['handleRemoveFromList']> {
    if (!props.graphqlClient || removeLoading) return;
    setRemoveLoading(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);
      const input = isProduct()
        ? {
            productIds: [itemId()],
          }
        : {
            clusterIds: [itemId()],
          };
      await service.removeFavoriteListItems(listId, input);
      const newMemberIds = new Set(memberListIds);
      newMemberIds.delete(String(listId));
      setMemberListIds(newMemberIds);
      setShowModal(false);
      refreshUserData();
    } catch (error) {
      console.error('Error removing from favorite list:', error);
    } finally {
      setRemoveLoading(false);
    }
  }

  function getLabel(key: string, fallback: string): ReturnType<AddToFavoriteState['getLabel']> {
    const labels = props.labels as Record<string, string> | undefined;
    return labels?.[key] || fallback;
  }

  function getMemberLists(): ReturnType<AddToFavoriteState['getMemberLists']> {
    const userLists = (props.user as any)?.favoriteLists?.items as FavoriteList[] | undefined;
    return (userLists || []).filter((list: FavoriteList) => memberListIds.has(String(list.id)));
  }

  function getNonMemberLists(): ReturnType<AddToFavoriteState['getNonMemberLists']> {
    const userLists = (props.user as any)?.favoriteLists?.items as FavoriteList[] | undefined;
    return (userLists || []).filter((list: FavoriteList) => !memberListIds.has(String(list.id)));
  }

  useEffect(() => {
    if (!props.user || !itemId()) return;
    const userLists = (props.user as any)?.favoriteLists?.items as FavoriteList[] | undefined;
    const memberIds = new Set<string>();
    (userLists || []).forEach((list: FavoriteList) => {
      const productsRef = list?.products as
        | {
            items?: {
              productId?: number;
              clusterId?: number;
            }[];
          }
        | undefined;
      const clustersRef = list?.clusters as
        | {
            items?: {
              clusterId?: number;
            }[];
          }
        | undefined;
      if (isProduct()) {
        if (productsRef?.items?.some((item) => item.productId === itemId())) {
          memberIds.add(String(list.id));
        }
      } else {
        const inProducts = productsRef?.items?.some((item) => item.clusterId === itemId());
        const inClusters = clustersRef?.items?.some((item) => item.clusterId === itemId());
        if (inProducts || inClusters) {
          memberIds.add(String(list.id));
        }
      }
    });
    setMemberListIds(memberIds);
  }, [props.user, props.productId, props.clusterId]);

  return (
    <>
      {props.user ? (
        <>
          <div className="relative inline-block">
            <button
              type="button"
              onClick={(event) => toggleModal()}
              title={
                isFavorited()
                  ? getLabel('removeFromFavorites', 'Remove from favorites')
                  : getLabel('addToFavorites', 'Add to favorites')
              }
              className={`inline-flex items-center justify-center rounded-md border p-2.5 transition-colors ${isFavorited() ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10' : 'border-gray-200 bg-white text-gray-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5'} ${props.className || ''}`}
            >
              {isFavorited() ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              ) : null}
              {!isFavorited() ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3.332.67-4.5 2.17C10.832 3.67 9.26 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              ) : null}
            </button>
            {showModal && _isMounted ? (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full shadow-lg border">
                  <div className="flex justify-between items-center p-6 pb-4">
                    <h3 className="text-xl font-bold">
                      {getLabel('modalTitle', 'Favorite product?')}
                    </h3>
                    <button
                      type="button"
                      className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      onClick={(event) => closeModal()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="px-6 pb-6 space-y-4">
                    {getMemberLists().length > 0 ? (
                      <>
                        <div className="space-y-2">
                          {getMemberLists()?.map((list) => (
                            <button
                              type="button"
                              className="flex items-center gap-2 py-2 w-full text-left hover:bg-gray-50 rounded-md px-1 transition-colors disabled:opacity-50"
                              key={list.id}
                              onClick={(event) => handleRemoveFromList(String(list.id))}
                              disabled={removeLoading}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-primary flex-shrink-0"
                              >
                                <rect width="18" height="18" x="3" y="3" rx="2" />
                                <path d="m9 12 2 2 4-4" />
                              </svg>
                              <span className="text-sm font-medium">{list.name}</span>
                            </button>
                          ))}
                          <button
                            type="button"
                            className="w-full py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-md transition-colors disabled:opacity-50"
                            onClick={(event) => {
                              const memberLists = getMemberLists();
                              if (memberLists.length > 0) {
                                handleRemoveFromList(String(memberLists[0].id));
                              }
                            }}
                            disabled={removeLoading}
                          >
                            {removeLoading ? (
                              <>{getLabel('removing', 'Removing...')}</>
                            ) : (
                              <>{getLabel('removeFromFavorites', 'Remove from favorites')}</>
                            )}
                          </button>
                        </div>
                        <div className="border-t border-gray-200" />
                      </>
                    ) : null}
                    {getNonMemberLists().length > 0 ? (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs text-gray-500">
                            {getLabel('chooseList', 'Choose a favorites list*')}
                          </label>
                          <select
                            className="block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:border-primary focus:ring-primary"
                            value={selectedListId}
                            onChange={(e) => {
                              setSelectedListId(e.target.value);
                            }}
                          >
                            {getNonMemberLists()?.map((list) => (
                              <option key={list.id} value={String(list.id)}>
                                {list.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          className="w-full py-2.5 px-4 text-sm font-medium text-white bg-primary hover:bg-primary/80 rounded-md transition-colors disabled:opacity-50"
                          onClick={(event) => handleAddToList()}
                          disabled={!selectedListId || addLoading}
                        >
                          {addLoading ? (
                            <>{getLabel('adding', 'Adding...')}</>
                          ) : (
                            <>{getLabel('addToFavorites', 'Add to favorites')}</>
                          )}
                        </button>
                      </div>
                    ) : null}
                    {getMemberLists().length === 0 && getNonMemberLists().length === 0 ? (
                      <div className="py-4 text-center text-gray-500 text-sm">
                        {getLabel(
                          'noLists',
                          'You have no favorite lists. Create one in your account first.'
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}

export default AddToFavorite;
