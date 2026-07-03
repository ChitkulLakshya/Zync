/**
 * @fileoverview loadShedding.js
 * @module loadShedding
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
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
