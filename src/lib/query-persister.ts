// Imports the factory function to create a synchronous storage persister, enabling TanStack Query to save its cache to local browser storage.
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

/**
 * Persister for TanStack Query using localStorage.
 * This works in both Web and Electron environments.
 */
// Initializes and exports the persister instance that tells TanStack Query exactly how and where to save its serialized cache.
export const queryPersister = createSyncStoragePersister({
  // Directs the persister to use the synchronous window.localStorage API for persistent data storage across sessions.
  storage: window.localStorage,
  // Defines the unique string key under which all cached data will be stored in the browser's local storage.
  key: 'ZYNC_QUERY_CACHE',
});

/**
 * Clears the query cache from localStorage.
 * Should be called on logout.
 */
// Exports a utility function designed specifically to purge the cached query data, ensuring no sensitive data remains when a user logs out.
export const clearQueryCache = () => {
  // Directly removes the specific cache item from localStorage using the same key defined in the persister.
  window.localStorage.removeItem('ZYNC_QUERY_CACHE');
};
