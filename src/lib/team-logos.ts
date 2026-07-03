/**
 * @fileoverview team-logos.ts
 * @module team-logos
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
// Imports React's createElement function to programmatically generate SVG elements without JSX.
import { createElement } from "react";
// Imports necessary TypeScript types from React to strongly type the functional components and their props.
import type { ComponentType, SVGProps } from "react";

// Defines a custom type alias for a React functional component that returns an SVG element and accepts standard SVG props.
type LogoIcon = ComponentType<SVGProps<SVGSVGElement>>;

// Defines a type representing a standard SVG path definition string.
type PathDef = { kind: "path"; d: string };
// Defines a type representing an SVG circle with its center coordinates (cx, cy) and radius (r).
type CircleDef = { kind: "circle"; cx: number; cy: number; r: number };
// Creates a union type that can be either a path or a circle, allowing mixed shape definitions.
type ShapeDef = PathDef | CircleDef;

// Defines a factory function that takes an array of shape definitions and returns a fully functional React component representing an icon.
const buildIcon = (shapes: ShapeDef[]): LogoIcon => {
  // Defines the actual icon component that accepts standard SVG props (like className, fill, etc.).
  const Icon: LogoIcon = (props) =>
    createElement(
      "svg",
      // Merges default hardcoded SVG attributes (viewBox, stroke properties) with any dynamically passed props.
      {
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        ...props,
      },
      // Iterates over the provided shape definitions to render the internal children of the SVG.
      shapes.map((shape, index) => {
        // Checks if the current shape definition is meant to be a circle.
        if (shape.kind === "circle") {
          // Creates and returns a <circle> element with the mapped properties and a unique key based on its index.
          return createElement("circle", { key: index, cx: shape.cx, cy: shape.cy, r: shape.r });
        }
        // Otherwise, creates and returns a <path> element utilizing the provided 'd' attribute string.
        return createElement("path", { key: index, d: shape.d });
      })
    );
  // Returns the constructed functional component.
  return Icon;
};

const EMBLEM_SET: LogoIcon[] = [
  buildIcon([{ kind: "path", d: "M12 2.8l2.2 4.6L19 9.6l-4.8 2.2L12 16.4l-2.2-4.6L5 9.6l4.8-2.2L12 2.8z" }, { kind: "circle", cx: 12, cy: 12, r: 1.6 }]),
  buildIcon([{ kind: "path", d: "M3 15.5c4-1.2 7-4.3 9-9 2 4.7 5 7.8 9 9" }, { kind: "path", d: "M5 19c3.4-.7 5.8-2.6 7-5.7 1.2 3.1 3.6 5 7 5.7" }, { kind: "path", d: "M12 5v14" }]),
  buildIcon([{ kind: "circle", cx: 12, cy: 12, r: 3.2 }, { kind: "path", d: "M4.5 12c2.1-3.3 5-5 7.5-5s5.4 1.7 7.5 5c-2.1 3.3-5 5-7.5 5s-5.4-1.7-7.5-5z" }, { kind: "path", d: "M12 4.5c3.3 2.1 5 5 5 7.5s-1.7 5.4-5 7.5c-3.3-2.1-5-5-5-7.5s1.7-5.4 5-7.5z" }]),
  buildIcon([{ kind: "path", d: "M12 3l7 4.2V12c0 5-3.1 7.6-7 9-3.9-1.4-7-4-7-9V7.2L12 3z" }, { kind: "path", d: "M9 12l2 2 4-4" }]),
  buildIcon([{ kind: "path", d: "M3 12c2.3-2.3 4.6-3.5 7-3.5S14.7 9.7 17 12c-2.3 2.3-4.6 3.5-7 3.5S5.3 14.3 3 12z" }, { kind: "path", d: "M18 7a9.5 9.5 0 010 10" }, { kind: "path", d: "M6 7a9.5 9.5 0 000 10" }, { kind: "circle", cx: 10, cy: 12, r: 1.2 }]),
  buildIcon([{ kind: "path", d: "M12 2l2.4 4.7L20 9l-3.8 3 1.1 5-5.3-2.5L6.7 17l1.1-5L4 9l5.6-2.3L12 2z" }, { kind: "path", d: "M12 8v8" }, { kind: "path", d: "M8 12h8" }]),
  buildIcon([{ kind: "path", d: "M2.5 12h4l2-3.2L11 16l2.2-4.1 1.3 2.1h7" }, { kind: "path", d: "M5 7.5A7.8 7.8 0 0112 4a7.8 7.8 0 017 3.5" }, { kind: "path", d: "M5 16.5A7.8 7.8 0 0012 20a7.8 7.8 0 007-3.5" }]),
  buildIcon([{ kind: "path", d: "M12 2l7 7-7 13L5 9l7-7z" }, { kind: "path", d: "M12 2v20" }, { kind: "path", d: "M5 9h14" }]),
  buildIcon([{ kind: "circle", cx: 8, cy: 9, r: 4 }, { kind: "circle", cx: 16, cy: 9, r: 4 }, { kind: "path", d: "M5.5 16.5L12 21l6.5-4.5" }]),
  buildIcon([{ kind: "path", d: "M12 3v18" }, { kind: "path", d: "M7 6l2.2 4.2L7 14" }, { kind: "path", d: "M17 6l-2.2 4.2L17 14" }, { kind: "path", d: "M9 21h6" }]),
  buildIcon([{ kind: "path", d: "M4 8c2-2.7 4.8-4 8-4s6 1.3 8 4" }, { kind: "path", d: "M4 16c2 2.7 4.8 4 8 4s6-1.3 8-4" }, { kind: "path", d: "M7.5 12c1.3-1.8 2.8-2.7 4.5-2.7s3.2.9 4.5 2.7c-1.3 1.8-2.8 2.7-4.5 2.7S8.8 13.8 7.5 12z" }]),
  buildIcon([{ kind: "path", d: "M12 2.8l8.3 4.8v8.8L12 21.2l-8.3-4.8V7.6L12 2.8z" }, { kind: "path", d: "M12 2.8v18.4" }, { kind: "path", d: "M3.7 7.6L12 12l8.3-4.4" }]),
];

// Defines a comprehensive union type representing every possible string ID that identifies a specific team logo.
export type TeamLogoId =
  | "rocket" | "shield" | "zap" | "globe" | "cpu" | "atom" | "anchor"
  | "binary" | "boxes" | "briefcase" | "bug" | "cloud" | "code"
  | "compass" | "container" | "database" | "diamond" | "eye"
  | "feather" | "file-code" | "filter" | "flame" | "flask"
  | "folder" | "gauge" | "gem" | "ghost" | "gift" | "grad"
  | "hdd" | "heart" | "infinity" | "key" | "laptop" | "layers"
  | "bulb" | "link" | "lock" | "map" | "megaphone" | "micro"
  | "music" | "palette" | "clip" | "phone" | "pie"
  | "puzzle" | "radio" | "search" | "send" | "settings" | "share"
  | "smile" | "star" | "target" | "terminal" | "trophy" | "users"
  | "video" | "wallet" | "wand" | "watch" | "wind" | "wrench";

// Defines the complete interface for a TeamLogo object, detailing all its necessary properties for rendering in the UI.
export interface TeamLogo {
  // Stores the unique identifier corresponding to the TeamLogoId union type.
  id: TeamLogoId;
  // Stores the actual React component reference representing the SVG icon.
  icon: LogoIcon;
  // Stores a human-readable, Title Cased label derived from the ID string.
  label: string;
  // Defines the foreground color hex code (used for the icon stroke or text).
  fgColor: string;
  // Defines the background color hex code (used for the wrapper container).
  bgColor: string;
  // Defines the border color hex code to complete the visual theme.
  borderColor: string;
}

const LEGACY_LOGO_IDS: TeamLogoId[] = [
  "rocket", "shield", "zap", "globe", "cpu", "atom", "anchor",
  "binary", "boxes", "briefcase", "bug", "cloud", "code",
  "compass", "container", "database", "diamond", "eye",
  "feather", "file-code", "filter", "flame", "flask",
  "folder", "gauge", "gem", "ghost", "gift", "grad",
  "hdd", "heart", "infinity", "key", "laptop", "layers",
  "bulb", "link", "lock", "map", "megaphone", "micro",
  "music", "palette", "clip", "phone", "pie",
  "puzzle", "radio", "search", "send", "settings", "share",
  "smile", "star", "target", "terminal", "trophy", "users",
  "video", "wallet", "wand", "watch", "wind", "wrench",
];

// Defines a helper function that takes a raw ID string (e.g. 'file-code') and converts it into a Title Cased label (e.g. 'File Code').
const toLabel = (id: TeamLogoId): string =>
  // Splits the ID by hyphens, capitalizes the first letter of each part, and joins them back together with spaces.
  id.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

// Defines a predefined array of harmonious color palettes to assign to logos dynamically.
const LOGO_PALETTES = [
  { fg: "#7C3AED", bg: "#EDE9FE", border: "#C4B5FD" },
  { fg: "#0891B2", bg: "#CFFAFE", border: "#67E8F9" },
  { fg: "#2563EB", bg: "#DBEAFE", border: "#93C5FD" },
  { fg: "#DB2777", bg: "#FCE7F3", border: "#F9A8D4" },
  { fg: "#DC2626", bg: "#FEE2E2", border: "#FCA5A5" },
  { fg: "#7C3AED", bg: "#E9D5FF", border: "#C4B5FD" },
  { fg: "#EA580C", bg: "#FFEDD5", border: "#FDBA74" },
  { fg: "#84CC16", bg: "#ECFCCB", border: "#BEF264" },
  { fg: "#0EA5E9", bg: "#E0F2FE", border: "#7DD3FC" },
  { fg: "#0F766E", bg: "#CCFBF1", border: "#5EEAD4" },
  { fg: "#4F46E5", bg: "#E0E7FF", border: "#A5B4FC" },
  { fg: "#D97706", bg: "#FEF3C7", border: "#FCD34D" },
] as const;

// Constructs and exports the final array containing every configured TeamLogo object by mapping over the legacy IDs.
export const TEAM_LOGOS: TeamLogo[] = LEGACY_LOGO_IDS.map((id, index) => ({
  // Assigns the specific string ID.
  id,
  // Cyclically assigns an SVG icon from the pre-generated EMBLEM_SET array based on the current index using modulo.
  icon: EMBLEM_SET[index % EMBLEM_SET.length],
  // Generates the human-readable label using the helper function.
  label: toLabel(id),
  // Cyclically assigns the foreground color from the palette array.
  fgColor: LOGO_PALETTES[index % LOGO_PALETTES.length].fg,
  // Cyclically assigns the background color from the palette array.
  bgColor: LOGO_PALETTES[index % LOGO_PALETTES.length].bg,
  // Cyclically assigns the border color from the palette array.
  borderColor: LOGO_PALETTES[index % LOGO_PALETTES.length].border,
}));

// Exports a utility function to retrieve a specific complete TeamLogo object by searching for its exact ID string.
export const getLogoById = (id: string): TeamLogo => {
  // Searches the array for a match, falling back to the very first logo in the array if the requested ID does not exist.
  return TEAM_LOGOS.find((logo) => logo.id === id) || TEAM_LOGOS[0];
};

// Exports a utility function that randomly selects and returns a logo ID from the entire available set.
export const getRandomLogoId = (): TeamLogoId => {
  // Calculates a random integer index spanning from 0 up to the maximum length of the TEAM_LOGOS array.
  const randomIndex = Math.floor(Math.random() * TEAM_LOGOS.length);
  // Returns the ID of the randomly selected logo.
  return TEAM_LOGOS[randomIndex].id;
};

// Exports a utility function that deterministically selects a logo ID based on an arbitrary input seed string (e.g. project name).
export const getDeterministicLogoId = (seed: string): TeamLogoId => {
  // Initializes a hash variable to store the computed numeric value of the seed string.
  let hash = 0;
  // Iterates through each character in the input string.
  for (let i = 0; i < seed.length; i++) {
    // Computes a bitwise hash to generate a semi-unique number based on the string's sequence of characters.
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Ensures the calculated hash maps to a valid positive index within the bounds of the TEAM_LOGOS array using modulo.
  const index = Math.abs(hash % TEAM_LOGOS.length);
  // Returns the consistently determined logo ID for the given seed string.
  return TEAM_LOGOS[index].id;
};
