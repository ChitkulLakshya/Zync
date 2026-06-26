/**
 * @fileoverview Index.tsx
 * @module Index
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
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import MobileAppSection from "@/components/landing/MobileAppSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  // What: State to manage the initialization phases ("loading", "snapping", "done").
  // Why: Gives us fine-grained control over the loading animation sequence.
  const [phase, setPhase] = useState<"loading" | "snapping" | "done">("loading");

  // What: Effect hook that runs once on component mount to trigger phase transitions.
  // Why: We need to transition from "loading" to "snapping", then finally to "done" using timed intervals to orchestrate the animation.
  useEffect(() => {

    // What: First timer transitions state to "snapping" after 1200ms.
    // Why: Creates a brief delay before the initial animation snap effect begins.
    const timer1 = setTimeout(() => {
      setPhase("snapping");
    }, 1200);


    // What: Second timer completes the loading sequence by setting state to "done" after 1500ms.
    // Why: Ensures the snapping animation has time to run before we reveal the main page content.
    const timer2 = setTimeout(() => {
      setPhase("done");
    }, 1500);

    // What: Cleanup function for our timeouts.
    // Why: If the component unmounts before timeouts fire, clearing them prevents memory leaks and state updates on unmounted components.
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/10">
      <AnimatePresence mode="wait">
        {phase !== "done" ? (
          <motion.div
            key="loader"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
            exit={{ opacity: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
          >
            <motion.div
              initial={{ opacity: 0.5, scale: 1, filter: "blur(0px)" }}
              animate={
                phase === "loading" 
                  ? { opacity: [0.5, 0.9, 0.5] } 
                  : { scale: 0.95, opacity: 0, filter: "blur(8px)" }
              }
              transition={
                phase === "loading"
                  ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  : { type: "spring", stiffness: 400, damping: 25, opacity: { duration: 0.2 }, filter: { duration: 0.2 } }
              }
              className={`text-2xl sm:text-3xl font-semibold tracking-tight transition-colors duration-150 ${
                phase === "loading" ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              Zync
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            className="min-h-screen flex flex-col"
          >
            <Navbar />
            <main>
              <HeroSection />
              <FeaturesSection />
              <MobileAppSection />
              <CTASection />
            </main>
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
