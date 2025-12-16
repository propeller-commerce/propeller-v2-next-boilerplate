import { FavoriteListService as PropellerFavoriteListService, UserService, Contact, Customer } from 'propeller-sdk-v2';
import { graphqlClient } from '../api';
import { BaseApiService } from './BaseApiService';

// Import types from propeller-sdk-v2
import {
    FavoriteListsCreateInput,
    FavoriteListsSearchInput,
    FavoriteListsResponse,
    FavoriteListsUpdateInput,
    FavoriteList
} from 'propeller-sdk-v2';

// User type from AuthContext
type User = Contact | Customer;

/**
 * FavoriteListService handles favorite list operations using propeller-sdk-v2 services
 */
export class FavoriteListService extends BaseApiService {
    private favoriteListService: PropellerFavoriteListService;
    private userService: UserService;

    constructor() {
        super();
        this.favoriteListService = new PropellerFavoriteListService(graphqlClient);
        this.userService = new UserService(graphqlClient);
    }

    /**
     * Initialize the favorite list service
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Initialize services if needed (SDK v2 services might not need explicit init)
            // await this.favoriteListService.initializeService();

            this.initialized = true;
            this.logOperation('FavoriteListService initialized');
        } catch (error) {
            const handledError = this.handleApiError(error, 'FavoriteListService initialization');
            throw handledError;
        }
    }

    /**
     * Create a new favorite list
     */
    async createFavoriteList(input: FavoriteListsCreateInput): Promise<FavoriteList> {
        try {
            await this.ensureInitialized();

            this.logOperation('Creating favorite list', { name: input.name });

            // Check if we have proper authorization headers
            const accessToken = this.getLocalStorage<string>('accessToken');
            if (accessToken) {
                // Ensure the GraphQL client has the authorization header
                this.updateClientHeaders({
                    'Authorization': `Bearer ${accessToken}`
                });
            } else {
                console.warn('No access token found in localStorage');
            }

            // Make the API call directly
            const result = await this.favoriteListService.createFavoriteList(input);

            this.logOperation('Favorite list created successfully', {
                id: result.id,
                name: result.name
            });

            return result;
        } catch (error) {
            throw this.handleApiError(error, 'Create favorite list');
        }
    }

    /**
     * Get favorite lists for the current user
     */
    async getFavoriteLists(input: FavoriteListsSearchInput): Promise<FavoriteListsResponse> {
        try {
            await this.ensureInitialized();

            this.logOperation('Fetching favorite lists', input);

            const result = await this.favoriteListService.getFavoriteLists(input);

            this.logOperation('Favorite lists fetched successfully', {
                count: result.items?.length || 0
            });

            return result;
        } catch (error) {
            throw this.handleApiError(error, 'Get favorite lists');
        }
    }

    /**
     * Get a single favorite list with full details
     * @param listId - The favorite list ID
     * @param user - The currently authenticated user from AuthContext
     */
    async getFavoriteList(listId: string, user?: User | null): Promise<FavoriteList> {
        try {
            await this.ensureInitialized();

            this.logOperation('Fetching favorite list details', { listId });

            // Check if we have proper authorization headers
            const accessToken = this.getLocalStorage<string>('accessToken');
            if (accessToken) {
                this.updateClientHeaders({
                    'Authorization': `Bearer ${accessToken}`
                });
            }

            // Build the input object according to the specifications
            const input = {
                id: listId,
                language: "NL",
                priceCalculateProductInput: {
                    taxZone: "NL"
                } as any,
                imageSearchFilters: {
                    page: 1,
                    offset: 1
                },
                imageVariantFilters: {
                    transformations: [{
                        name: 'cart_thumb',
                        transformation: {
                            format: 'WEBP',
                            height: 200,
                            width: 200,
                            fit: 'BOUNDS'
                        }
                    }]
                }
            };

            // Add user-specific price calculation parameters if user is logged in
            if (user) {
                if ('customerId' in user && user.customerId) {
                    input.priceCalculateProductInput.customerId = user.customerId;
                } else if ('contactId' in user && user.contactId && 'company' in user && user.company?.companyId) {
                    input.priceCalculateProductInput.contactId = user.contactId;
                    input.priceCalculateProductInput.companyId = user.company.companyId;
                }
            }

            const result = await this.favoriteListService.getFavoriteList(input);

            this.logOperation('Favorite list details fetched successfully', {
                id: result.id,
                name: result.name,
                productsCount: result.products?.items?.length || 0,
                clustersCount: result.clusters?.items?.length || 0
            });

            return result;
        } catch (error) {
            throw this.handleApiError(error, 'Get favorite list details');
        }
    }

