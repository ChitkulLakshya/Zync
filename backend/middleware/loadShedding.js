const { getSafeEnvInt } = require('../utils/safeEnv');

const HEAP_LIMIT_MB = getSafeEnvInt('LOAD_SHED_HEAP_LIMIT_MB', 128, 4096, 400);
const RETRY_AFTER_SECONDS = getSafeEnvInt('LOAD_SHED_RETRY_AFTER_SECONDS', 1, 300, 15);

const ALLOWLIST_PATH_PREFIXES = ['/api/auth', '/api/sessions', '/api/chat'];
const DEFAULT_HEAVY_PATH_PREFIXES = [
  '/api/github-app/webhook',
  '/api/webhooks/github',
  '/api/generate-project',
  '/api/design',
  '/api/inspiration',
];

const parsePathListEnv = (rawValue) =>
  String(rawValue || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const HEAVY_PATH_PREFIXES = (() => {
  const custom = parsePathListEnv(process.env.LOAD_SHED_HEAVY_PATHS);
  return custom.length > 0 ? custom : DEFAULT_HEAVY_PATH_PREFIXES;
})();

const isPathMatchedByPrefixes = (path, prefixes) => prefixes.some((prefix) => path.startsWith(prefix));

const loadSheddingMiddleware = (req, res, next) => {
  const requestPath = String((req.originalUrl || req.path || '').split('?')[0]);

  if (isPathMatchedByPrefixes(requestPath, ALLOWLIST_PATH_PREFIXES)) {
    return next();
  }

  if (!isPathMatchedByPrefixes(requestPath, HEAVY_PATH_PREFIXES)) {
    return next();
  }

  const heapUsedMb = process.memoryUsage().heapUsed / (1024 * 1024);
  if (heapUsedMb < HEAP_LIMIT_MB) {
    return next();
  }

  res.set('Retry-After', String(RETRY_AFTER_SECONDS));
  return res.status(503).json({
    message: 'Service under memory pressure, please retry shortly.',
    reason: 'load_shedding',
    heapUsedMb: Number(heapUsedMb.toFixed(2)),
    heapLimitMb: HEAP_LIMIT_MB,
  });
};

module.exports = {
  loadSheddingMiddleware,
  ALLOWLIST_PATH_PREFIXES,
  HEAVY_PATH_PREFIXES,
  HEAP_LIMIT_MB,
  RETRY_AFTER_SECONDS,
};
