/**
 * @fileoverview commitAnalysisService.test.js
 * @module commitAnalysisService.test
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
const { describe, test, expect } = require("bun:test"); // WHAT: Import testing utilities from Bun. WHY: To structure and run unit tests for the commit analysis service.
const { filterCommitMessage } = require("./commitAnalysisService"); // WHAT: Import the function to be tested. WHY: To evaluate its behavior against various test cases.

// WHAT: Group tests for the filterCommitMessage function. WHY: To organize the test suite logically.
describe("commitAnalysisService - filterCommitMessage", () => {
    // WHAT: Define a test case for standard TASK-ID format. WHY: To ensure the regex correctly matches uppercase task IDs.
    test("should find and normalize TASK-ID (TASK-123)", () => {
        const message = "Implement feature for TASK-123"; // WHAT: Define a sample commit message. WHY: To use as input for the function.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To get the actual output to assert against.
        expect(result.found).toBe(true); // WHAT: Assert that a task was found. WHY: To verify the regex successfully matched the ID.
        expect(result.id).toBe("TASK-123"); // WHAT: Assert the parsed ID is correct. WHY: To verify normalization logic.
        expect(result.action).toBe("In Progress"); // WHAT: Assert the default action. WHY: To verify it defaults to 'In Progress' when 'fix' is absent.
        expect(result.confidence).toBe(0.8); // WHAT: Assert the confidence score. WHY: To verify the hardcoded fallback score is set.
    });

    // WHAT: Define a test case for hash ID format. WHY: To ensure the regex handles GitHub-style issue references (#123).
    test("should find and normalize hash ID (#123)", () => {
        const message = "Work on #123"; // WHAT: Define a sample message with a hash. WHY: To test hash normalization.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To get the parsed output.
        expect(result.found).toBe(true); // WHAT: Assert that a task was found. WHY: To ensure hash symbols are recognized.
        expect(result.id).toBe("TASK-123"); // WHAT: Assert the normalized ID. WHY: To verify # is correctly replaced with TASK-.
        expect(result.action).toBe("In Progress"); // WHAT: Assert the action. WHY: To ensure standard logic applies to hash matches too.
        expect(result.confidence).toBe(0.8); // WHAT: Assert the confidence score. WHY: To verify consistency.
    });

    // WHAT: Define a test case for lowercase task IDs. WHY: To ensure the regex is case-insensitive.
    test("should handle lowercase task id (task-456)", () => {
        const message = "Update task-456 logic"; // WHAT: Define a sample message with lowercase ID. WHY: To test case insensitivity.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To evaluate the result.
        expect(result.found).toBe(true); // WHAT: Assert a task was found. WHY: To confirm the 'i' flag on the regex works.
        expect(result.id).toBe("TASK-456"); // WHAT: Assert normalized ID. WHY: To confirm it gets converted to uppercase.
        expect(result.action).toBe("In Progress"); // WHAT: Assert the action. WHY: To verify default state.
    });

    // WHAT: Define a test case for 'fix' keyword. WHY: To ensure the action parsing logic correctly identifies completion.
    test("should detect 'fix' action as Complete", () => {
        const message = "Fix bug in TASK-789"; // WHAT: Define a sample message with 'fix'. WHY: To test the action logic.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To evaluate the output.
        expect(result.found).toBe(true); // WHAT: Assert a task was found. WHY: To confirm regex matching.
        expect(result.id).toBe("TASK-789"); // WHAT: Assert the ID. WHY: To confirm normalization.
        expect(result.action).toBe("Complete"); // WHAT: Assert the action is 'Complete'. WHY: To verify the 'fix' keyword trigger works.
    });

    // WHAT: Define a test case for 'fixes' keyword. WHY: To ensure variations of 'fix' also work.
    test("should detect 'fixes' action as Complete", () => {
        const message = "Fixes #101 issue"; // WHAT: Define a sample message with 'fixes'. WHY: To test substring matching.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To evaluate the output.
        expect(result.found).toBe(true); // WHAT: Assert a task was found. WHY: To confirm regex matching.
        expect(result.id).toBe("TASK-101"); // WHAT: Assert the ID. WHY: To confirm hash normalization.
        expect(result.action).toBe("Complete"); // WHAT: Assert the action. WHY: To verify 'fixes' includes 'fix' and triggers 'Complete'.
    });

    // WHAT: Define a test case for 'fixed' keyword. WHY: To ensure past tense variations of 'fix' work.
    test("should detect 'fixed' action as Complete", () => {
        const message = "Fixed styling on TASK-202"; // WHAT: Define a sample message with 'fixed'. WHY: To test substring matching.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To evaluate the output.
        expect(result.found).toBe(true); // WHAT: Assert a task was found. WHY: To confirm regex matching.
        expect(result.id).toBe("TASK-202"); // WHAT: Assert the ID. WHY: To confirm normalization.
        expect(result.action).toBe("Complete"); // WHAT: Assert the action. WHY: To verify 'fixed' includes 'fix' and triggers 'Complete'.
    });

    // WHAT: Define a test case for absence of fix keyword. WHY: To ensure it defaults correctly when no completion intent is shown.
    test("should default action to In Progress if no fix keyword", () => {
        const message = "Refactor code for #303"; // WHAT: Define a sample message without fix keywords. WHY: To test the fallback action logic.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To evaluate the output.
        expect(result.found).toBe(true); // WHAT: Assert a task was found. WHY: To confirm regex matching.
        expect(result.id).toBe("TASK-303"); // WHAT: Assert the ID. WHY: To confirm normalization.
        expect(result.action).toBe("In Progress"); // WHAT: Assert the action. WHY: To verify the default state is 'In Progress'.
    });

    // WHAT: Define a test case for messages with no tasks. WHY: To ensure the function handles negative cases gracefully.
    test("should return not found if no ID present", () => {
        const message = "Just a regular commit message"; // WHAT: Define a generic commit message. WHY: To test the failure path.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To evaluate the output.
        expect(result.found).toBe(false); // WHAT: Assert no task was found. WHY: To confirm regex correctly fails to match.
        expect(result.id).toBeNull(); // WHAT: Assert ID is null. WHY: To verify the empty state payload.
        expect(result.action).toBeNull(); // WHAT: Assert action is null. WHY: To verify the empty state payload.
        expect(result.confidence).toBe(0); // WHAT: Assert confidence is 0. WHY: To verify the empty state payload.
    });

    // WHAT: Define a test case for empty strings. WHY: To ensure the function does not crash on empty inputs.
    test("should handle empty string", () => {
        const message = ""; // WHAT: Define an empty string. WHY: To test edge case input.
        const result = filterCommitMessage(message); // WHAT: Call the function. WHY: To evaluate the output.
        expect(result.found).toBe(false); // WHAT: Assert no task was found. WHY: To confirm safe handling of empty inputs.
    });
});
