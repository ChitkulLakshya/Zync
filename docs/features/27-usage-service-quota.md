# 27 — Usage Service & Quota Management

**NEW document** — Redis-based quota enforcement, weekly generation cap, daily global stopcock, chat throttle, reserve-and-refund pattern

---

## Feature Summary

The usage service enforces fair-use quotas for the shared Kilo Code Gateway API key across all Zync users. It uses Redis atomic Lua scripts for race-free counter increments. Three gates: (1) per-user weekly architecture generation hard cap (default 4), (2) global daily generation soft stopcock (default 150), (3) per-user chat min-gap throttle (default 2s). Failed gateway calls are refunded so users never burn quota on errors.

---

## Architecture Diagram

```
┌─────────────────── BACKEND ─────────────────────────────┐
│                                                         │
│  backend/services/usageService.js (200 lines)           │
│                                                         │
│  Three Quota Gates:                                     │
│                                                         │
│  1. Per-User Weekly Generation Cap (HARD)               │
│     ├─ Default: 4 generations per ISO week              │
│     ├─ Key: zync:kilo:user:<uid>:gens:wk:<isoWeek>      │
│     ├─ TTL: 7 days (auto-resets, no cron)               │
│     └─ Atomic: Lua INC_IF_UNDER_SCRIPT                  │
│                                                         │
│  2. Global Daily Generation Stopcock (SOFT)             │
│     ├─ Default: 150 generations per day (all users)     │
│     ├─ Key: zync:kilo:day:gens:<YYYY-MM-DD>             │
│     ├─ TTL: 24 hours                                    │
│     └─ Purpose: Protect shared API key from all-at-once │
│                                                         │
│  3. Per-User Chat Min-Gap (SOFT THROTTLE)               │
│     ├─ Default: 2000ms between chat AI calls            │
│     ├─ Key: zync:kilo:user:<uid>:chat:last:<date>       │
│     ├─ TTL: 24 hours                                    │
│     └─ Returns: ms to wait (0 = clear)                  │
│                                                         │
│  Reserve-and-Refund Pattern:                            │
│  ├─ checkAndReserveGen(uid) → { ok, used, limit, key }  │
│  ├─ On success: key stored for later refund             │
│  ├─ On gateway failure: refundGen(uid, key) → DECR      │
│  └─ Key includes ISO week → refund hits SAME week       │
│                                                         │
│  Fail-Open Design:                                      │
│  ├─ Redis down → ok=true (gate skipped)                 │
│  └─ Never hard-fails the app due to Redis outage        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Backend Trace

### File: `backend/services/usageService.js` (200 lines)

### Configuration (lines 20-25)
```js
const DEFAULT_WEEKLY_GEN_LIMIT = 4;
const DEFAULT_DAILY_GEN_CAP = 150;
const DEFAULT_CHAT_MIN_GAP_MS = 2000;
const WEEK_TTL = 7 * 24 * 60 * 60; // 604800 seconds
const DAY_TTL = 24 * 60 * 60;      // 86400 seconds
```

### ISO Week Key Calculation (lines 27-36)
```js
const isoWeekKey = (date = new Date()) => {
  // ISO 8601 week number calculation
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
```
- Example: `2024-W32`
- Used in Redis key to auto-reset weekly quota (TTL handles expiry)

### Redis Key Patterns (lines 120-122)
| Purpose | Key Pattern | TTL |
|---|---|---|
| User weekly gens | `zync:kilo:user:<uid>:gens:wk:<isoWeek>` | 7 days |
| Global daily gens | `zync:kilo:day:gens:<YYYY-MM-DD>` | 24 hours |
| User chat last | `zync:kilo:user:<uid>:chat:last:<YYYY-MM-DD>` | 24 hours |

### Lua Scripts

#### INC_IF_UNDER_SCRIPT (lines 44-50)
```lua
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if used >= tonumber(ARGV[2]) then return -1 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
return used + 1
```
- **Atomic:** GET + check + INCR + EXPIRE in one Redis command
- **Returns:** Post-increment count (success) or -1 (at limit)
- **Race-free:** Multiple concurrent requests can't exceed the limit

#### INCR_SCRIPT (lines 71-75)
```lua
local c = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
return c
```
- Plain monotonic counter (for global daily stopcock)

#### decrScript (lines 100-108)
```lua
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c > 0 then
  c = c - 1
  redis.call('SET', KEYS[1], c)
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return c
```
- Decrements but never below 0
- Used for refunds

### checkAndReserveGen (lines 131-140)
```js
async function checkAndReserveGen(uid, limit = DEFAULT_WEEKLY_GEN_LIMIT) {
  if (!uid) return { ok: true, used: 0, limit, reason: 'no-uid', key: null };
  const wk = isoWeekKey();
  const used = await reserveIfUnder(genUserKey(uid, wk), WEEK_TTL, limit);
  if (used === null) return { ok: true, used: 0, limit, reason: 'redis-down', key: null };
  if (used === -1) return { ok: false, used: limit, limit, reason: 'weekly-limit', key: null };
  await incrCounter(genDayKey(dayKey()), DAY_TTL);
  return { ok: true, used, limit, reason: 'ok', key: genUserKey(uid, wk) };
}
```
- **Returns:** `{ ok, used, limit, reason, key }`
- `key` is the exact Redis key used — stored for refund
- Only successful user reservations increment the global daily counter

### refundGen (lines 147-150)
```js
async function refundGen(uid, key) {
  if (!uid) return;
  await decrCounter(key || genUserKey(uid), WEEK_TTL);
}
```
- DECRs the SAME key that was reserved
- Handles week boundary: if ISO week rolled over between reserve and refund, the stored key still points to the old week
- Prevents quota leakage across week boundaries

### chatThrottle (lines 156-170)
```js
async function chatThrottle(uid, minGapMs = DEFAULT_CHAT_MIN_GAP_MS) {
  if (!uid) return 0;
  const client = await redis();
  if (!client) return 0;
  const lastKey = `zync:kilo:user:${uid}:chat:last:${dayKey()}`;
  const last = await client.get(lastKey);
  const now = Date.now();
  const wait = last ? Math.max(0, minGapMs - (now - parseInt(last, 10))) : 0;
  await client.set(lastKey, String(now), { EX: DAY_TTL });
  return wait;
}
```
- Returns ms to wait (0 = clear to proceed)
- Not a quota — a pace limiter
- Fail-open: returns 0 if Redis down

### getUserQuota (lines 175-182)
```js
async function getUserQuota(uid, limit = DEFAULT_WEEKLY_GEN_LIMIT) {
  const used = await getCounter(genUserKey(uid));
  return {
    gensUsed: used === null ? 0 : used,
    gensLimit: limit,
    resetOn: nextWeekSundayUtc().toISOString(),
  };
}
```
- Used by frontend quota chip: "2/4 used this week"
- `resetOn`: Next Sunday UTC midnight (when weekly quota resets)

---

## Fail-Open Strategy

| Scenario | Behavior |
|---|---|
| Redis down | `reserveIfUnder` returns `null` → `ok: true` (gate skipped) |
| Redis EVAL fails | Caught, returns `null` → `ok: true` |
| Redis GET fails | `getCounter` returns `0` → shows 0 used |
| Redis SET fails (throttle) | `chatThrottle` returns `0` → no wait |

**Philosophy:** Redis outage should never block users from using the app. Quota enforcement is a nice-to-have, not a critical path.

---

## Reserve-and-Refund Flow

```
1. User triggers architecture analysis
   → checkAndReserveGen(uid)
   → Redis: INCR weekly counter (atomic, under limit check)
   → Returns: { ok: true, used: 2, limit: 4, key: "zync:kilo:user:abc:gens:wk:2024-W32" }

2. Gateway call succeeds
   → Architecture stored in cache
   → Counter stays at 2 (consumed)

3. OR: Gateway call fails
   → refundGen(uid, key)
   → Redis: DECR "zync:kilo:user:abc:gens:wk:2024-W32"
   → Counter back to 1 (refunded)
   → User can retry without losing quota
```

---

## Error Paths

| Scenario | Handling |
|---|---|
| Redis down | Fail-open: `ok: true`, gate skipped |
| Redis EVAL error | Logged, fail-open: `ok: true` |
| No uid | `ok: true`, no quota enforced |
| Weekly limit reached | `ok: false, reason: 'weekly-limit'` → caller returns 429 |
| DECR fails on refund | Logged, best-effort (user might lose 1 quota unit) |

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | Yes (prod) | — | Redis connection URL |
| `WEEKLY_GEN_LIMIT` | No | 4 | Per-user weekly architecture generations |
| `DAILY_GEN_CAP` | No | 150 | Global daily generation cap |
| `CHAT_MIN_GAP_MS` | No | 2000 | Min ms between chat AI calls |

---

## Cross-References

- [25-ai-architecture-analysis.md](./25-ai-architecture-analysis.md) — Calls checkAndReserveGen + refundGen
- [26-kilo-code-gateway.md](./26-kilo-code-gateway.md) — Gateway service that uses quota
- [03-performance-caching-strategy.md](./03-performance-caching-strategy.md) — Redis overview
- [14-project-crud.md](./14-project-crud.md) — Project route integrating quota
