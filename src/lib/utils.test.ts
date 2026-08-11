/**
 * @fileoverview utils.test.ts
 * @module utils.test
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
// Imports the necessary testing utilities from vitest to define the test suites, assert outcomes, and create mocks.
import { describe, expect, test, vi } from "vitest";

// Mocks the external 'clsx' library globally before any internal code is evaluated during the test run.
vi.mock("clsx", () => ({
  // Provides a simplified mock implementation of the clsx function that flattens inputs and extracts keys from true boolean values.
  clsx: (...inputs: any[]) => {
    return inputs
      .flat()
      .map(input => {
        if (typeof input === "string") {return input;}
        if (typeof input === "object" && input !== null) {
          return Object.entries(input)
            .filter(([_, value]) => !!value)
            .map(([key]) => key)
            .join(" ");
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  },
}));

// Mocks the external 'tailwind-merge' library to prevent complex internal logic from running during simple unit tests.
vi.mock("tailwind-merge", () => ({
  // Provides a passthrough mock implementation of twMerge that just returns exactly what it receives.
  twMerge: (input: string) => input,
}));

// Dynamically imports the functions to be tested from the utils module *after* the mocks have been established above.
const { cn, getFullUrl, getUserName, getUserInitials, pickUserForDisplay } = await import("./utils");

describe("utils.ts", () => {
  describe("cn", () => {
    test("should merge class names", () => {
      expect(cn("btn", "btn-primary")).toBe("btn btn-primary");
    });

    test("should handle conditional classes", () => {
      const isActive = true;
      const isHidden = false;
      expect(cn("btn", isActive && "btn-active", isHidden && "btn-hidden")).toBe("btn btn-active");
    });

    test("should handle objects", () => {
      expect(cn("btn", { "btn-active": true, "btn-hidden": false })).toBe("btn btn-active");
    });
  });

  describe("getFullUrl", () => {
    test("should return empty string for empty path", () => {
      expect(getFullUrl(null)).toBe("");
      expect(getFullUrl(undefined)).toBe("");
      expect(getFullUrl("")).toBe("");
    });

    test("should return original path if it starts with http or blob:", () => {
      expect(getFullUrl("https://example.com/image.png")).toBe("https://example.com/image.png");
      expect(getFullUrl("http://example.com/image.png")).toBe("http://example.com/image.png");
      expect(getFullUrl("blob:http://localhost:5173/uuid")).toBe("blob:http://localhost:5173/uuid");
    });

    test("should handle relative paths", () => {


      expect(getFullUrl("/uploads/image.png")).toBe("/uploads/image.png");
      expect(getFullUrl("uploads/image.png")).toBe("/uploads/image.png");
    });
  });

  describe("getUserName", () => {
    test("should return displayName if available", () => {
      const user = { displayName: "John Doe" };
      expect(getUserName(user)).toBe("John Doe");
    });

    test("should return combined firstName and lastName", () => {
      const user = { firstName: "John", lastName: "Doe" };
      expect(getUserName(user)).toBe("John Doe");
    });

    test("should return only firstName if lastName is missing", () => {
      const user = { firstName: "John" };
      expect(getUserName(user)).toBe("John");
    });

    test("should return name if available", () => {
      const user = { name: "John Doe" };
      expect(getUserName(user)).toBe("John Doe");
    });

    test("should return part of email if no name fields are available", () => {
      const user = { email: "john.doe@example.com" };
      expect(getUserName(user)).toBe("john.doe");
    });

    test("should return 'User' if no user provided or no fields available", () => {
      expect(getUserName(null)).toBe("User");
      expect(getUserName({})).toBe("User");
    });
  });

  describe("getUserInitials", () => {
    test("should return first two letters of name in uppercase", () => {
      expect(getUserInitials({ displayName: "John Doe" })).toBe("JO");
    });

    test("should work with email-based names", () => {
      expect(getUserInitials({ email: "bob@example.com" })).toBe("BO");
    });

    test("should return 'US' for default 'User'", () => {
      expect(getUserInitials(null)).toBe("US");
    });

    test("should use email for initials when name resolves to User", () => {
      expect(getUserInitials({ email: "alice@example.com", displayName: "User" })).toBe("AL");
    });
  });

  describe("pickUserForDisplay", () => {
    test("should prefer backend user when uid is set", () => {
      const backend = { uid: "x", displayName: "Backend" };
      const fb = { uid: "x", displayName: "Firebase" };
      expect(pickUserForDisplay(backend, fb)).toBe(backend);
    });

    test("should fall back to Firebase when userData has no uid", () => {
      const fb = { displayName: "Firebase User", email: "f@example.com" };
      expect(pickUserForDisplay({}, fb)).toBe(fb);
      expect(pickUserForDisplay(null, fb)).toBe(fb);
    });
  });
});
