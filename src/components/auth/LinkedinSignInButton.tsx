/**
 * @fileoverview LinkedinSignInButton.tsx
 * @module LinkedinSignInButton
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
import { useState } from "react"; // Imports the 'useState' hook from the React library, which allows functional components to manage state. This is needed to track the loading state of the button.
import { Button } from "@/components/ui/button"; // Imports the 'Button' component from a local UI library, providing a pre-styled and functional button element. This is used to render the interactive LinkedIn sign-in button.
import { Auth } from "firebase/auth"; // Imports the 'Auth' type from the Firebase authentication library, used for type-checking the authentication object. This ensures type safety for the 'auth' prop if it were used directly in the component.
import { API_BASE_URL } from "@/lib/utils"; // Imports the 'API_BASE_URL' constant from a local utility file, which holds the base URL for API requests. This is necessary to construct the full URL for the LinkedIn authentication endpoint.

interface LinkedinSignInButtonProps { // Declares a TypeScript interface named 'LinkedinSignInButtonProps', defining the expected types for the props passed to the component. This provides type safety and clarity for the component's input properties.
  auth: Auth; // Defines a property 'auth' of type 'Auth' (from Firebase) within the interface. This prop would typically be used to interact with Firebase authentication, though it's not directly used in the current component logic.
  disabled?: boolean; // Defines an optional property 'disabled' of type 'boolean' within the interface. This prop allows the parent component to control whether the button is interactive or not.
}

export const LinkedinSignInButton = ({ disabled }: LinkedinSignInButtonProps) => { // Exports a functional React component named 'LinkedinSignInButton', which accepts props destructured to extract 'disabled' and is type-annotated with 'LinkedinSignInButtonProps'. This makes the component available for use in other parts of the application and allows it to receive a 'disabled' state from its parent.
  const [isLoading, setIsLoading] = useState(false); // Declares a state variable 'isLoading' and its setter function 'setIsLoading' using the 'useState' hook, initialized to 'false'. This state is used to track whether the LinkedIn login process is currently in progress, allowing the UI to show a loading indicator.

  const handleLinkedinLogin = () => { // Defines an arrow function named 'handleLinkedinLogin', which will be executed when the button is clicked. This function encapsulates the logic for initiating the LinkedIn login flow.
    setIsLoading(true); // Updates the 'isLoading' state to 'true' using its setter function. This immediately shows a loading indicator on the button, providing visual feedback to the user that an action has been initiated.
    window.location.href = `${API_BASE_URL}/api/linkedin/auth`; // Navigates the browser to a new URL by setting 'window.location.href'. This redirects the user to the backend's LinkedIn authentication endpoint, initiating the OAuth flow.
  }; // Closes the 'handleLinkedinLogin' function definition.

  return ( // Returns the JSX (JavaScript XML) structure that defines the component's UI. This is what React will render to the DOM.
    <Button // Renders the imported 'Button' component. This provides the base styling and functionality for the interactive element.
      variant="outline" // Sets the 'variant' prop of the Button component to "outline". This applies a specific visual style (e.g., a button with a border but no solid background) defined by the UI library.
      onClick={handleLinkedinLogin} // Assigns the 'handleLinkedinLogin' function to the 'onClick' event handler of the Button. This ensures that the login process starts when the button is clicked.
      disabled={isLoading || disabled} // Sets the 'disabled' prop of the Button. The button will be disabled if 'isLoading' is true (during login) OR if the 'disabled' prop passed from the parent is true, preventing multiple clicks or interaction when not allowed.
      className="w-full flex items-center justify-center gap-2 rounded-xl h-12 bg-secondary/20 border-border/10 hover:bg-secondary/40 hover:text-foreground transition-all duration-300 shadow-sm" // Applies a string of Tailwind CSS classes to style the button. These classes control its width, layout, alignment, spacing, border-radius, height, background color, border, hover effects, transition, and shadow, ensuring it matches the application's design system.
    >
      {isLoading ? ( // Conditionally renders content based on the 'isLoading' state variable. If 'isLoading' is true, the loading spinner SVG is displayed.
        <svg // Renders an SVG (Scalable Vector Graphics) element, which is used to display a vector-based icon. This specific SVG represents a loading spinner.
          xmlns="http://www.w3.org/2000/svg" // Sets the XML namespace for the SVG, indicating it's a standard SVG element. This is required for proper SVG rendering.
          viewBox="0 0 24 24" // Defines the internal coordinate system and dimensions of the SVG. This allows the SVG content to scale appropriately within its container.
          fill="currentColor" // Sets the fill color of the SVG paths to the current text color. This makes the icon's color inherit from its parent's text color, allowing for easy theming.
          className="w-5 h-5 mr-1 animate-pulse text-[#0077B5] dark:text-foreground" // Applies Tailwind CSS classes to style the SVG icon. These classes control its width, height, right margin, apply a pulsing animation, and set specific colors for light and dark modes, indicating a loading state.
        >
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /> {/* Defines the path data for the SVG icon, which draws the shape of the LinkedIn logo. This is the actual visual representation of the icon. */}
        </svg> // Closes the SVG element.
      ) : ( // If 'isLoading' is false, the standard LinkedIn icon SVG is displayed.
        <svg // Renders an SVG (Scalable Vector Graphics) element, which is used to display a vector-based icon. This specific SVG represents the LinkedIn logo.
          xmlns="http://www.w3.org/2000/svg" // Sets the XML namespace for the SVG, indicating it's a standard SVG element. This is required for proper SVG rendering.
          viewBox="0 0 24 24" // Defines the internal coordinate system and dimensions of the SVG. This allows the SVG content to scale appropriately within its container.
          fill="currentColor" // Sets the fill color of the SVG paths to the current text color. This makes the icon's color inherit from its parent's text color, allowing for easy theming.
          className="w-5 h-5 mr-1 text-[#0077B5] dark:text-foreground" // Applies Tailwind CSS classes to style the SVG icon. These classes control its width, height, right margin, and set specific colors for light and dark modes, ensuring it matches the application's design.
        >
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /> {/* Defines the path data for the SVG icon, which draws the shape of the LinkedIn logo. This is the actual visual representation of the icon. */}
        </svg> // Closes the SVG element.
      )}
      LinkedIn {/* Renders the text "LinkedIn" next to the icon inside the button. This provides a clear label for the button's action. */}
    </Button>
  ); // Closes the return statement for the component's JSX.
}; // Closes the 'LinkedinSignInButton' functional component definition.