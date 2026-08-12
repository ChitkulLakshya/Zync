/**
 * @fileoverview BuiltinChatWalkthrough.tsx
 * @module BuiltinChatWalkthrough
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
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { SimulatedCursor } from './SimulatedCursor';
import { Paperclip, Send, Smile, CheckCheck } from 'lucide-react';

export const BuiltinChatWalkthrough = () => {
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
      await new Promise((r) => setTimeout(r, 2000));
      if (!active) {
        return;
      }
      setStep(3);
      await new Promise((r) => setTimeout(r, 600));
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

  const textToType = 'The new design looks amazing! 🚀';

  return (
    <div className="relative w-full max-w-sm aspect-[4/3] sm:aspect-[4/3] bg-surface-glass-regular backdrop-blur-regular border border-border/10 rounded-2xl sm:rounded-xl overflow-hidden shadow-elevation3 mx-auto flex flex-col min-h-[300px] sm:min-h-0">
      {/* Header (Mirrors ChatView Avatar & Status) */}
      <div className="flex items-center gap-2 p-3 border-b border-border/10 bg-secondary/30 relative z-10">
        <div className="relative">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
            SC
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-background bg-task-green" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] sm:text-[10px] font-semibold text-foreground leading-tight">
            Sarah Chen
          </span>
          <span className="text-[9px] sm:text-[8px] text-muted-foreground leading-tight">
            online
          </span>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 p-3 space-y-3 relative overflow-hidden bg-background/50 flex flex-col justify-end pb-12">
        <div className="absolute inset-0 bg-gradient-to-tr from-task-teal/5 to-transparent pointer-events-none" />

        {/* Received Message */}
        <div className="flex gap-2 justify-start relative z-10">
          <div className="w-5 h-5 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-[7px] font-bold text-foreground mt-auto">
            SC
          </div>
          <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-bl-sm px-2.5 py-1.5 max-w-[85%] sm:max-w-[75%] shadow-sm">
            <p className="text-[9px] sm:text-[8px] leading-relaxed">
              Hey! Did you check the mockups for the landing page?
            </p>
            <div className="text-[7px] sm:text-[6px] text-muted-foreground mt-0.5 text-right">
              10:42 AM
            </div>
          </div>
        </div>

        {/* New Message Bubble */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-2 justify-end relative z-10"
            >
              <div className="bg-foreground text-background rounded-2xl rounded-br-sm px-2.5 py-1.5 max-w-[85%] sm:max-w-[75%] shadow-sm">
                <p className="text-[9px] sm:text-[8px] font-medium leading-relaxed">{textToType}</p>
                <div className="text-[7px] sm:text-[6px] text-background/70 mt-0.5 flex justify-end items-center gap-0.5">
                  10:45 AM <CheckCheck className="w-2.5 h-2.5 sm:w-2 sm:h-2 text-blue-500" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area (Mirrors ChatView Form) */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-background/80 backdrop-blur-md border-t border-border/10">
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            <div className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary/50">
              <Paperclip className="w-3 h-3" />
            </div>
            <div className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary/50">
              <Smile className="w-3 h-3" />
            </div>
          </div>

          <div className="flex-1 h-7 sm:h-6 bg-secondary/30 border border-border/20 rounded-md relative flex items-center px-2 overflow-hidden">
            {step === 0 || step === 1 ? (
              <span className="text-[9px] sm:text-[8px] text-muted-foreground">
                Type a message...
              </span>
            ) : null}
            {step >= 2 && step < 4 && (
              <motion.span
                initial={{ clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
                transition={{ duration: 1.8, ease: 'linear' }}
                className="text-[9px] sm:text-[8px] text-foreground font-medium whitespace-nowrap"
              >
                {textToType}
              </motion.span>
            )}
          </div>

          <motion.div
            animate={{ scale: step === 3 ? 0.9 : 1 }}
            className={`w-7 h-7 sm:w-6 sm:h-6 rounded flex items-center justify-center transition-colors ${step >= 2 && step < 4 ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-muted-foreground'}`}
          >
            <Send className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
          </motion.div>
        </div>
      </div>

      {/* Simulated Cursor */}
      {(() => {
        const cursorPos =
          step === 0
            ? { x: isMobile ? '90%' : '85%', y: isMobile ? '60%' : '85%' }
            : step === 1
              ? { x: '30%', y: '96%' }
              : step === 2
                ? { x: '30%', y: '96%' }
                : step === 3
                  ? { x: isMobile ? '94p%' : '92%', y: isMobile ? '92%' : '90%' }
                  : step === 4
                    ? { x: isMobile ? '90%' : '120%', y: isMobile ? '60%' : '120%' }
                    : { x: isMobile ? '90%' : '85%', y: isMobile ? '90%' : '85%' };
        return (
          <SimulatedCursor x={cursorPos.x} y={cursorPos.y} isClicking={step === 1 || step === 3} />
        );
      })()}
    </div>
  );
};
