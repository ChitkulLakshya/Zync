import { useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/utils';
import { detectLocation } from '@/api/geo';

export const useUserSync = () => {
  const queryClient = useQueryClient();
  const syncInProgress = useRef(false);

  useEffect(() => {
    const shouldSyncInDev =
      String(import.meta.env.VITE_ENABLE_DEV_USER_SYNC || '').toLowerCase() === 'true';

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && !syncInProgress.current) {
        if (import.meta.env.DEV && !shouldSyncInDev) {
          return;
        }
        syncInProgress.current = true;
        const displayName = user.displayName || '';
        const parts = displayName.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        // Detect timezone from browser (instant, no API needed)
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        try {
          const token = await user.getIdToken();

          // Sync user data with backend (includes timezone)
          const syncRes = await fetch(`${API_BASE_URL}/api/users/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL,
              firstName,
              lastName,
              timezone: browserTimezone,
            }),
          });
          if (!syncRes.ok) {
            throw new Error(`User sync failed: ${syncRes.status}`);
          }

          // Fire-and-forget: enrich location from IP (non-blocking)
          detectLocation().catch(() => {});

          // Prefetch essential data (same query key as useMe)
          await queryClient.prefetchQuery({
            queryKey: ['me', user.uid],
            queryFn: async () => {
              const res = await fetch(`${API_BASE_URL}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                if (res.status === 404) {
                  return null;
                }
                throw new Error('Failed to fetch user data');
              }
              const data = await res.json();
              if (!data || typeof data !== 'object' || !data.uid) {
                throw new Error('Invalid user data');
              }
              return data;
            },
          });

          // Do not invalidate here — that would force an immediate refetch and defeat local cache.
        } catch {
          // Backend can be temporarily unavailable in local/dev setups.
          // Keep UI functional and avoid noisy console errors.
        } finally {
          syncInProgress.current = false;
        }
      } else if (!user) {
        syncInProgress.current = false;
      }
    });

    return () => unsubscribe();
  }, [queryClient]);
};
