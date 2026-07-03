/**
 * @fileoverview upload_security.js
 * @module upload_security
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
const express = require('express');
const request = require('supertest');
const path = require('path');
const fs = require('fs');
const uploadRoutes = require('../routes/uploadRoutes');

const app = express();
app.use('/api/upload', uploadRoutes);


const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

async function run() {
    let passed = true;
    console.log('Starting verification...');


    try {
        console.log('\n[Test 1] Extension Sanitization (text/plain upload of .html file)...');
        const buffer = Buffer.from('<html><body><script>alert("XSS")</script></body></html>');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'exploit.html',
                contentType: 'text/plain'
            });

        if (res.status === 200) {
            if (res.body.fileUrl.endsWith('.txt')) {
                console.log('✅ Passed: File saved with .txt extension.');
            } else {
                console.error('❌ Failed: File saved with extension:', path.extname(res.body.fileUrl));
                passed = false;
            }
        } else {
            console.error('❌ Failed: Upload failed with status', res.status);
            passed = false;
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }


    try {
        console.log('\n[Test 2] SVG Rejection (image/svg+xml)...');
        const buffer = Buffer.from('<svg><script>alert(1)</script></svg>');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'malicious.svg',
                contentType: 'image/svg+xml'
            });

        if (res.status !== 200) {
             console.log('✅ Passed: SVG upload rejected with status', res.status);
        } else {
            console.error('❌ Failed: SVG upload was accepted!');
            passed = false;
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }


    try {
        console.log('\n[Test 3] Valid Image (image/png)...');
        const buffer = Buffer.from('fakeimagecontent');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'valid.png',
                contentType: 'image/png'
            });

        if (res.status === 200) {
            if (res.body.fileUrl.endsWith('.png')) {
                console.log('✅ Passed: Valid PNG saved with .png extension.');
            } else {
                console.error('❌ Failed: Valid PNG saved with wrong extension:', path.extname(res.body.fileUrl));
                passed = false;
            }
        } else {
            console.error('❌ Failed: Valid PNG upload failed.');
            passed = false;
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }


    try {
        console.log('\n[Test 4] Mime Spoofing (upload .html as image/png)...');
        const buffer = Buffer.from('<html>...</html>');
        const res = await request(app)
            .post('/api/upload')
            .attach('file', buffer, {
                filename: 'exploit.html',
                contentType: 'image/png'
            });

        if (res.status === 200) {
            if (res.body.fileUrl.endsWith('.png')) {
                console.log('✅ Passed: Spoofed file saved with .png extension (harmless).');
            } else {
                 console.error('❌ Failed: Spoofed file saved with dangerous extension:', path.extname(res.body.fileUrl));
                 passed = false;
            }
        } else {
            console.error('❌ Failed: Spoofed upload failed.');
        }
    } catch (e) {
        console.error('❌ Error:', e);
        passed = false;
    }

    if (passed) {
        console.log('\n🎉 ALL TESTS PASSED');
        process.exit(0);
    } else {
        console.log('\n💥 SOME TESTS FAILED');
        process.exit(1);
    }
}

run();
