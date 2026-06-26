// Imports the core QueryClient class from TanStack Query to manage the application's global data fetching state and cache.
import { QueryClient } from "@tanstack/react-query";

/** Keep cached query data on disk (PersistQueryClient) and in memory for a week. */
// Defines a constant representing exactly one week in milliseconds (1000ms * 60s * 60m * 24h * 7d) to determine how long inactive cache data is kept before garbage collection.
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

/** Default: treat server data as fresh for 24h so navigation/refresh uses cache first. */
// Defines a constant representing exactly one day in milliseconds to prevent redundant network requests for data that changes infrequently.
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

// Instantiates and exports a singleton QueryClient that will wrap the entire React application.
export const queryClient = new QueryClient({
  // Configures the global fallback settings for all queries that do not specify their own individual options.
  defaultOptions: {
    queries: {
      // Sets the garbage collection time (gcTime) to one week, ensuring offline data persists across sessions.
      gcTime: ONE_WEEK_MS,
      // Sets the stale time to one day, meaning data fetched within the last 24 hours is considered fresh and won't trigger automatic background refetches.
      staleTime: ONE_DAY_MS,
      // Disables automatic refetching when the user switches browser tabs and returns, reducing unnecessary server load.
      refetchOnWindowFocus: false,
      // Enables automatic refetching when the device regains network connectivity after being offline.
      refetchOnReconnect: true,
      // Configures queries to automatically retry failed network requests up to 2 times before throwing an error to the UI.
      retry: 2,
    },
  },
});
