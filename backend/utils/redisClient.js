const { createClient } = require('redis'); // WHAT: Import createClient from redis package. WHY: To establish a connection to Redis server.

let client = null; // WHAT: Declare singleton client variable. WHY: To hold the single Redis connection instance.
let ready = false; // WHAT: Declare ready flag. WHY: To track whether the connection is active and ready for commands.

function getRedisClient() { // WHAT: Define function to get or create client. WHY: Ensures singleton pattern.
  if (!client) { // WHAT: Check if client exists. WHY: Only initialize if it hasn't been already.
    const rawRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379'; // WHAT: Read URL from env or fallback. WHY: Configurable connection string.
    const tlsEnv = String(process.env.REDIS_TLS || '').trim().toLowerCase(); // WHAT: Read and normalize TLS env var. WHY: Determine if TLS is forced.
    const rejectUnauthorizedEnv = String(process.env.REDIS_TLS_REJECT_UNAUTHORIZED || '').trim().toLowerCase(); // WHAT: Read TLS verification env var. WHY: For self-signed cert handling.
    const useTls = tlsEnv // WHAT: Determine if TLS should be used. WHY: Secure connection handling.
      ? ['1', 'true', 'yes', 'on'].includes(tlsEnv) // WHAT: Check explicit env value. WHY: Handle various truthy strings.
      : rawRedisUrl.startsWith('rediss://'); // WHAT: Fallback to checking URL scheme. WHY: Automatic detection from URL.
    const rejectUnauthorized = rejectUnauthorizedEnv // WHAT: Determine if unauthorized certs are rejected. WHY: Flexibility in dev vs prod environments.
      ? ['1', 'true', 'yes', 'on'].includes(rejectUnauthorizedEnv) // WHAT: Check env var. WHY: Explicit configuration override.
      : false; // WHAT: Default to false if not provided. WHY: Prevents strict failures by default.
    const redisUrl = useTls // WHAT: Normalize the final URL based on TLS intent. WHY: Ensure protocol matches TLS requirements.
      ? rawRedisUrl.replace(/^redis:\/\//i, 'rediss://') // WHAT: Upgrade to rediss scheme. WHY: Enforce secure protocol.
      : rawRedisUrl.replace(/^rediss:\/\//i, 'redis://'); // WHAT: Downgrade to standard redis scheme. WHY: Enforce plaintext protocol.

    client = createClient({ // WHAT: Initialize redis client. WHY: Create connection instance.
      url: redisUrl, // WHAT: Pass normalized URL. WHY: Connection target.
      socket: { // WHAT: Configure socket options. WHY: Tune network behavior.
        connectTimeout: 5000, // WHAT: Set connection timeout. WHY: Fail fast if server is unreachable.
        socketTimeout: 0, // WHAT: Set socket timeout to 0. WHY: Disable timeout to prevent premature disconnects.
        keepAlive: true, // WHAT: Enable TCP keep-alive. WHY: Detect dead connections.
        keepAliveInitialDelay: 10000, // WHAT: Set delay before keep-alive probes. WHY: Avoid unnecessary traffic early on.
        tls: useTls, // WHAT: Enable TLS if configured. WHY: Secure data in transit.
        rejectUnauthorized: useTls ? rejectUnauthorized : undefined, // WHAT: Pass TLS rejection setting if using TLS. WHY: Handle cert validation.
        reconnectStrategy: (retries) => { // WHAT: Define custom reconnect logic. WHY: Graceful handling of network blips.
          if (retries > 20) { // WHAT: Check retry count. WHY: Prevent infinite connection loops.
            console.error('[Redis] Max reconnection attempts reached'); // WHAT: Log error. WHY: Alert administrators.
            return new Error('Max reconnection attempts'); // WHAT: Return error to abort connection. WHY: Fail gracefully.
          }

          const delay = Math.min(retries * 100, 3000); // WHAT: Calculate backoff delay. WHY: Prevent overwhelming server during recovery.
          console.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${retries})`); // WHAT: Log reconnection attempt. WHY: Visibility into client state.
          return delay; // WHAT: Return delay time in ms. WHY: Tell client how long to wait.
        },
      },
    });

    client.on('ready', () => { // WHAT: Listen for ready event. WHY: Track successful connection state.
      ready = true; // WHAT: Update flag. WHY: Mark client as usable.
      console.log('[Redis] Client ready'); // WHAT: Log success. WHY: Info logging.
    });

    client.on('error', (err) => { // WHAT: Listen for error events. WHY: Handle connection failures.
      ready = false; // WHAT: Mark not ready. WHY: Prevent use of broken connection.
      console.error('[Redis] Client error:', err.message); // WHAT: Log error message. WHY: Diagnostic info.
    });

    client.on('end', () => { // WHAT: Listen for end event. WHY: Detect closed connections.
      ready = false; // WHAT: Update flag. WHY: Mark client as unusable.
      console.warn('[Redis] Connection closed'); // WHAT: Log closure. WHY: Visibility.
    });
  }

  return client; // WHAT: Return the singleton instance. WHY: Provide access to caller.
}

function isAvailable() { // WHAT: Define helper to check availability. WHY: Allow safe checks before using cache.
  return ready && client !== null && client.isReady; // WHAT: Combine checks. WHY: Ensure client exists and is fully ready.
}

async function connectRedis() { // WHAT: Define async connection starter. WHY: App startup hook.
  try { // WHAT: Use try block. WHY: Catch connection errors gracefully.
    const c = getRedisClient(); // WHAT: Get or init client. WHY: Prepare instance.
    await c.connect(); // WHAT: Await connection. WHY: Ensure it connects before proceeding.
    console.log('[Redis] Connected successfully'); // WHAT: Log success. WHY: Info logging.
  } catch (err) { // WHAT: Catch block. WHY: Handle failures without crashing the app.
    console.warn(`[Redis] Connection failed — server continues without cache: ${err.message}`); // WHAT: Log warning. WHY: App is resilient and can run without redis.
  }
}

async function disconnectRedis() { // WHAT: Define disconnection logic. WHY: Clean shutdown on app exit.
  if (client) { // WHAT: Check if client exists. WHY: Avoid errors if never connected.
    try { // WHAT: Use try block. WHY: Catch quit errors.
      await client.quit(); // WHAT: Gracefully close connection. WHY: Ensure commands finish.
    } catch { // WHAT: Catch error silently. WHY: Disconnect failures aren't critical during shutdown.

    }
    client = null; // WHAT: Clear reference. WHY: Prevent memory leaks.
    ready = false; // WHAT: Reset flag. WHY: Reflect disconnected state.
  }
}

module.exports = { getRedisClient, isAvailable, connectRedis, disconnectRedis }; // WHAT: Export methods. WHY: Make Redis functions available across app.
