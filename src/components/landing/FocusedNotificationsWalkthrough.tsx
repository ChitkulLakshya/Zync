/**
 * @fileoverview FocusedNotificationsWalkthrough.tsx
 * @module FocusedNotificationsWalkthrough
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
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SimulatedCursor } from './SimulatedCursor';
import { Bell, CheckCircle2, User, FolderKanban } from 'lucide-react';

export const FocusedNotificationsWalkthrough = () => {
  const [step, setStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let active = true;
    const sequence = async () => {
      if (!active) {
        return;
      }
      setStep(0);
      await new Promise((r) => setTimeout(r, 1000));
      if (!active) {
        return;
      }
      setStep(1);
      await new Promise((r) => setTimeout(r, 800));
      if (!active) {
        return;
      }
      setStep(2);
      await new Promise((r) => setTimeout(r, 1500));
      if (!active) {
        return;
      }
      setStep(3);
      await new Promise((r) => setTimeout(r, 800));
      if (!active) {
        return;
      }
      setStep(4);
      await new Promise((r) => setTimeout(r, 3000));
      if (!active) {
        return;
      }
      sequence();
    };
    sequence();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] sm:aspect-[4/3] bg-background/50 backdrop-blur-md rounded-2xl sm:rounded-xl border border-border/10 overflow-hidden shadow-elevation3 mx-auto flex flex-col min-h-[300px] sm:min-h-0">
      {/* Top Navbar Simulation (Mirrors DesktopPreview header) */}
      <div className="h-10 border-b border-border/10 flex items-center justify-between px-3 bg-background/60 backdrop-blur-md relative z-20">
        <div className="w-16 h-2.5 bg-foreground/10 rounded" />

        <motion.div
          className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary/50 relative"
          animate={{ scale: step === 2 ? 0.9 : 1 }}
        >
          <Bell className="w-3.5 h-3.5" />
          {step < 4 && (
            <motion.div className="absolute top-1 right-1 w-1.5 h-1.5 bg-task-pink rounded-full border-[0.5px] border-background" />
          )}
        </motion.div>
      </div>

      <div className="flex-1 relative overflow-hidden bg-background/50">
        <div className="absolute inset-0 bg-gradient-to-tr from-task-pink/5 to-transparent pointer-events-none" />

        {/* Dropdown Menu */}
        <AnimatePresence>
          {step >= 2 && step < 4 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -5, transition: { duration: 0.15 } }}
              className="absolute top-2 right-2 w-52 sm:w-56 bg-surface-glass-regular backdrop-blur-regular rounded-xl border border-border/10 p-1.5 z-20"
              style={{
                boxShadow: 'var(--glass-bevel), var(--shadow-elevation3)',
                transformOrigin: 'top right',
              }}
            >
              <div className="px-2 py-1.5 mb-1 border-b border-border/10">
                <span className="text-[10px] font-semibold text-foreground/80">Notifications</span>
              </div>

              <motion.div
                className="p-2 flex gap-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                animate={{
                  backgroundColor:
                    step === 3 ? 'hsl(var(--primary) / 0.1)' : 'hsl(var(--primary) / 0.05)',
                }}
              >
                <div className="w-5 h-5 rounded-full bg-task-blue/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-2.5 h-2.5 text-task-blue" />
                </div>
                <div>
                  <p className="text-[9px] text-foreground/90 leading-tight">
                    <span className="font-semibold">Sarah</span> assigned you a new task:{' '}
                    <span className="font-medium">Update Hero Section</span>
                  </p>
                  <p className="text-[7px] text-muted-foreground mt-0.5">2 mins ago</p>
                </div>
              </motion.div>

              <div className="p-2 flex gap-2 rounded-lg opacity-60">
                <div className="w-5 h-5 rounded-full bg-task-green/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5 text-task-green" />
                </div>
                <div>
                  <p className="text-[9px] text-foreground/80 leading-tight">
                    <span className="font-semibold">Mike</span> completed{' '}
                    <span className="font-medium">API Integration</span>
                  </p>
                  <p className="text-[7px] text-muted-foreground mt-0.5">1 hour ago</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Task View (Mirrors TaskDetailDrawer SheetContent) */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute inset-y-0 right-0 w-[85%] sm:w-64 bg-background/90 backdrop-blur-xl border-l border-border/10 p-3 sm:p-4 z-10 flex flex-col gap-3 sm:gap-4 shadow-elevation3"
            >
              <div className="flex flex-col space-y-3">
                <div className="flex items-center">
                  <div className="bg-secondary text-[8px] font-medium px-2 py-0.5 rounded capitalize">
                    In Progress
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                    Update Hero Section
                  </h3>
                  <div className="flex items-center gap-1.5 text-[8px] text-muted-foreground">
                    <FolderKanban className="w-2.5 h-2.5" />
                    <span className="font-medium">Zync Studio</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span>Frontend</span>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border/10 w-full my-1" />

              <div className="space-y-1.5">
                <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <User className="w-2.5 h-2.5" /> Assigned To
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                    ME
                  </div>
                  <span className="text-[10px] font-medium text-foreground">Me</span>
                </div>
              </div>

              <div className="space-y-1.5 mt-2">
                <span className="text-[7px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Description
                </span>
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-foreground/10 rounded" />
                  <div className="w-[85%] h-1.5 bg-foreground/10 rounded" />
                  <div className="w-[60%] h-1.5 bg-foreground/10 rounded" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Simulated Cursor */}
      {(() => {
        const cursorPos =
          step === 0
            ? { x: '50%', y: '60%' }
            : step === 1
              ? { x: '95%', y: '10%' }
              : step === 2
                ? { x: '95%', y: '10%' }
                : step === 3
                  ? { x: isMobile ? '80%' : '75%', y: '40%' }
                  : step === 4
                    ? { x: isMobile ? '80%' : '75%', y: '40%' }
                    : { x: '50%', y: '60%' };
        return (
          <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={step === 2 || step === 4} />
        );
      })()}
    </div>
  );
};
