import { useEffect, useCallback, useRef } from 'react';
import {
  connectTaskSocket,
  disconnectTaskSocket,
  joinProject,
  leaveProject,
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onTaskAssigned,
  TaskEvent,
} from '@/services/taskSocketService';

interface UseTaskUpdatesOptions {
  userId: string | undefined;
  projectIds?: string[];
  onTaskChange?: (event: 'created' | 'updated' | 'deleted' | 'assigned', data: TaskEvent) => void;
}

/**
 * Hook that connects to the task socket and triggers a callback
 * whenever task data changes. Optionally joins specific project rooms.
 */
export function useTaskUpdates({ userId, projectIds, onTaskChange }: UseTaskUpdatesOptions) {
  const onTaskChangeRef = useRef(onTaskChange);
  onTaskChangeRef.current = onTaskChange;


  useEffect(() => {
    if (!userId) {
      return;
    }

    connectTaskSocket(userId);

    return () => {
      disconnectTaskSocket();
    };
  }, [userId]);


  const prevProjectIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !projectIds) {
      return;
    }

    const currentIds = new Set(projectIds);
    const prevIds = prevProjectIdsRef.current;


    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        joinProject(id);
      }
    }


    for (const id of prevIds) {
      if (!currentIds.has(id)) {
        leaveProject(id);
      }
    }

    prevProjectIdsRef.current = currentIds;

    return () => {
      for (const id of currentIds) {
        leaveProject(id);
      }
    };
  }, [userId, projectIds]);


  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubCreated = onTaskCreated((data) => {
      onTaskChangeRef.current?.('created', data);
    });

    const unsubUpdated = onTaskUpdated((data) => {
      onTaskChangeRef.current?.('updated', data);
    });

    const unsubDeleted = onTaskDeleted((data) => {
      onTaskChangeRef.current?.('deleted', data);
    });

    const unsubAssigned = onTaskAssigned((data) => {
      onTaskChangeRef.current?.('assigned', data);
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
      unsubAssigned();
    };
  }, [userId]);
}
