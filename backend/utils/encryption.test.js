/**
 * @fileoverview encryption.test.js
 * @module encryption.test
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
const { describe, test, expect } = require("bun:test"); // WHAT: Imports testing utilities from the bun test runner. WHY: Required to define test suites, write assertions, and structure tests.
const { encrypt, decrypt } = require("./encryption"); // WHAT: Imports the encrypt and decrypt functions to be tested. WHY: Provides the actual implementation that needs verification.

describe("Encryption Utils", () => { // WHAT: Groups related tests under the "Encryption Utils" suite. WHY: Organizes the test output and scopes variables logically.
  const originalText = "Hello, World!"; // WHAT: Defines a constant sample string for testing. WHY: Provides a reusable, known plaintext input for the encryption functions.


  test("should return null if input is null, undefined, or empty", () => { // WHAT: Defines a test case for falsy inputs. WHY: Ensures the functions handle edge cases gracefully without throwing errors.
    expect(encrypt(null)).toBeNull(); // WHAT: Asserts that encrypting null returns null. WHY: Verifies the early return guard clause in the encrypt function.
    expect(encrypt(undefined)).toBeNull(); // WHAT: Asserts that encrypting undefined returns null. WHY: Ensures robustness against missing parameters.
    expect(encrypt("")).toBeNull(); // WHAT: Asserts that encrypting an empty string returns null. WHY: No point in encrypting empty data.

    expect(decrypt(null)).toBeNull(); // WHAT: Asserts that decrypting null returns null. WHY: Verifies the early return guard clause in the decrypt function.
    expect(decrypt(undefined)).toBeNull(); // WHAT: Asserts that decrypting undefined returns null. WHY: Ensures robustness against missing parameters.
    expect(decrypt("")).toBeNull(); // WHAT: Asserts that decrypting an empty string returns null. WHY: Cannot decrypt empty ciphertext.
  });

  test("should encrypt a string", () => { // WHAT: Defines a test case for basic string encryption. WHY: Validates the core functionality of turning plaintext into ciphertext.
    const encrypted = encrypt(originalText); // WHAT: Calls the encrypt function with the sample text. WHY: Executes the function to obtain its output for assertions.
    expect(encrypted).not.toBeNull(); // WHAT: Asserts the output is not null. WHY: Ensures the function actually produced a result.
    expect(typeof encrypted).toBe("string"); // WHAT: Asserts the output is a string. WHY: The expected format of the ciphertext is a hex string.
    expect(encrypted).not.toEqual(originalText); // WHAT: Asserts the ciphertext is different from the plaintext. WHY: Fundamental requirement of encryption is data transformation.

    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/); // WHAT: Asserts the ciphertext matches the expected 'IV:encryptedData' format. WHY: Verifies that the custom string concatenation logic works.
  });

  test("should decrypt an encrypted string back to original", () => { // WHAT: Defines a test case for reversing encryption. WHY: Verifies that the encryption process is perfectly invertible.
    const encrypted = encrypt(originalText); // WHAT: Encrypts the sample text first. WHY: Needed to generate a valid ciphertext for the decryption test.
    const decrypted = decrypt(encrypted); // WHAT: Decrypts the previously generated ciphertext. WHY: Tests the decrypt function's ability to parse and reverse the encryption.
    expect(decrypted).toEqual(originalText); // WHAT: Asserts the decrypted text perfectly matches the original plaintext. WHY: This is the definitive proof that the cipher system works end-to-end.
  });

  test("should produce different ciphertexts for same input (IV randomness)", () => { // WHAT: Defines a test case to check Initialization Vector randomness. WHY: Ensures the cipher is semantically secure and doesn't produce identical outputs for identical inputs.
    const encrypted1 = encrypt(originalText); // WHAT: Encrypts the sample text the first time. WHY: Generates the first baseline ciphertext.
    const encrypted2 = encrypt(originalText); // WHAT: Encrypts the exact same sample text a second time. WHY: Generates a second ciphertext for comparison.
    expect(encrypted1).not.toEqual(encrypted2); // WHAT: Asserts the two ciphertexts are strictly not equal. WHY: Proves that the random IV is functioning correctly to salt the encryption.
  });

  test("should handle longer strings", () => { // WHAT: Defines a test case for encrypting a large payload. WHY: Ensures the encryption logic handles data larger than a single block size correctly (padding/streaming).
    const longText = "a".repeat(1000); // WHAT: Generates a string of 1000 'a' characters. WHY: Creates a realistically large input string for testing performance and correctness.
    const encrypted = encrypt(longText); // WHAT: Encrypts the long string. WHY: Triggers the multi-block processing in the cipher.
    const decrypted = decrypt(encrypted); // WHAT: Decrypts the long ciphertext back. WHY: Completes the round-trip process for the large payload.
    expect(decrypted).toEqual(longText); // WHAT: Asserts the long decrypted text matches the original long input. WHY: Verifies there is no data loss or corruption with larger payloads.
  });

  test("should handle special characters", () => { // WHAT: Defines a test case for ASCII special characters. WHY: Ensures symbols and non-alphanumeric characters do not break the cipher or encoding.
    const specialText = "!@#$%^&*()_+{}[]|:;<>,.?/~`"; // WHAT: Defines a string packed with special punctuation. WHY: Provides an edge-case input known to sometimes cause encoding issues.
    const encrypted = encrypt(specialText); // WHAT: Encrypts the special character string. WHY: Passes the string through the crypto pipeline.
    const decrypted = decrypt(encrypted); // WHAT: Decrypts the resulting ciphertext. WHY: Reverses the process to check for data integrity.
    expect(decrypted).toEqual(specialText); // WHAT: Asserts the decrypted string perfectly matches the input string. WHY: Proves special characters are safely preserved.
  });

  test("should handle unicode characters", () => { // WHAT: Defines a test case for multi-byte Unicode characters (e.g., emojis). WHY: Crucial to ensure UTF-8 strings are buffered and processed correctly without byte truncation.
      const unicodeText = "Hello 🌍"; // WHAT: Defines a string containing an emoji. WHY: Provides a payload requiring proper multi-byte encoding handling.
      const encrypted = encrypt(unicodeText); // WHAT: Encrypts the Unicode string. WHY: Tests the cipher's ability to handle non-ASCII byte sequences.
      const decrypted = decrypt(encrypted); // WHAT: Decrypts the ciphertext. WHY: Retrieves the string to verify Unicode preservation.
      expect(decrypted).toEqual(unicodeText); // WHAT: Asserts the decrypted string matches the Unicode input. WHY: Verifies that emojis and international text survive the encryption round-trip.
  });
});
