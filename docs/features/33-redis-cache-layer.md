# 33 — Redis Cache Layer

**NEW document** — Cache utility, JSON get/set with TTL, invalidation by key and pattern, fail-open design

---

## Feature Summary

The Redis cache layer provides a simple JSON get/set/invalidate API on top of the Redis client. All operations are fail-open — if Redis is down, cache misses return null and writes return false without crashing the app. Used for project lists, user profiles, GitHub repos, and architecture analysis caching.

---

## Architecture Diagram

```
┌─────────────────── BACKEND SERVICES ────────────────────┐
│                                                         │
│  backend/utils/cache.js (131 lines)                     │
│                                                         │
│  API:                                                   │
│  ├─ getJson(key) → object | null                        │
│  ├─ setJson(key, value, ttlSeconds) → true | false      │
│  ├─ invalidate(...keys) → void                          │
│  └─ delByPattern(pattern) → count                       │
│                                                         │
│  Fail-Open Design:                                      │
│  ├─ Redis down → getJson returns null (cache miss)      │
│  ├─ Redis down → setJson returns false (no crash)       │
│  ├─ Redis down → invalidate is no-op                    │
│  └─ Redis down → delByPattern returns 0                 │
│                                                         │
│  Consumers:                                             │
│  ├─ projectRoutes.js → projects:{uid} (300s TTL)        │
│  ├─ userRoutes.js → user:{uid} (300s TTL)               │
│  ├─ github.js → github:repos:{uid} (60s TTL)            │
│  ├─ usageService.js → quota counters (7d/24h TTL)       │
│  └─ architectureAnalysisCache → in-memory Map (6h TTL)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/utils/cache.js` (131 lines)

### getJson(key) (lines 78-89)
```js
async function getJson(key) {
  if (!isAvailable()) return null;
  try {
    const raw = await getRedisClient().get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Cache] getJson failed for "${key}":`, err.message);
    return null;
  }
}
```
- **Fail-open:** Redis down → `null` (treated as cache miss)
- **JSON parsing:** Automatically parses stringified JSON
- **Error handling:** Parse errors return null (no crash)

### setJson(key, value, ttlSeconds) (lines 91-101)
```js
async function setJson(key, value, ttlSeconds) {
  if (!isAvailable()) return false;
  try {
    await getRedisClient().set(key, JSON.stringify(value), { EX: ttlSeconds });
    return true;
  } catch (err) {
    console.warn(`[Cache] setJson failed for "${key}":`, err.message);
    return false;
  }
}
```
- **TTL:** `EX: ttlSeconds` — auto-expiry, no cron needed
- **Fail-open:** Redis down → `false` (caller proceeds without cache)

### invalidate(...keys) (lines 103-111)
```js
async function invalidate(...keys) {
  if (!isAvailable() || keys.length === 0) return;
  try {
    await getRedisClient().del(...keys);
  } catch (err) {
    console.warn(`[Cache] invalidate failed:`, err.message);
  }
}
```
- **Batch delete:** Accepts multiple keys in one call
- **Used by:** `invalidateProjectCache()` — deletes `projects:{uid}` for owner + team

### delByPattern(pattern) (lines 113-131)
```js
async function delByPattern(pattern) {
  if (!isAvailable()) return 0;
  try {
    const client = getRedisClient();
    let deleted = 0;
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      await client.del(key);
      deleted++;
    }
    return deleted;
  } catch (err) {
    console.warn(`[Cache] delByPattern failed:`, err.message);
    return 0;
  }
}
```
- **Uses SCAN (not KEYS):** Non-blocking, doesn't freeze Redis
- **Batch size:** 100 keys per SCAN iteration
- **Pattern examples:** `projects:*`, `user:abc*`, `github:repos:*`

---

## Cache Key Conventions

| Key Pattern | TTL | Consumer | Purpose |
|---|---|---|---|
| `projects:{uid}` | 300s | projectRoutes.js | User's project list |
| `user:{uid}` | 300s | userRoutes.js | User profile |
| `github:repos:{uid}` | 60s | github.js | GitHub repo list |
| `zync:kilo:user:{uid}:gens:wk:{week}` | 7d | usageService.js | Weekly quota counter |
| `zync:kilo:day:gens:{date}` | 24h | usageService.js | Daily global counter |
| `zync:kilo:user:{uid}:chat:last:{date}` | 24h | usageService.js | Chat throttle |

---

## Invalidation Strategy

### Write-Through Invalidation
When data changes, cache is invalidated immediately:
```
1. Update database (MongoDB)
2. invalidate(cacheKey)
3. Next read: cache miss → fetch from DB → repopulate cache
```

### Project Cache Invalidation
```js
async function invalidateProjectCache(project, additionalUids = []) {
  const uids = [...new Set([project.ownerUid, ...(project.team || []), ...additionalUids].filter(Boolean))];
  const keys = uids.map((uid) => `projects:${uid}`);
  await cache.invalidate(...keys);
}
```
- Invalidates cache for owner AND all team members
- Called after: create, update, delete project, task changes

---

## Fail-Open Philosophy

| Scenario | getJson | setJson | invalidate |
|---|---|---|---|
| Redis connected | Returns cached data | Stores in Redis | Deletes keys |
| Redis down | Returns `null` (miss) | Returns `false` | No-op |
| Redis error | Returns `null` (miss) | Returns `false` | No-op |

**Result:** Application works normally without Redis. Performance degrades (more DB queries) but functionality is preserved.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | Yes (prod) | Redis connection URL |

---

## Cross-References

- [03-performance-caching-strategy.md](./03-performance-caching-strategy.md) — Caching overview
- [14-project-crud.md](./14-project-crud.md) — Project cache invalidation
- [27-usage-service-quota.md](./27-usage-service-quota.md) — Redis quota counters
- [21-github-oauth-integration.md](./21-github-oauth-integration.md) — GitHub repo caching
