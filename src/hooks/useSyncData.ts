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
