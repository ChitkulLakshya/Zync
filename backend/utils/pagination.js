/**
 * @fileoverview pagination.js
 * @module pagination
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
function toPositiveInt(value) { // WHAT: Define helper to parse integer. WHY: Safely parse query strings into numbers.
  const parsed = Number.parseInt(value, 10); // WHAT: Parse string to base-10 integer. WHY: Ensure we work with numbers, not strings.
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null; // WHAT: Check if parsed is finite and positive. WHY: Return valid page/limit or null if invalid.
}

function getPagination(query = {}, options = {}) { // WHAT: Parse pagination options from request. WHY: Centralize logic for pagination extraction.
  const defaultLimit = options.defaultLimit ?? null; // WHAT: Get default limit. WHY: Provide fallback if not specified.
  const maxLimit = options.maxLimit ?? 100; // WHAT: Set maximum limit. WHY: Prevent clients from requesting too many records at once.

  const page = toPositiveInt(query.page) || 1; // WHAT: Extract page number. WHY: Default to page 1 if not provided or invalid.
  const limit = Math.min( // WHAT: Calculate effective limit. WHY: Ensure limit doesn't exceed maxLimit.
    toPositiveInt(query.limit) || defaultLimit || maxLimit, // WHAT: Prefer query limit, then default, then max. WHY: Respect user choice within boundaries.
    maxLimit // WHAT: Bound the limit. WHY: Hard cap on result size.
  );

  const hasPaginationQuery = toPositiveInt(query.page) !== null || toPositiveInt(query.limit) !== null; // WHAT: Check if pagination was requested. WHY: Determine if pagination is explicitly needed.
  const shouldPaginate = hasPaginationQuery || defaultLimit !== null; // WHAT: Determine if we should paginate. WHY: Paginate if asked or if a default exists.

  if (!shouldPaginate) { // WHAT: Check shouldPaginate flag. WHY: Avoid unnecessary calculations if not paginating.
    return null; // WHAT: Return null. WHY: Indicate no pagination.
  }

  return { // WHAT: Return pagination details object. WHY: Provide standardized skip/limit for queries.
    page, // WHAT: Include current page. WHY: Useful for metadata.
    limit, // WHAT: Include item limit. WHY: Used to restrict query result size.
    skip: (page - 1) * limit, // WHAT: Calculate documents to skip. WHY: Standard DB pagination offset formula.
  };
}

function paginateArray(items, query = {}, options = {}) { // WHAT: Paginate an in-memory array. WHY: For cases where DB pagination isn't possible or data is small.
  const pagination = getPagination(query, options); // WHAT: Get pagination config. WHY: Reuse existing logic.
  if (!pagination) { // WHAT: Check if pagination applies. WHY: Return all if not.
    return { items, pagination: null }; // WHAT: Return full array. WHY: No pagination requested.
  }

  const total = items.length; // WHAT: Get total items count. WHY: Needed for calculating total pages.
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit); // WHAT: Calculate total pages. WHY: Provide helpful metadata to client.
  const start = pagination.skip; // WHAT: Determine start index. WHY: Slice start bound.
  const paginatedItems = items.slice(start, start + pagination.limit); // WHAT: Slice the array. WHY: Extract the specific page of items.

  return { // WHAT: Return paginated result. WHY: Includes data and metadata.
    items: paginatedItems, // WHAT: The sliced items. WHY: Actual data payload.
    pagination: { // WHAT: Pagination metadata object. WHY: For client-side UI to render page controls.
      page: pagination.page, // WHAT: Current page number. WHY: Context.
      limit: pagination.limit, // WHAT: Current limit. WHY: Context.
      total, // WHAT: Total items count. WHY: Show overall size to user.
      totalPages, // WHAT: Total pages available. WHY: Useful for 'last page' buttons.
    },
  };
}

function setPaginationHeaders(res, pagination) { // WHAT: Function to set HTTP headers. WHY: Alternative way to send pagination metadata instead of payload.
  if (!pagination) return; // WHAT: Check if pagination exists. WHY: Do nothing if missing.

  res.set({ // WHAT: Set response headers. WHY: Attach metadata cleanly.
    'X-Page': String(pagination.page), // WHAT: Set X-Page header. WHY: Current page context.
    'X-Limit': String(pagination.limit), // WHAT: Set X-Limit header. WHY: Page size context.
    'X-Total-Count': String(pagination.total), // WHAT: Set X-Total-Count header. WHY: Overall size context.
    'X-Total-Pages': String(pagination.totalPages), // WHAT: Set X-Total-Pages header. WHY: Max page context.
  });
}

module.exports = { // WHAT: Export utilities. WHY: Allow usage across the app.
  getPagination, // WHAT: Export getPagination. WHY: For DB queries.
  paginateArray, // WHAT: Export paginateArray. WHY: For memory arrays.
  setPaginationHeaders, // WHAT: Export setPaginationHeaders. WHY: For header-based metadata.
};