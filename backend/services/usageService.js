/**
 * @fileoverview usageService.js
 * Quota enforcement for a single shared Kilo gateway key across many users.
 *
 * Three gates, all Redis counters (TTL auto-resets the window — no cron):
 *  1. Per-user weekly architecture generation hard cap (default 4).
 *     Key: zync:kilo:user:<uid>:gens:wk:<isoWeek>, TTL 7d.
 *  2. Global daily generation soft stopcock (default 150) — protects the key
 *     from all-users-at-once. Does not block; downstream callers may throttle.
 *     Key: zync:kilo:day:gens:<YYYY-MM-DD>, TTL 24h.
 *  3. Per-user chat min-gap (soft throttle, default 2s). Not a quota — a pace.
 *
 * Reserve-at-gateway, refund-on-failure: a failed kilo call never burns quota,
 * so retry-after-transient-error is free. Quota keys by uid — immutable to the
 * client, so clearing localStorage / re-login-on-same-account cannot reset it.
 */

const { getRedisClient, isAvailable } = require('../utils/redisClient');

const DEFAULT_WEEKLY_GEN_LIMIT = 4;
const DEFAULT_DAILY_GEN_CAP = 150;
const DEFAULT_CHAT_MIN_GAP_MS = 2000;

const WEEK_TTL = 7 * 24 * 60 * 60; // seconds
const DAY_TTL = 24 * 60 * 60;

const isoWeekKey = (date = new Date()) => {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};

const dayKey = (date = new Date()) => date.toISOString().slice(0, 10);

async function redis() {
  return isAvailable() ? getRedisClient() : null;
}

const INC_IF_UNDER_SCRIPT = `
local used = tonumber(redis.call('GET', KEYS[1]) or '0')
if used >= tonumber(ARGV[2]) then return -1 end
redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
return used + 1
`;

/**
 * Atomic reserve: INCR only when the counter is below `limit`. Returns the
 * post-increment count (<= limit) on success, -1 when at/over limit, null when
 * Redis is down (fail-open — gate skipped, never hard-fails the app).
 */
async function reserveIfUnder(key, ttlSeconds, limit) {
  const client = await redis();
  if (!client) {return null;}
  try {
    return await client.eval(INC_IF_UNDER_SCRIPT, {
      keys: [key],
      arguments: [String(ttlSeconds), String(limit)],
    });
  } catch (err) {
    console.error('[usageService] Redis reserve failed:', err.message);
    return null;
  }
}

const INCR_SCRIPT = `
local c = redis.call('INCR', KEYS[1])
redis.call('EXPIRE', KEYS[1], ARGV[1])
return c
`;

/** Plain monotonic counter (used for the global daily stopcock). Fail-open → null. */
async function incrCounter(key, ttlSeconds) {
  const client = await redis();
  if (!client) {return null;}
  try {
    return await client.eval(INCR_SCRIPT, { keys: [key], arguments: [String(ttlSeconds)] });
  } catch (err) {
    console.error('[usageService] Redis INC failed:', err.message);
    return null;
  }
}

async function getCounter(key) {
  const client = await redis();
  if (!client) {return null;}
  try {
    const v = await client.get(key);
    return v ? parseInt(v, 10) : 0;
  } catch (err) {
    return 0;
  }
}

const decrScript = `
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c > 0 then
  c = c - 1
  redis.call('SET', KEYS[1], c)
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return c
`;

async function decrCounter(key, ttlSeconds) {
  const client = await redis();
  if (!client) {return null;}
  try {
    return await client.eval(decrScript, { keys: [key], arguments: [String(ttlSeconds)] });
  } catch (err) {
    return null;
  }
}

const genUserKey = (uid, wk) => `zync:kilo:user:${uid}:gens:wk:${wk || isoWeekKey()}`;
const genDayKey = (d) => `zync:kilo:day:gens:${d || dayKey()}`;
const chatUserKey = (uid) => `zync:kilo:user:${uid}:chat:${dayKey()}`;

/**
 * Reserve an architecture generation. Returns { ok, used, limit, reason }.
 * ok=false → caller should 429 (hard cap). When Redis is down, ok=true (fail-open).
 * The reservation returns the exact weekly key it wrote, so a later refund can
 * DECR the SAME key even if the window rolled over between reserve and refund
 * (prevents a spent unit leaking across the ISO-week boundary).
 */
async function checkAndReserveGen(uid, limit = DEFAULT_WEEKLY_GEN_LIMIT) {
  if (!uid) {return { ok: true, used: 0, limit, reason: 'no-uid', key: null };}
  const wk = isoWeekKey();
  const used = await reserveIfUnder(genUserKey(uid, wk), WEEK_TTL, limit);
  if (used === null) {return { ok: true, used: 0, limit, reason: 'redis-down', key: null };}
  if (used === -1) {return { ok: false, used: limit, limit, reason: 'weekly-limit', key: null };}
  // Only successful reservations hit the global daily stopcock.
  await incrCounter(genDayKey(dayKey()), DAY_TTL);
  return { ok: true, used, limit, reason: 'ok', key: genUserKey(uid, wk) };
}

/**
 * Refund a generation on gateway failure. Best-effort; DECRs the SAME weekly key
 * that was reserved, so a week-boundary rollover between reserve and refund
 * cannot leak the spent unit.
 */
async function refundGen(uid, key) {
  if (!uid) {return;}
  await decrCounter(key || genUserKey(uid), WEEK_TTL);
}

/**
 * Soft chat throttle: min gap per user. Returns ms to wait, or 0 when clear.
 * Does NOT block (fail-open when Redis down).
 */
async function chatThrottle(uid, minGapMs = DEFAULT_CHAT_MIN_GAP_MS) {
  if (!uid) {return 0;}
  const client = await redis();
  if (!client) {return 0;}
  try {
    const lastKey = `zync:kilo:user:${uid}:chat:last:${dayKey()}`;
    const last = await client.get(lastKey);
    const now = Date.now();
    const wait = last ? Math.max(0, minGapMs - (now - parseInt(last, 10))) : 0;
    await client.set(lastKey, String(now), { EX: DAY_TTL });
    return wait;
  } catch (err) {
    return 0;
  }
}

/**
 * Current per-user quota snapshot — wires to the UI "2/4 used this week" chip.
 */
async function getUserQuota(uid, limit = DEFAULT_WEEKLY_GEN_LIMIT) {
  const used = await getCounter(genUserKey(uid));
  return {
    gensUsed: used === null ? 0 : used,
    gensLimit: limit,
    resetOn: nextWeekSundayUtc().toISOString(),
  };
}

function nextWeekSundayUtc() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const daysUntilNextSun = day === 0 ? 7 : 7 - day;
  d.setUTCDate(d.getUTCDate() + daysUntilNextSun);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

module.exports = {
  checkAndReserveGen,
  refundGen,
  chatThrottle,
  getUserQuota,
  isoWeekKey,
};