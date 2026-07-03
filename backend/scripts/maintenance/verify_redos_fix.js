/**
 * @fileoverview verify_redos_fix.js
 * @module verify_redos_fix
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
const { escapeRegExp } = require('./utils/regexUtils');

const redosPayload = '(a+)+$';
const safeString = 'aaaaa';
const maliciousString = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!';

console.log('Testing escapeRegExp with ReDoS payload:', redosPayload);

const escapedPayload = escapeRegExp(redosPayload);
console.log('Escaped payload:', escapedPayload);

const regex = new RegExp(escapedPayload, 'i');

console.log('Testing regex.test()...');

const start = Date.now();
const result1 = regex.test(safeString);
const end1 = Date.now();
console.log(`Result for "${safeString}": ${result1} (took ${end1 - start}ms)`);

const start2 = Date.now();
const result2 = regex.test(maliciousString);
const end2 = Date.now();
console.log(`Result for "${maliciousString}": ${result2} (took ${end2 - start2}ms)`);

if (end2 - start2 > 100) {
    console.error('FAILED: Regex took too long to process (potential ReDoS)');
    process.exit(1);
} else if (result2 === true) {
    console.error('FAILED: Regex matched malicious string which it should not have (if escaped correctly)');
    process.exit(1);
} else {
    console.log('SUCCESS: Regex handled the payload safely and treated it as a literal string.');
}


const dotPayload = 'a.b';
const escapedDot = escapeRegExp(dotPayload);
const dotRegex = new RegExp(escapedDot);
console.log(`Testing "${dotPayload}" escaped as literal:`);
console.log(`"a.b" matches "a.b"? ${dotRegex.test('a.b')}`);
console.log(`"a.b" matches "axb"? ${dotRegex.test('axb')}`);
if (dotRegex.test('axb')) {
    console.error('FAILED: Dot was not escaped');
    process.exit(1);
}

console.log('All tests passed!');
