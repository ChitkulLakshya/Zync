// Imports the safe environment integer parser utility function to ensure configuration limits are cast to valid numbers with boundaries.
const { getSafeEnvInt } = require('../utils/safeEnv');

// Defines the maximum number of items the architecture cache can hold, preventing runaway memory usage on the Node.js server.
const ARCHITECTURE_CACHE_MAX_ENTRIES = getSafeEnvInt(
  // The name of the environment variable to look up.
  'ARCHITECTURE_CACHE_MAX_ENTRIES',
  // The absolute minimum allowed value to prevent the cache from becoming uselessly small.
  10,
  // The absolute maximum allowed value to protect the server from out-of-memory crashes.
  5000,
  // The default fallback value used if the environment variable is missing or invalid.
  100
);

// Defines the Time-To-Live (TTL) duration in milliseconds for cached architecture items, after which they expire.
const ARCHITECTURE_CACHE_TTL_MS = getSafeEnvInt(
  // The name of the environment variable to look up.
  'ARCHITECTURE_CACHE_TTL_MS',
  // The absolute minimum allowed TTL (1 second).
  1000,
  // The absolute maximum allowed TTL (24 hours).
  24 * 60 * 60 * 1000,
  // The default fallback TTL (5 minutes) used if the environment variable is missing or invalid.
  300000
);

// Defines how many missed real-time events the server will attempt to deliver in a single batch to a reconnecting client.
const DELIVERY_CATCHUP_BATCH_SIZE = getSafeEnvInt(
  // The name of the environment variable to look up.
  'DELIVERY_CATCHUP_BATCH_SIZE',
  // The absolute minimum batch size.
  1,
  // The absolute maximum batch size to prevent payload sizes from crashing the socket connection.
  100,
  // The default fallback batch size.
  25
);

// Defines the maximum number of catchup batches the server is allowed to send to a single reconnecting client to prevent endless loops.
const DELIVERY_CATCHUP_MAX_BATCHES = getSafeEnvInt(
  // The name of the environment variable to look up.
  'DELIVERY_CATCHUP_MAX_BATCHES',
  // The absolute minimum number of batches.
  1,
  // The absolute maximum number of batches.
  20,
  // The default fallback number of maximum batches.
  4
);

// Exports the validated configuration constants so other backend modules can use them safely.
module.exports = {
  // Exports the max cache entries constant.
  ARCHITECTURE_CACHE_MAX_ENTRIES,
  // Exports the cache TTL constant.
  ARCHITECTURE_CACHE_TTL_MS,
  // Exports the catchup batch size constant.
  DELIVERY_CATCHUP_BATCH_SIZE,
  // Exports the catchup max batches constant.
  DELIVERY_CATCHUP_MAX_BATCHES,
};
