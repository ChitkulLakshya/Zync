/**
 * @fileoverview db.ts
 * @module db
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Client-Side Presentation & Logic Layer.
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
// Imports the core Dexie class and the Table type interface from the Dexie.js library, which provides a robust wrapper around IndexedDB for local browser storage.
import Dexie, { type Table } from "dexie";

// Exports a TypeScript interface defining the shape of a user's data object when stored locally in IndexedDB.
export interface UserData {
  // Specifies that every UserData record must have a unique string identifier.
  id: string;
  // Specifies an optional email string property.
  email?: string;
  // Allows any other dynamic key-value pairs to be stored on the user object without strict typing.
  [key: string]: any;
}

// Exports a TypeScript interface defining the shape of a project data object when cached locally.
export interface ProjectData {
  // Specifies that every ProjectData record must have a unique string identifier.
  id: string;
  // Specifies that every ProjectData record must be associated with a user's ID for query filtering.
  userId: string;
  // Allows any other dynamic project-related properties to be stored alongside the required fields.
  [key: string]: any;
}

// Defines a custom database class that extends the base Dexie class to construct the specific IndexedDB schema for the Zync application.
export class ZyncAppDB extends Dexie {
  // Declares a strictly typed Dexie Table property for storing UserData records, using a string as the primary key type.
  userData!: Table<UserData, string>;
  // Declares a strictly typed Dexie Table property for storing ProjectData records, using a string as the primary key type.
  projectData!: Table<ProjectData, string>;

  // Defines the class constructor which is invoked when a new instance of the database is created.
  constructor() {
    // Calls the parent Dexie class constructor, passing 'zyncAppDB' as the internal name for the IndexedDB database instance.
    super("zyncAppDB");
    // Defines the database schema for version 1, specifying the primary keys and indexed fields (like 'updatedAt') for each table to allow fast querying.
    this.version(1).stores({
      userData: "id, updatedAt",
      projectData: "id, userId, updatedAt",
    });
  }
}

// Exports a single instantiated, ready-to-use singleton instance of the ZyncAppDB database for the rest of the application to import and query.
export const db = new ZyncAppDB();
