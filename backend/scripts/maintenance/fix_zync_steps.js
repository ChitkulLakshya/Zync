/**
 * @fileoverview fix_zync_steps.js
 * @module fix_zync_steps
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
const prisma = require('../lib/prisma');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixSteps = async () => {
    try {

        const project = await prisma.project.findFirst({
            where: {
                name: { equals: 'ToolDeck', mode: 'insensitive' }
            },
            include: { steps: true }
        });

        if (!project) {
            console.log('Project "ToolDeck" not found. Listing all projects:');
            const all = await prisma.project.findMany({ select: { name: true } });
            all.forEach(p => console.log(`- ${p.name}`));
            return;
        }

        console.log(`Found Project: ${project.name} (${project.id})`);
        console.log(`Current Steps: ${project.steps.length}`);

        const newSteps = [
            { title: 'Frontend', type: 'Frontend', description: 'Frontend tasks' },
            { title: 'Backend', type: 'Backend', description: 'Backend tasks' },
            { title: 'Console', type: 'Other', description: 'Console/CLI tasks' },
            { title: 'Server', type: 'Backend', description: 'Server configuration' }
        ];

        let addedCount = 0;
        for (const s of newSteps) {

            const exists = project.steps.some(existing => existing.title.toLowerCase() === s.title.toLowerCase());
            if (!exists) {
                await prisma.step.create({
                    data: {
                        title: s.title,
                        description: s.description,
                        type: s.type,
                        status: 'Pending',
                        projectId: project.id
                    }
                });
                addedCount++;
                console.log(`Added step: ${s.title}`);
            } else {
                console.log(`Step already exists: ${s.title}`);
            }
        }

        if (addedCount > 0) {
            console.log(`Project updated with ${addedCount} new steps.`);
        } else {
            console.log('No new steps needing addition.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

fixSteps();
