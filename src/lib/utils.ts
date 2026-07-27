/**
 * @fileoverview utils.ts
 * @module utils
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
 * @license Proprietary and Confidential
 * ============================================================================
 */
// Imports the clsx utility which conditionally joins CSS class names together efficiently.
import { clsx, type ClassValue } from "clsx";
// Imports twMerge to intelligently merge Tailwind CSS classes and resolve styling conflicts (e.g., if 'p-2' and 'p-4' are both passed, it keeps 'p-4').
import { twMerge } from "tailwind-merge";

// Exports the base URL for backend API requests, determining the correct URL based on whether the app is in development mode or production.
export const API_BASE_URL = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL || "");
// Exports the base URL for the Socket.IO server, prioritizing explicit socket URLs, falling back to the API URL, and defaulting to localhost during development.
export const SOCKET_BASE_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.DEV ? "http://localhost:5000" : (import.meta.env.VITE_API_URL || ""));

// Defines and exports the 'cn' (class name) utility function, widely used in modern React apps to cleanly combine conditional Tailwind classes without conflicts.
export function cn(...inputs: ClassValue[]) {
  // First runs the inputs through clsx to handle conditionals/objects, then passes the result to twMerge to resolve any Tailwind specific conflicts.
  return twMerge(clsx(inputs));
}

// Defines a utility to construct absolute URLs for resources (like images) that might only have relative paths stored in the database.
export function getFullUrl(path: string | undefined | null) {
  // Returns an empty string if no valid path was provided, preventing undefined reference errors.
  if (!path) {return '';}
  // Immediately returns the original path if it is already a fully qualified external URL or a local blob URL.
  if (path.startsWith('http') || path.startsWith('blob:')) {return path;}
  // Constructs and returns the full absolute URL by prepending the API_BASE_URL to the relative path, ensuring a proper forward slash separator.
  return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Prefer backend user when it has a real uid; otherwise use Firebase user.
 * Avoids treating `{}` or stale cache as valid (which made the UI show "User").
 */
// Exports a utility to determine which user data object to display in the UI when conflicting sources exist (Firebase vs backend DB).
export function pickUserForDisplay(userData: any, firebaseUser: any | null | undefined) {
  // Checks if the backend userData is a valid object containing a 'uid', indicating it's fully populated and trustworthy.
  if (userData && typeof userData === "object" && userData.uid) {
    // Prioritizes returning the backend user data as it likely contains custom profile fields not present in Firebase.
    return userData;
  }
  // Falls back to returning the Firebase user object, or explicitly null if both are missing.
  return firebaseUser ?? null;
}

// Exports a robust utility function to extract a human-readable display name from a user object regardless of its shape or origin.
export function getUserName(user: any) {
  // Returns a generic "User" fallback if the user object is missing entirely.
  if (!user) {return "User";}
  // Attempts multiple properties in descending order of preference: displayName, combination of first/last, explicitly 'name', or the first half of their email.
  return user.displayName ||
    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
    user.name ||
    user.email?.split('@')[0] ||
    "User"; // Final fallback to "User" if none of the above are present.
}

// Exports a utility to extract two uppercase initials from a user's profile for display in fallback avatars.
export function getUserInitials(user: any) {
  // Calls the getUserName utility to extract the best available display name first.
  const name = getUserName(user);
  // If the extracted name is just the fallback "User" but we have an email address available, use the email to generate initials instead.
  if (name === "User" && user?.email) {
    // Extracts the first two characters of the email and converts them to uppercase.
    return user.email.substring(0, 2).toUpperCase();
  }
  // Otherwise, extracts the first two characters of the determined display name and converts them to uppercase.
  return name.substring(0, 2).toUpperCase();
}
