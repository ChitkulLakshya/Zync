/**
 * @fileoverview useSyncData.ts
 * @module useSyncData
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { auth } from '@/lib/firebase';
import { API_BASE_URL } from '@/lib/utils';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchProjects } from '@/api/projects';


async function fetchSyncData(token: string) {
  const userRes = await fetch(`${API_BASE_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const user = userRes.ok ? await userRes.json() : null;
  const projects = await fetchProjects();

  return { user, projects };
}

async function saveDataToApi(payload: any, token: string) {


  if (payload.projects && payload.projects.length > 0) {
    const proj = payload.projects[0];
    const res = await fetch(`${API_BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(proj),
    });
    if (!res.ok) {
      throw new Error('Failed to save data');
    }
    return res.json();
  }
}

/**
 * Local-first hook:
 * 1) UI reads from IndexedDB instantly (useLiveQuery)
 * 2) React Query fetches latest data in background
 * 3) On fetch success, IndexedDB is updated -> UI auto-updates
 * 4) Mutation uses optimistic update (write to IndexedDB first)
 */
export function useSyncData() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
  }, []);

  const userId = currentUser?.uid;


  const localUser = useLiveQuery(
    () => (userId ? db.userData.get(userId) : undefined),
    [userId],
    undefined
  );

  const localProjects = useLiveQuery(
    () => (userId ? db.projectData.where({ userId }).toArray() : []),
    [userId],
    []
  );


  const syncQuery = useQuery({
    queryKey: ['syncData', userId],
    queryFn: async () => {
      if (!currentUser || !userId) {
        return null;
      }
      const token = await currentUser.getIdToken();
      const result = await fetchSyncData(token);
      return result;
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });


  useEffect(() => {
    if (!syncQuery.data || !userId) {
      return;
    }

    const { user, projects } = syncQuery.data;

    db.transaction('rw', db.userData, db.projectData, async () => {

      if (user && user.uid) {
        await db.userData.put({
          ...user,
          id: user.uid,
          updatedAt: Date.now(),
        });
      }


      if (Array.isArray(projects)) {
        await db.projectData.where({ userId }).delete();
        await db.projectData.bulkPut(
          projects.map((p: any) => ({
            ...p,
            id: p._id || p.id,
            userId,
            updatedAt: Date.now(),
          }))
        );
      }
    }).catch((e) => {
      console.error('[Sync] Error! Failed writing API data to IndexedDB:', e);
    });
  }, [syncQuery.data, userId]);


  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      const token = await currentUser.getIdToken();
      const res = await saveDataToApi(payload, token);
      return res;
    },

    onMutate: async (payload: any) => {
      if (!userId) {
        return;
      }
      await queryClient.cancelQueries({ queryKey: ['syncData', userId] });

      const previousUser = await db.userData.get(userId);
      const previousProjects = await db.projectData.where({ userId }).toArray();

      await db.transaction('rw', db.userData, db.projectData, async () => {
        if (payload.user) {
          await db.userData.put({
            ...previousUser,
            ...payload.user,
            id: userId,
            updatedAt: Date.now(),
          });
        }

        if (Array.isArray(payload.projects)) {
          await db.projectData.bulkPut(
            payload.projects.map((p: any) => ({
              ...p,
              id: p.id || p._id || crypto.randomUUID(),
              userId,
              updatedAt: Date.now(),
            }))
          );
        }
      });

      return { previousUser, previousProjects };
    },

    onError: async (_error, _payload, context) => {
      if (!context || !userId) {
        return;
      }
      await db.transaction('rw', db.userData, db.projectData, async () => {
        if (context.previousUser) {
          await db.userData.put(context.previousUser);
        }
        if (Array.isArray(context.previousProjects)) {
          await db.projectData.where({ userId }).delete();
          await db.projectData.bulkPut(context.previousProjects);
        }
      });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['syncData', userId] });
    },
  });

  return {
    user: localUser,
    projects: localProjects,
    isSyncing: syncQuery.isFetching,
    syncError: syncQuery.error,
    refresh: syncQuery.refetch,
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
