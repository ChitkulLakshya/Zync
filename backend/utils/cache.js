const { getRedisClient, isAvailable } = require('./redisClient'); // WHAT: Import Redis client functions. WHY: Allows interaction with the Redis database for caching.

async function getJson(key) { // WHAT: Function to retrieve and parse JSON from Redis. WHY: Simplifies reading cached objects.
  if (!isAvailable()) return null; // WHAT: Check Redis availability. WHY: Fails gracefully if Redis is down.

  try { // WHAT: Try-catch block. WHY: Prevent application crash on Redis errors.
    const raw = await getRedisClient().get(key); // WHAT: Fetch string value by key. WHY: Reads data from cache.
    if (!raw) return null; // WHAT: Check for cache miss. WHY: Returns null instead of parsing undefined.
    return JSON.parse(raw); // WHAT: Parse JSON string. WHY: Restores original JavaScript object.
  } catch (err) { // WHAT: Catch error. WHY: Handle parsing or connection issues.
    console.warn(`[Cache] getJson failed for "${key}":`, err.message); // WHAT: Log warning. WHY: Debugging without crashing.
    return null; // WHAT: Return null. WHY: Acts as a cache miss fallback.
  }
}

async function setJson(key, value, ttlSeconds) { // WHAT: Function to stringify and store JSON in Redis. WHY: Simplifies caching objects with a time-to-live.
  if (!isAvailable()) return false; // WHAT: Check Redis. WHY: Avoids errors if offline.

  try { // WHAT: Try-catch block. WHY: Safety for network calls.
    await getRedisClient().set(key, JSON.stringify(value), { EX: ttlSeconds }); // WHAT: Stringify and save with expiration. WHY: Stores data and ensures it auto-deletes later.
    return true; // WHAT: Return success. WHY: Caller knows it worked.
  } catch (err) { // WHAT: Catch error. WHY: Prevent crash.
    console.warn(`[Cache] setJson failed for "${key}":`, err.message); // WHAT: Log warning. WHY: Debugging.
    return false; // WHAT: Return failure. WHY: Caller can handle appropriately.
  }
}

async function invalidate(...keys) { // WHAT: Function to delete one or more keys. WHY: Used to clear stale cache when data changes.
  if (!isAvailable() || keys.length === 0) return; // WHAT: Check args and Redis. WHY: Avoids unnecessary operations.

  try { // WHAT: Try-catch block. WHY: Error handling.
    await getRedisClient().del(...keys); // WHAT: Delete keys from Redis. WHY: Removes stale data.
  } catch (err) { // WHAT: Catch error. WHY: Safety.
    console.warn(`[Cache] invalidate failed:`, err.message); // WHAT: Log warning. WHY: Debugging.
  }
}

async function delByPattern(pattern) { // WHAT: Function to delete keys matching a pattern. WHY: Useful for clearing namespaces (e.g., all "user:*" keys).
  if (!isAvailable()) return 0; // WHAT: Check Redis. WHY: Fallback.

  try { // WHAT: Try-catch. WHY: Safety.
    const client = getRedisClient(); // WHAT: Get client instance. WHY: Needed for scanIterator.
    let deleted = 0; // WHAT: Counter for deleted keys. WHY: Returns stat to caller.
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) { // WHAT: Iterate keys matching pattern using SCAN. WHY: Prevents blocking Redis with a massive KEYS command.
      await client.del(key); // WHAT: Delete each key. WHY: Clears the matched cache.
      deleted++; // WHAT: Increment counter. WHY: Tracking.
    }
    return deleted; // WHAT: Return count. WHY: Reporting.
  } catch (err) { // WHAT: Catch error. WHY: Safety.
    console.warn(`[Cache] delByPattern failed for "${pattern}":`, err.message); // WHAT: Log warning. WHY: Debugging.
    return 0; // WHAT: Return 0. WHY: Fallback result.
  }
}

module.exports = { getJson, setJson, invalidate, delByPattern }; // WHAT: Export all utility functions. WHY: Makes them available across the application.
