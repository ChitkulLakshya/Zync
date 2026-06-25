/**
 * Sample routes demonstrating Redis cache (temporary task payload, 1h TTL).
 * Uses backend/utils/redisClient.js (same as the rest of the app).
 * Mounted at /api/cache/sample
 */
const express = require('express');
const { getRedisClient, isAvailable } = require('../utils/redisClient');

const router = express.Router();

const TASK_KEY_PREFIX = 'sample:task:';
const ONE_HOUR_SEC = 60 * 60;

function redisAvailable(res) {
  if (!process.env.REDIS_URL) {
    res.status(503).json({ message: 'Redis not configured (REDIS_URL missing)' });
    return false;
  }
  if (!isAvailable()) {
    res.status(503).json({ message: 'Redis unavailable (not connected)' });
    return false;
  }
  return true;
}

/** POST body: { taskId: string, data: object } — stored as JSON with 1-hour expiration */
router.post('/tasks', express.json(), async (req, res) => {
  if (!redisAvailable(res)) {
    return;
  }

  const { taskId, data } = req.body;
  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ message: 'taskId is required' });
  }
  if (data === undefined) {
    return res.status(400).json({ message: 'data is required' });
  }

  const key = `${TASK_KEY_PREFIX}${taskId}`;
  const payload = JSON.stringify(data);
  const redisClient = getRedisClient();

  try {
    await redisClient.setEx(key, ONE_HOUR_SEC, payload);
    return res.status(201).json({
      message: 'Task cached',
      key,
      ttlSeconds: ONE_HOUR_SEC,
    });
  } catch (err) {
    console.error('[Redis sample] SET failed:', err);
    return res.status(500).json({ message: 'Failed to save to Redis' });
  }
});

/** GET /tasks/:taskId — retrieve cached task JSON */
router.get('/tasks/:taskId', async (req, res) => {
  if (!redisAvailable(res)) {
    return;
  }

  const { taskId } = req.params;
  const key = `${TASK_KEY_PREFIX}${taskId}`;
  const redisClient = getRedisClient();

  try {
    const raw = await redisClient.get(key);
    if (raw === null) {
      return res.status(404).json({ message: 'Task not found or expired' });
    }
    return res.json({ taskId, data: JSON.parse(raw) });
  } catch (err) {
    console.error('[Redis sample] GET failed:', err);
    return res.status(500).json({ message: 'Failed to read from Redis' });
  }
});

module.exports = router;
