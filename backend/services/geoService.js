/**
 * @fileoverview geoService.js
 * @module geoService
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Provides IP-to-geolocation resolution using the external GeoJS API.
 * Why: Adding location awareness (like timezone or country) helps tailor user experiences or enforce region-based logic. It uses timeout signals to fail fast, ensuring the core app remains responsive if the API is slow.
 */
// WHAT: Define GeoJS API URL. WHY: Hardcoding endpoint for easy reference.
const GEOJS_URL = 'https://get.geojs.io/v1/ip/geo.json';

/**
 * Resolve an IP address to location data using GeoJS.
 * Falls back gracefully on failure — location is non-essential.
 *
 * @param {string} ip - IPv4 or IPv6 address
 * @returns {Promise<{timezone: string, country: string, countryCode: string, city: string}|null>}
 */
// WHAT: Resolve IP to location. WHY: Allows non-blocking location fetching.
async function resolveIp(ip) {
  // WHAT: Skip local or missing IPs. WHY: Local IPs cannot be geolocated.
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return null;
  }

  try {
    // WHAT: Make HTTP GET request. WHY: Fetches location data.
    const res = await fetch(`${GEOJS_URL}?ip=${encodeURIComponent(ip)}`, {
      headers: { 'User-Agent': 'Zync/1.0' },
      signal: AbortSignal.timeout(5000),
    });

    // WHAT: Check response ok. WHY: Ensure successful request.
    if (!res.ok) return null;

    // WHAT: Parse JSON. WHY: Converts response to object.
    const data = await res.json();
    // WHAT: Validate data. WHY: Fallback on error.
    if (!data || data.error) return null;

    // WHAT: Return location properties. WHY: Normalizes response format.
    return {
      timezone: data.timezone || null,
      country: data.country || null,
      countryCode: data.country_code || null,
      city: data.city || null,
    };
  } catch {
    return null;
  }
}

// WHAT: Export function. WHY: Makes service available.
module.exports = { resolveIp };
