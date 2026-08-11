/**
 * @fileoverview SimulatedCursor.tsx
 * @module SimulatedCursor
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
import { motion } from "framer-motion";
import { MousePointer2 } from "lucide-react";

interface SimulatedCursorProps {
  x: number | string;
  y: number | string;
  isClicking?: boolean;
  name?: string;
  color?: string;
}

export const SimulatedCursor = ({ x, y, isClicking = false, name, color }: SimulatedCursorProps) => {
  return (
    <motion.div
      className="absolute z-50 pointer-events-none flex flex-col"
      initial={{ left: "50%", top: "50%", opacity: 0 }}
      animate={{ left: x, top: y, opacity: 1, scale: isClicking ? 0.9 : 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 28,
        mass: 0.5,
      }}
    >
      <div className="relative flex items-start">
        {/* Pointer Arrow */}
        <MousePointer2 
          className="w-7 h-7 -rotate-12 absolute -left-2 -top-2 drop-shadow-lg z-10" 
          style={{ 
            color: color || "hsl(var(--foreground))", 
            fill: color || "hsl(var(--foreground))" 
          }} 
        />
        
        {/* Feature Tag (Liquid Glass) */}
        {name && (
          <motion.div 
            className="ml-6 mt-4 px-5 py-2 rounded-full bg-surface-glass-regular backdrop-blur-thick border border-black/10 dark:border-white/10 shadow-lg flex items-center gap-2.5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Tiny Accent Dot */}
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: color || "hsl(var(--primary))", boxShadow: `0 0 8px ${color}80` }} 
            />
            {/* Text */}
            <span className="font-mono text-xs uppercase font-bold tracking-widest text-foreground whitespace-nowrap opacity-90">
              {name}
            </span>
          </motion.div>
        )}
      </div>
      {/* Click ripple effect */}
      {isClicking && (
        <motion.div
          className="absolute top-1 left-1 w-5 h-5 rounded-full -z-10 blur-[1px]"
          style={{ backgroundColor: color || "hsl(var(--primary))" }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      )}
    </motion.div>
  );
};
