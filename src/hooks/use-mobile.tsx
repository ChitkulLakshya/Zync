/**
 * @fileoverview use-mobile.tsx
 * @module use-mobile
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
 * @author Chitkul Lakshya <chitkullakshya@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
import * as React from "react"; // Imports all React library components and assigns them to the 'React' namespace so they can be used in this file.
const MOBILE_BREAKPOINT = 768; // Defines a constant variable 'MOBILE_BREAKPOINT' and assigns it the value 768, which represents the maximum width in pixels for a mobile device.

export function useIsMobile() { // Defines and exports a custom React hook function named 'useIsMobile' that can be used in other components to determine if the device is mobile.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined); // Initializes a state variable 'isMobile' with an initial value of 'undefined' using the 'useState' hook, and a function 'setIsMobile' to update this state, so the component can track whether the device is mobile or not.
  React.useEffect(() => { // Uses the 'useEffect' hook to execute a side effect function after the component has rendered, which is necessary for setting up event listeners and handling changes in the device's width.
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`); // Creates a media query list object 'mql' using the 'matchMedia' method, which monitors the device's width and triggers a change event when it crosses the specified threshold, so the component can respond to changes in the device's width.
    const onChange = () => { // Defines a callback function 'onChange' that will be executed when the media query list object 'mql' detects a change in the device's width.
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); // Updates the 'isMobile' state variable by calling 'setIsMobile' with a boolean value indicating whether the device's width is less than the 'MOBILE_BREAKPOINT', so the component can update its state accordingly.
    };
    mql.addEventListener("change", onChange); // Adds an event listener to the media query list object 'mql' that listens for 'change' events and executes the 'onChange' callback function when triggered, so the component can respond to changes in the device's width.
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); // Initializes the 'isMobile' state variable by calling 'setIsMobile' with a boolean value indicating whether the device's width is less than the 'MOBILE_BREAKPOINT', so the component has an initial state.
    return () => mql.removeEventListener("change", onChange); // Returns a cleanup function that removes the event listener from the media query list object 'mql' when the component is unmounted, which is necessary for preventing memory leaks and ensuring the component can be safely removed from the DOM.
  }, []); // Passes an empty dependency array to the 'useEffect' hook, which means the side effect function will only be executed once when the component mounts, and not on subsequent renders.
  return !!isMobile; // Returns the boolean value of the 'isMobile' state variable, which indicates whether the device is mobile or not, so the component can use this value to make decisions about its behavior.
}