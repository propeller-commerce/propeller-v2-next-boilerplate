import { graphqlClient } from '../api';

/**
 * Base class for all API services that provides common post-processing patterns
 */
export abstract class BaseApiService {
    protected initialized: boolean = false;

    /**
     * Initialize the service - to be implemented by each service
     */
    abstract initialize(): Promise<void>;

    /**
     * Ensure the service is initialized before performing operations
     */
    protected async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    /**
     * Handle API errors and transform them to user-friendly messages
     */
    protected handleApiError(error: any, operation: string): Error {
        console.error(`${operation} failed:`, error);

        // Transform specific API errors to user-friendly messages
        if (error?.message) {
            if (error.message.includes('unauthorized') || error.message.includes('401')) {
                return new Error('Authentication failed. Please log in again.');
            }
            if (error.message.includes('forbidden') || error.message.includes('403')) {
                return new Error('Access denied. You do not have permission for this action.');
            }
            if (error.message.includes('not found') || error.message.includes('404')) {
                return new Error('Requested resource not found.');
            }
            if (error.message.includes('network') || error.message.includes('timeout')) {
                return new Error('Network error. Please check your connection and try again.');
            }
        }

        // Fallback to original error message or generic message
        return new Error(error?.message || `${operation} failed. Please try again.`);
    }

    /**
     * Store data in localStorage with error handling
     */
    protected setLocalStorage(key: string, value: any): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.warn(`Failed to store ${key} in localStorage:`, error);
        }
    }

    /**
     * Retrieve data from localStorage with error handling
     */
    protected getLocalStorage<T>(key: string): T | null {
        if (typeof window === 'undefined') return null;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.warn(`Failed to retrieve ${key} from localStorage:`, error);
            return null;
        }
    }

    /**
     * Clear data from localStorage
     */
    protected clearLocalStorage(key: string): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Failed to clear ${key} from localStorage:`, error);
        }
    }

    /**
     * Update GraphQL client headers (for authentication)
     * Preserves existing headers like 'apikey' while adding new ones
     */
    protected updateClientHeaders(headers: Record<string, string>): void {
        try {
            // Get current config to preserve existing headers
            const currentConfig = graphqlClient.getConfig();
            const mergedHeaders = {
                ...currentConfig.headers,
                ...headers
            };

            if (process.env.NODE_ENV !== 'production') {
                // Headers include the Authorization bearer — dev-only.
                console.log('Updating GraphQL client headers:', {
                    existing: currentConfig.headers,
                    new: headers,
                    merged: mergedHeaders
                });
            }

            graphqlClient.updateConfig({ headers: mergedHeaders });
        } catch (error) {
            console.warn('Failed to update GraphQL client headers:', error);
        }
    }

    /**
     * Log API operations for debugging
     */
    protected logOperation(operation: string, data?: any): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(`API Operation: ${operation}`, data);
        }
    }

    /**
     * Transform propeller-v2 LocalizedString arrays to simple strings
     */
    protected getLocalizedString(localizedStrings?: any[], language: string = 'NL'): string {
        if (!Array.isArray(localizedStrings) || localizedStrings.length === 0) {
            return '';
        }

        // Try to find the requested language
        const localized = localizedStrings.find(item =>
            item.language === language || item.lang === language
        );

        if (localized) {
            return localized.value || localized.text || '';
        }

        // Fallback to first available string
        const fallback = localizedStrings[0];
        return fallback?.value || fallback?.text || '';
    }

    /**
     * Validate required fields and throw errors if missing
     */
    protected validateRequired(data: any, fields: string[], operation: string): void {
        const missing = fields.filter(field => !data[field]);
        if (missing.length > 0) {
            throw new Error(`${operation} failed: Missing required fields: ${missing.join(', ')}`);
        }
    }

    /**
     * Generic retry mechanism for API calls
     */
    protected async retry<T>(
        operation: () => Promise<T>,
        maxRetries: number = 3,
        delay: number = 1000
    ): Promise<T> {
        let lastError: Error = new Error('Unknown error occurred');

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                if (attempt === maxRetries) {
                    break;
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }

        throw new Error(lastError.message || 'Operation failed after retries');
    }
} 
