'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

import { FavoriteListService } from '@/lib/services/FavoriteListService';
import { FavoriteList } from 'propeller-sdk-v2';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, Heart, Edit2, Calendar, Package } from 'lucide-react';

export default function FavoritesPage() {
  const { state: authState } = useAuth();
  const [favoriteLists, setFavoriteLists] = useState<FavoriteList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');
  const [editSetAsDefault, setEditSetAsDefault] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [listToDelete, setListToDelete] = useState<FavoriteList | null>(null);

  const fetchFavoriteLists = useCallback(async () => {
    try {
      setLoading(true);
      const service = new FavoriteListService();
      const lists = await service.getUserFavoriteLists(authState.user);
      setFavoriteLists(lists);
    } catch (error) {
      console.error('Error fetching favorite lists:', error);
    } finally {
      setLoading(false);
    }
  }, [authState.user]);

  useEffect(() => {
    if (authState.isAuthenticated) {
      fetchFavoriteLists();
    }
  }, [authState.isAuthenticated, fetchFavoriteLists]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const service = new FavoriteListService();
      await service.createFavoriteList({
        name: newListName,
        isDefault: setAsDefault
      });

      setNewListName('');
      setSetAsDefault(false);
      setShowCreateModal(false);
      toast.success('Favorite list created');
      fetchFavoriteLists();
    } catch (error) {
      console.error('Error creating favorite list:', error);
      toast.error('Failed to create favorite list');
    }
  };

  const handleEditList = (list: FavoriteList) => {
    setEditingListId(String(list.id));
    setEditListName(list.name);
    setEditSetAsDefault(list.isDefault || false);
  };

  const handleCancelEdit = () => {
    setEditingListId(null);
    setEditListName('');
    setEditSetAsDefault(false);
  };

  const handleUpdateList = async (listId: string) => {
    if (!editListName.trim()) return;

    try {
      const service = new FavoriteListService();
      await service.updateFavoriteList(listId, {
        name: editListName,
        isDefault: editSetAsDefault
      });

      toast.success('Favorite list updated');
      fetchFavoriteLists();
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating favorite list:', error);
      toast.error('Failed to update favorite list');
    }
  };

  const handleDeleteList = (list: FavoriteList) => {
    setListToDelete(list);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!listToDelete) return;

    try {
      const service = new FavoriteListService();
      await service.deleteFavoriteList(String(listToDelete.id));
      toast.success('Favorite list deleted');
      fetchFavoriteLists();
      setShowDeleteModal(false);
      setListToDelete(null);
    } catch (error) {
      console.error('Error deleting favorite list:', error);
      toast.error('Failed to delete favorite list');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setListToDelete(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTotalCount = (list: FavoriteList) => {
    const productCount = getProductCount(list);
    const clusterCount = getClusterCount(list);
    return productCount + clusterCount;
  };

  const getProductCount = (list: FavoriteList) => {
    if (Array.isArray(list.products)) {
      return list.products.length;
    } else if (list.products && typeof list.products === 'object' && 'items' in list.products) {
      return (list.products as { items?: unknown[] }).items?.length || 0;
    } else if (list.products && typeof list.products === 'object' && 'itemsFound' in list.products) {
      return (list.products as { itemsFound?: number }).itemsFound || 0;
    }
    return 0;
  };

  const getClusterCount = (list: FavoriteList) => {
    if (Array.isArray(list.clusters)) {
      return list.clusters.length;
    } else if (list.clusters && typeof list.clusters === 'object' && 'items' in list.clusters) {
      return (list.clusters as { items?: unknown[] }).items?.length || 0;
    } else if (list.clusters && typeof list.clusters === 'object' && 'itemsFound' in list.clusters) {
      return (list.clusters as { itemsFound?: number }).itemsFound || 0;
    }
    return 0;
  };

  if (!authState.isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">My Favorites</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New List
        </Button>
      </div>

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
                <div className="flex gap-2">
                  <div className="h-8 w-8 bg-muted rounded"></div>
                  <div className="h-8 w-8 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : favoriteLists.length > 0 ? (
        <div className="space-y-4">
          {favoriteLists.map((list) => (
            <div key={list.id} className="border border-border/60 rounded-lg p-6 hover:bg-muted/30 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {editingListId === list.id ? (
                    // Edit mode
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
                          id={`default-${list.id}`}
                          checked={editSetAsDefault}
                          onChange={(e) => setEditSetAsDefault(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <label htmlFor={`default-${list.id}`} className="text-sm text-muted-foreground">
                          Make default
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateList(String(list.id))}
                          disabled={!editListName.trim()}
                        >
                          Save
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Link 
                          href={`/account/favorites/${list.id}`}
                          className="text-xl font-semibold hover:text-primary transition-colors"
                        >
                          {list.name}
                        </Link>
                        {list.isDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            Default
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Last modified: {formatDate(list.updatedAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          {getTotalCount(list)} items ({getProductCount(list)} products, {getClusterCount(list)} clusters)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {editingListId !== list.id && (
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
            <p className="text-lg font-medium">No favorite lists</p>
            <p className="text-muted-foreground">Start by creating a new list to save your items.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>Create your first list</Button>
        </div>
      )}

      {/* Create New List Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background p-6 rounded-lg max-w-md w-full shadow-lg border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Create New List</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="listName" className="text-sm font-medium">Name</label>
                <Input
                  id="listName"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Enter list name"
                  autoFocus
                  required
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="setAsDefault"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="setAsDefault" className="text-sm text-muted-foreground">
                  Set as default favorite list
                </label>
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!newListName.trim()}>
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && listToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background p-6 rounded-lg max-w-md w-full shadow-lg border animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Delete Favorite List</h3>
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
              <p>Are you sure you want to delete <strong>&quot;{listToDelete.name}&quot;</strong>?</p>
              <p className="text-sm text-destructive">This action cannot be undone.</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-6">
              <Button variant="outline" onClick={handleCancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
