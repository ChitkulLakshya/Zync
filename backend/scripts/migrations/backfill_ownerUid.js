/**
 * @fileoverview backfill_ownerUid.js
 * @module backfill_ownerUid
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
 * @license AGPL-3.0-only
 * ============================================================================
 */
/**
 * Migration: Backfill ownerUid on existing Project documents.
 *
 * Every Project has ownerId (ObjectId ref to User) but lacks ownerUid (Firebase UID string).
 * This script looks up each project's owner and sets ownerUid = owner.uid.
 *
 * Usage: node scripts/backfill_ownerUid.js
 */

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
});

const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');

async function backfill() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const projects = await Project.find({ ownerUid: { $exists: false } }).lean();
  console.log(`Found ${projects.length} projects without ownerUid`);

  if (projects.length === 0) {
    console.log('Nothing to migrate');
    await mongoose.disconnect();
    return;
  }


  const ownerIds = [...new Set(projects.map((p) => p.ownerId.toString()))];
  const owners = await User.find({ _id: { $in: ownerIds } })
    .select('_id uid')
    .lean();
  const ownerMap = new Map(owners.map((o) => [o._id.toString(), o.uid]));

  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const uid = ownerMap.get(project.ownerId.toString());
    if (!uid) {
      console.warn(
        `Skipping project ${project._id}: no User found for ownerId ${project.ownerId}`
      );
      skipped++;
      continue;
    }
    await Project.updateOne({ _id: project._id }, { $set: { ownerUid: uid } });
    updated++;
  }

  console.log(`Done: ${updated} updated, ${skipped} skipped`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
