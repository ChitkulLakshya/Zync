# 54 — Frontend State Management

**NEW document** — TanStack Query, Zustand stores, context providers, optimistic updates, cache invalidation

---

## Feature Summary

Zync uses TanStack Query (React Query) for server state management and Zustand for client-side UI state. TanStack Query handles data fetching, caching, optimistic updates, and background refetching. Zustand manages UI-only state like theme, sidebar visibility, and active modals.

---

## Architecture Diagram

```
┌─────────────────── STATE LAYERS ────────────────────────┐
│                                                         │
│  Server State (TanStack Query)                          │
│  ├─ QueryClient with global defaults                    │
│  │   ├─ staleTime: 30s                                  │
│  │   ├─ refetchOnWindowFocus: true                      │
│  │   └─ retry: 2                                        │
│  ├─ Custom hooks: useProjects, useTasks, useNotes       │
│  ├─ Mutations: useCreateProject, useUpdateTask          │
│  └─ Query keys: ['projects'], ['projects', id], etc.    │
│                                                         │
│  Client State (Zustand)                                 │
│  ├─ useUIStore: sidebarOpen, theme, activeModal         │
│  ├─ useAuthStore: user, loading (mirror of context)     │
│  └─ useEditorStore: activeNote, isEditing               │
│                                                         │
│  Context Providers                                      │
│  ├─ AuthContext: Firebase auth state                    │
│  ├─ SocketContext: Socket.IO connections                │
│  └─ ThemeContext: dark/light mode                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## TanStack Query Setup

### QueryClient Configuration
**File:** `src/lib/queryClient.ts`
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds
      refetchOnWindowFocus: true,
      retry: 2,
      retryDelay: 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### Query Key Convention
```
['projects']                          → list of projects
['projects', projectId]               → single project
['projects', projectId, 'tasks']      → tasks in project
['projects', projectId, 'steps']      → steps in project
['conversations']                     → chat conversations
['notes', folderId]                   → notes in folder
['user', 'me']                        → current user profile
['github', 'repos']                   → GitHub repos
```

### Custom Hooks Example
**File:** `src/hooks/useProjects.ts`
```ts
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(res => res.data),
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
};
```

### Optimistic Updates
```ts
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put(`/tasks/${data.id}`, data),
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['projects', newData.projectId, 'tasks'] });
      const previous = queryClient.getQueryData(['projects', newData.projectId, 'tasks']);
      queryClient.setQueryData(['projects', newData.projectId, 'tasks'], (old) => 
        old.map(t => t.id === newData.id ? { ...t, ...newData } : t)
      );
      return { previous };
    },
    onError: (err, newData, context) => {
      queryClient.setQueryData(['projects', newData.projectId, 'tasks'], context.previous);
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'tasks'] });
    },
  });
};
```

---

## Zustand Stores

### useUIStore
**File:** `src/stores/uiStore.ts`
```ts
export const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  activeModal: null,
  setActiveModal: (modal) => set({ activeModal: modal }),
}));
```

### useEditorStore
**File:** `src/stores/editorStore.ts`
```ts
export const useEditorStore = create((set) => ({
  activeNoteId: null,
  isEditing: false,
  setActiveNote: (id) => set({ activeNoteId: id, isEditing: true }),
  clearActiveNote: () => set({ activeNoteId: null, isEditing: false }),
}));
```

---

## Socket.IO + TanStack Query Integration

When Socket.IO events arrive, query caches are updated:

```ts
// In useChatSocket hook
useEffect(() => {
  chatSocket.on('new-message', (msg) => {
    // Optimistically add to messages query
    queryClient.setQueryData(['chat', msg.chatId], (old) => [...old, msg]);
    // Invalidate conversations list
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  });
}, []);
```

---

## Cross-References

- [01-frontend-architecture.md](./01-frontend-architecture.md) — Frontend structure
- [53-frontend-routing-layout.md](./53-frontend-routing-layout.md) — Routing
- [50-socket-io-initialization.md](./50-socket-io-initialization.md) — Socket context
- [14-project-crud.md](./14-project-crud.md) — Project hooks
- [16-task-management.md](./16-task-management.md) — Task hooks with optimistic updates
