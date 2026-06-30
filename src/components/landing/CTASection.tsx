/**
 * @fileoverview CTASection.tsx
 * @module CTASection
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
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ContributorTicket from '@/components/landing/ContributorTicket';
import { SimulatedCursor } from '@/components/landing/SimulatedCursor';
import { IsometricMatrix } from '@/components/landing/IsometricMatrix';

const CTASection = () => {
  const [cursorState, setCursorState] = useState<
    'floating' | 'approving' | 'clicking' | 'patrolling'
  >('floating');
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    if (cursorState === 'approving') {
      const arriveTimer = setTimeout(() => {
        setCursorState('clicking');
      }, 1500);
      return () => clearTimeout(arriveTimer);
    }

    if (cursorState === 'clicking') {
      setIsApproved(true);
      const flyAwayTimer = setTimeout(() => {
        setCursorState('patrolling');
      }, 600);
      return () => clearTimeout(flyAwayTimer);
    }
  }, [cursorState]);

  return (
    <section
      id="cta"
      className="py-20 md:py-32 relative overflow-hidden bg-background border-t border-black/5 dark:border-white/5"
    >
      {/* Isometric Architectural Matrix */}
      <IsometricMatrix />

      <div className="container mx-auto px-4 relative z-10 flex flex-col items-center">
        {/* Massive Typography */}
        <div className="mb-12 md:mb-16 text-center px-4">
          <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter text-foreground mb-4 md:mb-6 uppercase leading-[1.1]">
            The Codebase <br />
            is <span className="text-foreground/50">open.</span>
          </h2>
        </div>

        {/* The Ticket & Cursors Stage */}
        <div className="relative w-full max-w-3xl mx-auto flex justify-center items-center py-10">
          {/* 
            =========================================
            CURSOR 1: prem22k (Top Left)
            =========================================
            To reposition this cursor manually, adjust the CSS coordinates below:
            - floating: The idle position before a user types their github name.
            - approving/clicking: Where the cursor flies to 'click' the card (keep these identical!).
            - patrolling: Where the cursor escapes to after clicking so it doesn't block the screen.
          */}
          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: {
                opacity: 0,
                scale: 0.2,
                left: '10%',
                top: '20%',
              },
              approving: {
                opacity: 1,
                left: '25%',
                top: '40%',
                y: 0,
                x: 0,
                scale: 1.1,
                transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] },
              },
              clicking: {
                opacity: 1,
                left: '25%',
                top: '40%',
                y: 0,
                x: 0,
                scale: 0.9,
                transition: { duration: 0.3, ease: 'easeInOut' },
              },
              patrolling: {
                opacity: 0,
                scale: 0.2,
                left: '-15%',
                top: '10%',
                transition: { duration: 1.2, ease: 'easeInOut' },
              },
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="prem22k"
              color="hsl(var(--task-green))"
              isClicking={cursorState === 'clicking'}
            />
          </motion.div>

          {/* 
            =========================================
            CURSOR 2: chitkullakshya (Top Right)
            =========================================
          */}
          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: {
                opacity: 0,
                scale: 0.2,
                right: '15%',
                top: '25%',
              },
              approving: {
                opacity: 1,
                right: '25%',
                top: '45%',
                y: 0,
                x: 0,
                scale: 1.1,
                transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 },
              },
              clicking: {
                opacity: 1,
                right: '25%',
                top: '45%',
                y: 0,
                x: 0,
                scale: 0.9,
                transition: { duration: 0.3, ease: 'easeInOut' },
              },
              patrolling: {
                opacity: 0,
                scale: 0.2,
                right: '0%',
                top: '55%',
                transition: { duration: 1.2, ease: 'easeInOut', delay: 0.15 },
              },
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="chitkullakshya"
              color="hsl(var(--primary))"
              isClicking={cursorState === 'clicking'}
            />
          </motion.div>

          {/* 
            =========================================
            CURSOR 3: eesha264 (Bottom Left)
            =========================================
          */}
          <motion.div
            className="absolute z-50 pointer-events-none hidden md:block"
            variants={{
              floating: {
                opacity: 0,
                scale: 0.2,
                left: '25%',
                bottom: '10%',
              },
              approving: {
                opacity: 1,
                left: '40%',
                bottom: '10%',
                y: 0,
                x: 0,
                scale: 1.1,
                transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 },
              },
              clicking: {
                opacity: 1,
                left: '40%',
                bottom: '10%',
                y: 0,
                x: 0,
                scale: 0.9,
                transition: { duration: 0.3, ease: 'easeInOut' },
              },
              patrolling: {
                opacity: 0,
                scale: 0.2,
                right: '10%',
                bottom: '30%',
                transition: { duration: 1.2, ease: 'easeInOut', delay: 0.3 },
              },
            }}
            initial="floating"
            animate={cursorState}
          >
            <SimulatedCursor
              x={0}
              y={0}
              name="eesha264"
              color="hsl(var(--task-purple))"
              isClicking={cursorState === 'clicking'}
            />
          </motion.div>

          {/* The Holographic Ticket */}
          <ContributorTicket onMint={() => setCursorState('approving')} isApproved={isApproved} />
        </div>
      </div>
    </section>
  );
};

export default CTASection;
