const { getRedisClient, isAvailable } = require('./redisClient');

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

async function invalidate(...keys) {
  if (!isAvailable() || keys.length === 0) return;

  try {
    await getRedisClient().del(...keys);
  } catch (err) {
    console.warn(`[Cache] invalidate failed:`, err.message);
  }
}

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
    console.warn(`[Cache] delByPattern failed for "${pattern}":`, err.message);
    return 0;
  }
}

module.exports = { getJson, setJson, invalidate, delByPattern };