    /**
     * Get favorite lists for the authenticated user
     * @param user - The currently authenticated user from AuthContext
     */
    async getUserFavoriteLists(user?: User | null): Promise<FavoriteList[]> {
        try {
            // First check if user has favorite lists in their data
            if (user && 'favoriteLists' in user && user.favoriteLists?.items) {
                this.logOperation('Retrieved favorite lists from user data', {
                    count: user.favoriteLists.items.length
                });
                return user.favoriteLists.items;
            }

            // If not, fetch from API
            if (!user) {
                throw new Error('No user data found');
            }

            const searchInput: FavoriteListsSearchInput = {};

            // Set appropriate ID based on user type
            if ('contactId' in user && user.contactId) {
                searchInput.contactId = user.contactId;
            } else if ('customerId' in user && user.customerId) {
                searchInput.customerId = user.customerId;
            } else {
                console.warn('Could not determine user type for favorite lists search');
            }

            const response = await this.getFavoriteLists(searchInput);
            return response.items || [];
        } catch (error) {
            throw this.handleApiError(error, 'Get user favorite lists');
        }
    }

    /**
     * Refresh user data after creating a favorite list
     */
    async refreshUserData(): Promise<void> {
        try {
            await this.ensureInitialized();

            this.logOperation('Refreshing user data');

            const accessToken = this.getLocalStorage<string>('accessToken');
            if (accessToken) {
                this.updateClientHeaders({
                    'Authorization': `Bearer ${accessToken}`
                });
            }

            const viewerData = await this.userService.getViewer({});

            if (viewerData) {
                // Store the complete viewer response in localStorage under 'user' key
                this.setLocalStorage('user', viewerData);
                this.logOperation('User data refreshed successfully');
            } else {
                throw new Error('No viewer data received');
            }
        } catch (error) {
            throw this.handleApiError(error, 'Refresh user data');
        }
    }

    /**
     * Update a favorite list
     */
    async updateFavoriteList(id: string, input: FavoriteListsUpdateInput): Promise<FavoriteList> {
        try {
            await this.ensureInitialized();

            this.logOperation('Updating favorite list', { id, name: input.name });

            const accessToken = this.getLocalStorage<string>('accessToken');
            if (accessToken) {
                this.updateClientHeaders({
                    'Authorization': `Bearer ${accessToken}`
                });
            }

            const result = await this.favoriteListService.updateFavoriteList(id, input);

            this.logOperation('Favorite list updated successfully', {
                id: result.id,
                name: result.name
            });

            return result;
        } catch (error) {
            throw this.handleApiError(error, 'Update favorite list');
        }
    }

    /**
     * Delete a favorite list
     */
    async deleteFavoriteList(id: string): Promise<void> {
        try {
            await this.ensureInitialized();

            this.logOperation('Deleting favorite list', { id });

            const accessToken = this.getLocalStorage<string>('accessToken');
            if (accessToken) {
                this.updateClientHeaders({
                    'Authorization': `Bearer ${accessToken}`
                });
            }

            await this.favoriteListService.deleteFavoriteList(id);

            this.logOperation('Favorite list deleted successfully', { id });
        } catch (error) {
            throw this.handleApiError(error, 'Delete favorite list');
        }
    }

    /**
     * Create favorite list and refresh user data
     */
    async createFavoriteListAndRefresh(input: FavoriteListsCreateInput): Promise<FavoriteList> {
        try {
            const newList = await this.createFavoriteList(input);
            await this.refreshUserData();
            return newList;
        } catch (error) {
            throw this.handleApiError(error, 'Create favorite list and refresh');
        }
    }

    /**
     * Update favorite list and refresh user data
     */
    async updateFavoriteListAndRefresh(id: string, input: FavoriteListsUpdateInput): Promise<FavoriteList> {
        try {
            const updatedList = await this.updateFavoriteList(id, input);
            await this.refreshUserData();
            return updatedList;
        } catch (error) {
            throw this.handleApiError(error, 'Update favorite list and refresh');
        }
    }

    /**
     * Delete favorite list and refresh user data
     */
    async deleteFavoriteListAndRefresh(id: string): Promise<void> {
        try {
            await this.deleteFavoriteList(id);
            await this.refreshUserData();
        } catch (error) {
            throw this.handleApiError(error, 'Delete favorite list and refresh');
        }
    }
}

// Export a singleton instance
export const favoriteListService = new FavoriteListService();
