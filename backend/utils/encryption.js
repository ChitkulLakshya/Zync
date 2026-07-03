/**
 * @fileoverview encryption.js
 * @module encryption
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
const crypto = require('crypto'); // WHAT: Imports the built-in Node.js crypto module. WHY: Needed to perform cryptographic operations like encryption and decryption.

const ALGORITHM = 'aes-256-cbc'; // WHAT: Defines the encryption algorithm. WHY: AES-256-CBC is a standard, secure symmetric encryption algorithm.
const ENCODING = 'hex'; // WHAT: Defines the character encoding for the cipher text. WHY: Hex is commonly used to represent binary data as a readable string.
const IV_LENGTH = 16; // WHAT: Sets the Initialization Vector length to 16 bytes. WHY: AES block size is 128 bits (16 bytes), requiring a 16-byte IV.
const KEY = process.env.MASTER_ENCRYPTION_KEY || '12345678901234567890123456789012'; // WHAT: Retrieves the encryption key from environment or falls back to a default. WHY: Secures the application data, fallback is for development if env is not set.

const encrypt = (text) => { // WHAT: Defines an encryption function. WHY: To provide a reusable utility for encrypting sensitive strings.
  if (!text) return null; // WHAT: Checks if the input text is falsy. WHY: Avoids errors when attempting to encrypt empty or null values.
  const iv = crypto.randomBytes(IV_LENGTH); // WHAT: Generates a random Initialization Vector. WHY: Ensures that encrypting the same text multiple times yields different ciphertexts for security.
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY), iv); // WHAT: Creates a cipher instance with algorithm, key, and IV. WHY: Prepares the crypto module to perform the encryption.
  let encrypted = cipher.update(text); // WHAT: Encrypts the provided text. WHY: Processes the input data into encrypted binary data.
  encrypted = Buffer.concat([encrypted, cipher.final()]); // WHAT: Finalizes the encryption and concatenates any remaining data. WHY: Required to ensure all blocks are padded and encrypted completely.
  return iv.toString(ENCODING) + ':' + encrypted.toString(ENCODING); // WHAT: Returns the IV and encrypted text joined by a colon. WHY: The IV must be stored alongside the ciphertext to enable decryption later.
};

const decrypt = (text) => { // WHAT: Defines a decryption function. WHY: To provide a reusable utility for decrypting previously encrypted strings.
  if (!text) return null; // WHAT: Checks if the input text is falsy. WHY: Prevents errors if there is no data to decrypt.
  const textParts = text.split(':'); // WHAT: Splits the input string by the colon delimiter. WHY: Separates the IV from the actual encrypted data.
  const iv = Buffer.from(textParts.shift(), ENCODING); // WHAT: Extracts the IV from the first part and converts it back to a Buffer. WHY: The decipher requires the exact same IV used during encryption.
  const encryptedText = Buffer.from(textParts.join(':'), ENCODING); // WHAT: Reconstructs the ciphertext and converts it to a Buffer. WHY: Prepares the encrypted data for the deciphering process.
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY), iv); // WHAT: Creates a decipher instance with the algorithm, key, and extracted IV. WHY: Prepares the crypto module for reversing the encryption.
  let decrypted = decipher.update(encryptedText); // WHAT: Decrypts the ciphertext. WHY: Transforms the encrypted binary data back into the original format.
  decrypted = Buffer.concat([decrypted, decipher.final()]); // WHAT: Finalizes the decryption process. WHY: Ensures any padding is correctly handled and all data is outputted.
  return decrypted.toString(); // WHAT: Converts the decrypted buffer to a string. WHY: Returns the original plaintext to the caller.
};

module.exports = { encrypt, decrypt }; // WHAT: Exports the encrypt and decrypt functions. WHY: Makes these utility functions available to other modules in the application.
