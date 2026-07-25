/**
 * @fileoverview set-storage-cors.js
 * @module set-storage-cors
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
require('dotenv').config();
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');


if (!getApps().length) {
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
        let serviceAccount = process.env.GCP_SERVICE_ACCOUNT_KEY;
        if (typeof serviceAccount === 'string') {
            serviceAccount = JSON.parse(serviceAccount);
        }
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        console.error('ERROR: GCP_SERVICE_ACCOUNT_KEY env var is required.');
        process.exit(1);
    }
}

const corsConfig = [
    {
        origin: [
            'http://localhost:8081',
            'http://localhost:5173',
            'http://localhost:3000',
            'https://zync-meet.vercel.app'
        ],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD'],
        maxAgeSeconds: 3600,
        responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable']
    }
];

async function setCors() {
    const bucketNames = [
        'zync-7c9b0.appspot.com',
        'zync-7c9b0.firebasestorage.app',
    ];

    for (const bucketName of bucketNames) {
        try {
            console.log(`Trying bucket: ${bucketName}...`);
            const bucket = getStorage().bucket(bucketName);
            await bucket.setCorsConfiguration(corsConfig);
            console.log(`✅ CORS set successfully on bucket: ${bucketName}`);

            const [metadata] = await bucket.getMetadata();
            console.log('Current CORS config:', JSON.stringify(metadata.cors, null, 2));
            process.exit(0);
        } catch (error) {
            console.log(`  ❌ ${bucketName}: ${error.message}`);
        }
    }

    console.error('\n❌ Could not set CORS on any bucket.');
    process.exit(1);
}

setCors();
