// Imports the safe environment integer parser utility function to ensure configuration limits are cast to valid numbers with boundaries.
const { getSafeEnvInt } = require('../utils/safeEnv');

// Defines the maximum number of items the architecture cache can hold, preventing runaway memory usage on the Node.js server.
const ARCHITECTURE_CACHE_MAX_ENTRIES = getSafeEnvInt(
  // WHAT: Provides the environment variable key. WHY: Points to the specific config value that determines cache capacity.
  // The name of the environment variable to look up.
  'ARCHITECTURE_CACHE_MAX_ENTRIES',
  // WHAT: Sets the absolute minimum cache size. WHY: Prevents misconfiguration that could make the cache effectively useless.
  // The absolute minimum allowed value to prevent the cache from becoming uselessly small.
  10,
  // WHAT: Sets the absolute maximum cache size. WHY: Protects the server memory bounds so it doesn't crash from storing too many items.
  // The absolute maximum allowed value to protect the server from out-of-memory crashes.
  5000,
  // WHAT: Provides a default cache size fallback. WHY: Ensures a sensible configuration exists even if the environment variable is missing.
  // The default fallback value used if the environment variable is missing or invalid.
  100
);

// Defines the Time-To-Live (TTL) duration in milliseconds for cached architecture items, after which they expire.
const ARCHITECTURE_CACHE_TTL_MS = getSafeEnvInt(
  // WHAT: Provides the TTL environment variable key. WHY: Dictates how long cache entries should remain valid before being refreshed.
  // The name of the environment variable to look up.
  'ARCHITECTURE_CACHE_TTL_MS',
  // WHAT: Sets the minimum TTL limit. WHY: Prevents the cache from expiring too rapidly, which would defeat the purpose of caching.
  // The absolute minimum allowed TTL (1 second).
  1000,
  // WHAT: Sets the maximum TTL limit. WHY: Ensures cached data isn't kept for so long that it becomes stale and outdated.
  // The absolute maximum allowed TTL (24 hours).
  24 * 60 * 60 * 1000,
  // WHAT: Provides a fallback TTL. WHY: Defaults to a 5-minute cache lifespan if not explicitly configured otherwise.
  // The default fallback TTL (5 minutes) used if the environment variable is missing or invalid.
  300000
);

// Defines how many missed real-time events the server will attempt to deliver in a single batch to a reconnecting client.
const DELIVERY_CATCHUP_BATCH_SIZE = getSafeEnvInt(
  // WHAT: Provides the batch size environment variable key. WHY: Controls the chunk size of events sent to clients catching up on missed updates.
  // The name of the environment variable to look up.
  'DELIVERY_CATCHUP_BATCH_SIZE',
  // WHAT: Sets the minimum batch size. WHY: Ensures at least one event is sent per chunk, avoiding logic stalls.
  // The absolute minimum batch size.
  1,
  // WHAT: Sets the maximum batch size. WHY: Limits network payload size to prevent overwhelming the client or crashing the socket.
  // The absolute maximum batch size to prevent payload sizes from crashing the socket connection.
  100,
  // WHAT: Provides a fallback batch size. WHY: Sets a default of 25 events per batch for balanced network performance.
  // The default fallback batch size.
  25
);

// Defines the maximum number of catchup batches the server is allowed to send to a single reconnecting client to prevent endless loops.
const DELIVERY_CATCHUP_MAX_BATCHES = getSafeEnvInt(
  // WHAT: Provides the max batches environment variable key. WHY: Limits the total number of catchup requests to prevent resource exhaustion from a single client.
  // The name of the environment variable to look up.
  'DELIVERY_CATCHUP_MAX_BATCHES',
  // WHAT: Sets the minimum number of batches. WHY: Guarantees a client can receive at least some missed events.
  // The absolute minimum number of batches.
  1,
  // WHAT: Sets the maximum number of batches. WHY: Prevents infinite catchup loops that could consume excessive server bandwidth and memory.
  // The absolute maximum number of batches.
  20,
  // WHAT: Provides a fallback max batches limit. WHY: Defaults to 4 maximum batches to balance between client data freshness and server load.
  // The default fallback number of maximum batches.
  4
);

// Exports the validated configuration constants so other backend modules can use them safely.
module.exports = {
  // WHAT: Exports ARCHITECTURE_CACHE_MAX_ENTRIES. WHY: Makes the cache capacity constant available to caching modules.
  // Exports the max cache entries constant.
  ARCHITECTURE_CACHE_MAX_ENTRIES,
  // WHAT: Exports ARCHITECTURE_CACHE_TTL_MS. WHY: Makes the cache duration constant available to caching modules.
  // Exports the cache TTL constant.
  ARCHITECTURE_CACHE_TTL_MS,
  // WHAT: Exports DELIVERY_CATCHUP_BATCH_SIZE. WHY: Makes the catchup batch size available to real-time event delivery modules.
  // Exports the catchup batch size constant.
  DELIVERY_CATCHUP_BATCH_SIZE,
  // WHAT: Exports DELIVERY_CATCHUP_MAX_BATCHES. WHY: Makes the max catchup batches limit available to real-time event delivery modules.
  // Exports the catchup max batches constant.
  DELIVERY_CATCHUP_MAX_BATCHES,
};
