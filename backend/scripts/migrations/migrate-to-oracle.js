/**
 * @fileoverview migrate-to-oracle.js
 * @module migrate-to-oracle
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
/**
 * migrate-to-oracle.js
 * 
 * Migrates all collections from MongoDB Atlas → Oracle ADB 26ai (MongoDB API)
 * Uses the native mongodb driver — no mongodump/mongorestore needed.
 *
 * Usage:  node migrate-to-oracle.js
 */

const { MongoClient } = require('mongodb');


const SOURCE_URI =
  'mongodb+srv://chitkullakshya_db_user:GAJbowG2cvz59ub0@zync.qgvjh6f.mongodb.net/?appName=Zync';
const SOURCE_DB = 'zync-production';


const TARGET_URI =
  'mongodb://ZYNC_USER:Zync_Backend_Pass_2026%21@G76E39710C3F23C-ZYNCDB.adb.ap-hyderabad-1.oraclecloudapps.com:27017/ZYNC_USER?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true';
const TARGET_DB = 'ZYNC_USER';


const BATCH_SIZE = 100;

async function migrate() {
  const sourceClient = new MongoClient(SOURCE_URI);
  const targetClient = new MongoClient(TARGET_URI);

  try {

    console.log('🔗 Connecting to Atlas (source)...');
    await sourceClient.connect();
    const sourceDb = sourceClient.db(SOURCE_DB);
    console.log('✅ Atlas connected.\n');

    console.log('🔗 Connecting to Oracle ADB (target)...');
    await targetClient.connect();
    const targetDb = targetClient.db(TARGET_DB);
    console.log('✅ Oracle ADB connected.\n');


    const collections = await sourceDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections to migrate:\n`);
    for (const col of collections) {
      const count = await sourceDb.collection(col.name).countDocuments();
      console.log(`  • ${col.name}  (${count} docs)`);
    }
    console.log('');


    let totalDocs = 0;
    const results = [];

    for (const colInfo of collections) {
      const name = colInfo.name;
      const sourceCol = sourceDb.collection(name);
      const targetCol = targetDb.collection(name);
      const docCount = await sourceCol.countDocuments();

      if (docCount === 0) {
        console.log(`⏭️  ${name}: 0 docs — skipping.`);
        results.push({ collection: name, status: 'skipped (empty)', count: 0 });
        continue;
      }

      console.log(`📦 Migrating "${name}" (${docCount} docs)...`);

      let migrated = 0;
      let batch = [];
      const cursor = sourceCol.find();

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        batch.push(doc);

        if (batch.length >= BATCH_SIZE) {
          try {
            await targetCol.insertMany(batch, { ordered: false });
          } catch (err) {

            if (err.code !== 11000) {
              console.error(`   ⚠️  Batch insert error in "${name}": ${err.message}`);
            }
          }
          migrated += batch.length;
          process.stdout.write(`   ${migrated}/${docCount}\r`);
          batch = [];
        }
      }


      if (batch.length > 0) {
        try {
          await targetCol.insertMany(batch, { ordered: false });
        } catch (err) {
          if (err.code !== 11000) {
            console.error(`   ⚠️  Batch insert error in "${name}": ${err.message}`);
          }
        }
        migrated += batch.length;
      }

      console.log(`   ✅ ${name}: ${migrated} docs migrated.`);
      totalDocs += migrated;
      results.push({ collection: name, status: 'migrated', count: migrated });
    }


    console.log('\n══════════════════════════════════════════════');
    console.log('  MIGRATION COMPLETE');
    console.log('══════════════════════════════════════════════');
    console.log(`  Total documents migrated: ${totalDocs}`);
    console.log('');
    for (const r of results) {
      console.log(`  ${r.collection}: ${r.count} docs (${r.status})`);
    }
    console.log('══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await sourceClient.close();
    await targetClient.close();
    console.log('Connections closed.');
  }
}

migrate();
