import { QueryClient } from "@tanstack/react-query";

/** Keep cached query data on disk (PersistQueryClient) and in memory for a week. */
const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;
/** Default: treat server data as fresh for 24h so navigation/refresh uses cache first. */
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: ONE_WEEK_MS,
      staleTime: ONE_DAY_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
  },
});
