# 03 — Performance & Caching Strategy

**Refactored from:** `docs/architecture/performance_and_caching_strategy.md`

---

## Feature Summary

Zync uses a multi-tier caching and performance strategy: Redis for server-side caching and Pub/Sub, TanStack Query with localStorage persistence for client-side REST caching, Dexie/IndexedDB for offline-first CRDT state, and active load shedding to stay within Render's 512MB RAM limit.

---

## Architecture Diagram

```
┌──────────────── CLIENT CACHE TIERS ─────────────────┐
│                                                      │
│  Tier 1: TanStack Query (in-memory)                  │
│  ├─ Stale-while-revalidate for REST endpoints        │
│  ├─ Default staleTime: 60s                           │
│  └─ Query keys: ['projects'], ['notes'], ['tasks']   │
│                                                      │
│  Tier 2: localStorage Persister                      │
│  ├─ @tanstack/query-sync-storage-persister           │
│  ├─ Persists query cache to localStorage             │
│  └─ Restores on page reload (instant UI)             │
│                                                      │
│  Tier 3: IndexedDB (Dexie)                           │
│  ├─ Yjs document state (y-indexeddb)                 │
│  ├─ Offline note editing                             │
│  └─ Syncs on reconnect                               │
└──────────────────────────────────────────────────────┘

┌──────────────── SERVER CACHE TIERS ─────────────────┐
│                                                      │
│  Tier 1: Redis Cache                                 │
│  ├─ Architecture quota tokens                        │
│  ├─ Rate limit counters                              │
│  ├─ Socket.IO Pub/Sub adapter                        │
│  ├─ Design inspiration cache (TTL: 1h)               │
│  └─ GitHub repo metadata cache                       │
│                                                      │
│  Tier 2: In-process Memory                           │
│  ├─ Puppeteer singleton (reuse browser)              │
│  ├─ Prisma client connection pool                    │
│  └─ Mongoose connection pool                         │
│                                                      │
│  Load Shedding (active memory management)            │
│  ├─ Monitors heapUsed every request                  │
│  ├─ 503 on heavy paths if heap > 400MB               │
│  └─ Allowlist for critical paths                     │
└──────────────────────────────────────────────────────┘
```

---

## Backend Trace

### Redis Client
**File:** `backend/utils/redisClient.js`
- Creates Redis client with `REDIS_URL` env var
- Fails open gracefully if Redis is offline
- Used by:
  - `backend/utils/cache.js` — get/set/delete with TTL
  - `backend/services/scraperService.js` — inspiration result caching
  - Socket.IO adapter for multi-instance scaling

### Cache Utility
**File:** `backend/utils/cache.js`
- `cacheGet(key)`, `cacheSet(key, value, ttl)`, `cacheDel(key)`
- JSON serialization/deserialization
- TTL in seconds (default 3600 = 1 hour)
- Returns `null` on cache miss or Redis error

### Load Shedding Middleware
**File:** `backend/middleware/loadShedding.js:103-126`
- Checks `process.memoryUsage().heapUsed` on every heavy request
- `HEAP_LIMIT_MB` default 400 (configurable via `LOAD_SHED_HEAP_LIMIT_MB`)
- Heavy paths: `/api/github-app/webhook`, `/api/webhooks/github`, `/api/generate-project`, `/api/design`, `/api/inspiration`
- Allowlist: `/api/auth`, `/api/sessions`, `/api/chat` (always served)

### Health Check with Memory Monitoring
**File:** `backend/index.js:313-340`
- `/health` endpoint reports heapUsed, heapTotal, rss
- Status: `healthy` (<80%), `degraded` (>80%), `critical` (>95%)
- Memory limit: 512MB (Render free tier)

### Database Connection Pooling
- **Prisma:** Default connection pool (Prisma manages internally)
- **Mongoose:** `mongoose.connect()` with default pool size of 5
- Both connect to same MongoDB Atlas instance via `MONGO_URI`

---

## Frontend Trace

### TanStack Query Setup
**File:** `src/lib/query-client.ts`
- Creates `QueryClient` with default config
- `staleTime: 60_000` (1 minute default)
- `gcTime: 5 * 60 * 1000` (5 minutes garbage collection)
- `retry: 1` (one retry on failure)
- `refetchOnWindowFocus: false`

### Query Persister (localStorage)
**File:** `src/lib/query-persister.ts`
- Uses `createSyncStoragePersister` with `localStorage`
- Persists TanStack Query cache to localStorage
- On page reload, cache is restored → instant UI render
- `persister` key: `zync-query-cache`

### Retry Helper
**File:** `src/lib/retryHelper.ts`
- Exponential backoff for failed API calls
- Max 3 retries with jitter
- Used for flaky external API calls (GitHub, Google)

### Dexie (IndexedDB)
**File:** `src/lib/db.ts`
- Dexie database for offline-first storage
- Stores Yjs document states for collaborative notes
- Enables offline note editing with sync on reconnect

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | No | Redis connection URL (fails open if missing) |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `LOAD_SHED_HEAP_LIMIT_MB` | No | Heap threshold for shedding (default 400) |

---

## Cross-References

- [06-middleware-stack.md](./06-middleware-stack.md) — Middleware chain including load shedding
- [31-realtime-notes-editor.md](./31-realtime-notes-editor.md) — Yjs + IndexedDB offline
- [45-design-inspiration-service.md](./45-design-inspiration-service.md) — Redis caching for scraper
