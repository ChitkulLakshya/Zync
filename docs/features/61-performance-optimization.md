# 61 — Performance & Optimization

**NEW document** — Caching strategy, query optimization, lazy loading, bundle splitting, Socket.IO efficiency

---

## Feature Summary

Zync optimizes performance through Redis caching, MongoDB query indexes, frontend lazy loading, code splitting, TanStack Query background refetching, and Socket.IO efficient event design. This document covers all performance optimizations across the stack.

---

## Performance Optimization Areas

### 1. Backend Caching (Redis)
- **Project lists:** Cached per user, 300s TTL, invalidated on create/update/delete
- **GitHub repos:** Cached per user, 60s TTL
- **User profiles:** Cached per user, 300s TTL
- **Architecture analysis:** In-memory Map, 6h TTL, repo freshness key
- **Country list:** In-memory, 24h TTL

### 2. Database Query Optimization
- **Compound indexes:** `{ chatId: 1, createdAt: 1 }` for chat history
- **Text indexes:** User displayName + email for search
- **Lean queries:** `.lean()` for read-only operations (skips Mongoose overhead)
- **Projection:** `.select()` to fetch only needed fields
- **Pagination:** Cursor-based (chat) and page-based (lists)

### 3. Frontend Lazy Loading
- **Route-level:** Each view loaded on demand via `React.lazy()`
- **Component-level:** Heavy components (editors, charts) loaded conditionally
- **Image lazy loading:** `loading="lazy"` on images

### 4. Bundle Splitting
- **Vendor split:** React, Firebase, Socket.IO in separate chunks
- **Route split:** Each route is a separate chunk
- **Dynamic imports:** Heavy libraries loaded on demand

### 5. TanStack Query Optimization
- **staleTime: 30s:** Prevents excessive refetching
- **refetchOnWindowFocus:** Keeps data fresh when user returns
- **Optimistic updates:** UI updates before server confirms
- **Background refetch:** Data stays fresh without blocking UI
- **Query invalidation:** Surgical cache invalidation on mutations

### 6. Socket.IO Efficiency
- **Namespaces:** Isolated event spaces (no cross-namespace pollution)
- **Rooms:** Targeted broadcasts (only relevant clients receive events)
- **Dumb relay:** Yjs updates forwarded without server-side processing
- **Multi-device:** Single emit reaches all of a user's devices

---

## Caching Strategy Detail

### Cache-Aside Pattern
```
1. Check cache (Redis)
   ├─ Hit: Return cached data
   └─ Miss: Fetch from DB → Store in cache → Return
2. On data change: Invalidate cache
3. Next read: Cache miss → Fresh data from DB → Re-cache
```

### Invalidation Strategy
```js
// After project update:
async function invalidateProjectCache(project) {
  const uids = [project.ownerUid, ...(project.team || [])];
  const keys = uids.map(uid => `projects:${uid}`);
  await cache.invalidate(...keys);
}
```
- Invalidates cache for owner AND all team members
- Next read by any member fetches fresh data

---

## Query Optimization Examples

### Chat History (Cursor-Based)
```js
const filter = { chatId };
if (cursor) filter._id = { $gt: new mongoose.Types.ObjectId(cursor) };
const messages = await Message.find(filter)
  .sort({ createdAt: 1 })
  .limit(50)
  .lean();
```
- **Index:** `{ chatId: 1, createdAt: 1 }`
- **Cursor:** Uses `_id` (ObjectId contains timestamp) for stable pagination
- **lean():** Skips Mongoose document creation (plain objects)

### Conversations (Aggregation)
```js
const conversations = await Message.aggregate([
  { $match: { $or: [{ senderId: uid }, { receiverId: uid }] } },
  { $sort: { createdAt: -1 } },
  { $group: { _id: '$chatId', doc: { $first: '$$ROOT' } } },
  { $replaceRoot: { newRoot: '$doc' } },
  { $sort: { createdAt: -1 } },
]);
```
- Single aggregation pipeline instead of multiple queries
- `$group` + `$first` gets latest message per chat efficiently

---

## Frontend Performance

### Bundle Size Optimization
```
Initial bundle:
├─ React + ReactDOM (~45kb gzipped)
├─ Firebase Auth (~30kb gzipped)
├─ React Router (~10kb gzipped)
├─ TanStack Query (~12kb gzipped)
└─ App shell + layout (~20kb gzipped)
Total initial: ~117kb gzipped

Lazy-loaded chunks:
├─ DashboardHome (~15kb)
├─ ProjectWorkspace (~25kb)
├─ MessagesPage (~20kb)
├─ NotesView + TipTap (~50kb)
├─ SettingsView (~15kb)
└─ Other views (~10-20kb each)
```

### TanStack Query Configuration
```ts
defaultOptions: {
  queries: {
    staleTime: 30 * 1000,      // 30s before refetch
    gcTime: 5 * 60 * 1000,     // 5min garbage collection
    refetchOnWindowFocus: true, // Refresh on tab return
    retry: 2,                   // Retry failed requests
    retryDelay: 1000,           // 1s between retries
  }
}
```

---

## Socket.IO Performance

### Event Design
- **Minimal payloads:** Only necessary data in events
- **Targeted rooms:** `socket.to(noteId).emit()` — only room members receive
- **No server-side processing for Yjs:** Binary updates forwarded as-is
- **Batch delivery catch-up:** 200 messages per batch, max 10 batches

### Connection Management
- **userSockets Map:** O(1) lookup for user → sockets
- **Stale cleanup:** 30s interval removes inactive users (2min threshold)
- **unref():** Cleanup interval doesn't prevent process exit

---

## Cross-References

- [03-performance-caching-strategy.md](./03-performance-caching-strategy.md) — Caching overview
- [33-redis-cache-layer.md](./33-redis-cache-layer.md) — Redis cache utility
- [54-frontend-state-management.md](./54-frontend-state-management.md) — TanStack Query
- [53-frontend-routing-layout.md](./53-frontend-routing-layout.md) — Lazy loading
- [52-database-schema-models.md](./52-database-schema-models.md) — Index strategy
- [50-socket-io-initialization.md](./50-socket-io-initialization.md) — Socket.IO setup
