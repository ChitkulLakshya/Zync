/**
 * @fileoverview cloudinaryService.js
 * @module cloudinaryService
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
/**
 * EDUCATIONAL COMMENT: What and Why
 * What: This service integrates with Cloudinary for managing media assets, such as uploading profile photos and extracting public IDs from URLs for asset deletion.
 * Why: Abstracting Cloudinary logic into a dedicated service allows centralized configuration and reusable methods across the backend, keeping route handlers clean and focused on HTTP concerns.
 */
// WHAT: Import the Cloudinary SDK v2. WHY: Required to interact with Cloudinary's API.
const cloudinary = require('cloudinary').v2;


// WHAT: Configure Cloudinary with environment variables. WHY: Authenticates our backend.
cloudinary.config({
  // WHAT: Set the cloud name. WHY: Identifies the specific Cloudinary account.
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  // WHAT: Set the API key. WHY: Required for identifying the caller.
  api_key: process.env.CLOUDINARY_API_KEY,
  // WHAT: Set the API secret. WHY: Acts as a password for authenticated requests.
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extracts the public_id from a Cloudinary URL.
 * @param {string} url - The Cloudinary image URL.
 * @returns {string|null} - The public_id or null if not found.
 */
// WHAT: Define a function to parse Cloudinary URLs. WHY: We need the public_id for deletions.
const extractPublicId = (url) => {
  // WHAT: Check if URL is valid. WHY: Prevents processing invalid URLs.
  if (!url || !url.includes('cloudinary.com')) return null;

  // WHAT: Use a try-catch block. WHY: Safeguards against unexpected URL formats.
  try {

    // WHAT: Split the URL. WHY: Isolates path components.
    const parts = url.split('/');
    // WHAT: Find 'upload'. WHY: public_id is after this segment.
    const uploadIndex = parts.indexOf('upload');
    // WHAT: Return null if not found. WHY: Indicates unparseable structure.
    if (uploadIndex === -1) return null;


    // WHAT: Start parsing after 'upload'. WHY: public_id begins here.
    let startIndex = uploadIndex + 1;
    if (
      parts[startIndex].startsWith('v') &&
      !isNaN(parts[startIndex].substring(1))
    ) {
      startIndex++;
    }


    // WHAT: Rejoin remaining parts. WHY: public_id might contain folders.
    const pathWithExt = parts.slice(startIndex).join('/');

    // WHAT: Find the last period. WHY: To identify the file extension.
    const lastDotIndex = pathWithExt.lastIndexOf('.');
    // WHAT: Return string without extension. WHY: public_id doesn't include extension.
    return lastDotIndex !== -1
      ? pathWithExt.substring(0, lastDotIndex)
      : pathWithExt;
  } catch (error) {
    // WHAT: Catch parsing errors. WHY: Handles unexpected crashes gracefully.
    console.error('Failed to extract public_id from URL:', error);
    return null;
  }
};

/**
 * Deletes an asset from Cloudinary using its URL.
 * @param {string} url - The Cloudinary image URL.
 * @returns {Promise<any>} - Cloudinary deletion result.
 */
// WHAT: Async function to delete asset. WHY: Needed to remove files from Cloudinary.
const deleteCloudinaryAsset = async (url) => {
  // WHAT: Extract public_id. WHY: Cloudinary destroy API requires it.
  const publicId = extractPublicId(url);
  // WHAT: Return null if no public_id. WHY: Prevents invalid requests.
  if (!publicId) return null;

  try {
    // WHAT: Log deletion. WHY: Provides visibility into operations.
    console.log(`Deleting Cloudinary asset: ${publicId}`);
    // WHAT: Call destroy method. WHY: Instructs Cloudinary to delete the asset.
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary deletion failed:', error);
    throw error;
  }
};

/**
 * Uploads a profile photo to Cloudinary with a unique ID.
 * @param {string} filePath - Path to the local temp file.
 * @param {string} uid - User UID.
 * @returns {Promise<any>} - Cloudinary upload result.
 */
// WHAT: Async function to upload photo. WHY: Facilitates avatar updates.
const uploadProfilePhoto = async (filePath, uid) => {
  try {

    // WHAT: Generate unique public_id. WHY: Prevents overwriting and ensures cache invalidation.
    const publicId = `profile_${uid}_${Date.now()}`;

    // WHAT: Call upload method. WHY: Uploads file to Cloudinary.
    return await cloudinary.uploader.upload(filePath, {
      // WHAT: Specify folder. WHY: Organizes uploads in Cloudinary.
      folder: 'zync-profiles',
      public_id: publicId,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      ],
    });
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
};

// WHAT: Export utilities. WHY: Makes functions available to other files.
module.exports = {
  cloudinary,
  extractPublicId,
  deleteCloudinaryAsset,
  uploadProfilePhoto,
};
